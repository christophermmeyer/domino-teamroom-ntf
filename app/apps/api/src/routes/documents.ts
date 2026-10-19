import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { randomUUID } from "node:crypto";
import { and, asc, desc, eq, inArray, isNotNull, isNull, like, or, sql, type SQL } from "drizzle-orm";
import { documentAssignees, documents, documentTags, tags, type Db, type DocumentRow } from "@teamroom/db";
import { createCommentInput, createTopicInput, listDocumentsQuery, THREAD_KINDS, updateTopicInput, type Role, type Thread } from "@teamroom/shared";
import { requireWriter } from "../auth.js";
import { abstractOf, cleanHtml, htmlToText } from "../html.js";
import { Ctx } from "../serializers.js";

const nowIso = () => new Date().toISOString();

export function canEdit(role: Role, userId: string, doc: DocumentRow) {
  return role === "owner" || role === "facilitator" || (role === "member" && doc.authorId === userId);
}

function replaceTags(db: Db, documentId: string, names: string[]) {
  db.delete(documentTags).where(eq(documentTags.documentId, documentId)).run();
  for (const raw of names) {
    const name = raw.trim();
    if (!name) continue;
    let tag = db.select().from(tags).where(eq(tags.name, name)).get();
    if (!tag) {
      tag = { id: randomUUID(), name };
      db.insert(tags).values(tag).run();
    }
    db.insert(documentTags).values({ documentId, tagId: tag.id }).onConflictDoNothing().run();
  }
}

function replaceAssignees(db: Db, documentId: string, ids: string[]) {
  db.delete(documentAssignees).where(eq(documentAssignees.documentId, documentId)).run();
  if (ids.length) db.insert(documentAssignees).values([...new Set(ids)].map((userId) => ({ documentId, userId }))).onConflictDoNothing().run();
}

function loadDoc(req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply): DocumentRow | undefined {
  const doc = req.server.db.select().from(documents).where(eq(documents.id, req.params.id)).get();
  if (!doc) reply.code(404).send({ error: "Document not found" });
  return doc;
}

export async function documentRoutes(app: FastifyInstance) {
  app.get("/documents", async (req, reply) => {
    const parsed = listDocumentsQuery.safeParse(req.query);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });
    const { view, kind, tag, subteam, author, q } = parsed.data;
    const db = app.db;
    const ctx = new Ctx(db);

    const where: SQL[] = [isNull(documents.parentId), inArray(documents.kind, [...THREAD_KINDS])];
    where.push(view === "inactive" ? isNotNull(documents.inactiveAt) : isNull(documents.inactiveAt));
    if (view === "mine") where.push(eq(documents.authorId, req.userId));
    if (view === "assigned") where.push(and(eq(documents.kind, "action"), eq(documents.status, "open"), sql`EXISTS (SELECT 1 FROM document_assignees a WHERE a.document_id = ${documents.id} AND a.user_id = ${req.userId})`)!);
    if (view === "due") where.push(and(eq(documents.kind, "action"), eq(documents.status, "open"))!);
    if (kind) where.push(eq(documents.kind, kind));
    if (subteam) where.push(eq(documents.subteamId, subteam));
    if (author) where.push(eq(documents.authorId, author));
    if (tag) where.push(sql`EXISTS (SELECT 1 FROM document_tags dt JOIN tags t ON t.id = dt.tag_id WHERE dt.document_id = ${documents.id} AND t.name = ${tag})`);
    if (q && q.trim()) {
      const pattern = `%${q.trim()}%`;
      where.push(or(like(documents.subject, pattern), like(documents.bodyText, pattern))!);
    }

    const order = view === "due" ? [sql`${documents.dueOn} IS NULL`, asc(documents.dueOn), asc(documents.priority)] : [desc(documents.updatedAt)];
    const rows = db.select().from(documents).where(and(...where)).orderBy(...order).all();
    return ctx.summaries(rows);
  });

  app.get<{ Params: { id: string } }>("/documents/:id", async (req, reply): Promise<Thread | void> => {
    const doc = loadDoc(req, reply);
    if (!doc) return;
    const db = app.db;
    const ctx = new Ctx(db);
    const thread = db.select().from(documents).where(eq(documents.threadRootId, doc.threadRootId)).orderBy(asc(documents.createdAt)).all();
    const root = thread.find((d) => d.id === doc.threadRootId) ?? doc;
    return { root: ctx.detail(root), comments: thread.filter((d) => d.parentId !== null).map((d) => ctx.comment(d)) };
  });

  app.post("/documents", { preHandler: requireWriter }, async (req, reply) => {
    const parsed = createTopicInput.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });
    const input = parsed.data;
    if (input.kind === "meeting" && (!input.startsAt || !input.endsAt)) return reply.code(400).send({ error: "Meetings need a start and end time" });
    if (input.startsAt && input.endsAt && input.endsAt < input.startsAt) return reply.code(400).send({ error: "End time must be after start time" });
    const db = app.db;
    const id = randomUUID();
    const now = nowIso();
    const bodyHtml = cleanHtml(input.bodyHtml);
    db.insert(documents)
      .values({
        id,
        kind: input.kind,
        parentId: null,
        threadRootId: id,
        authorId: req.userId,
        subject: input.subject,
        bodyHtml,
        bodyText: htmlToText(bodyHtml),
        abstract: abstractOf(bodyHtml),
        status: input.kind === "meeting" ? null : "open",
        priority: input.kind === "action" ? (input.priority ?? 3) : null,
        dueOn: input.kind === "action" ? (input.dueOn ?? null) : null,
        startsAt: input.kind === "meeting" ? input.startsAt : null,
        endsAt: input.kind === "meeting" ? input.endsAt : null,
        timezone: input.kind === "meeting" ? (input.timezone ?? null) : null,
        location: input.kind === "meeting" ? (input.location ?? null) : null,
        subteamId: input.subteamId || null,
        createdAt: now,
        updatedAt: now,
      })
      .run();
    replaceTags(db, id, input.tags);
    if (input.kind === "action") replaceAssignees(db, id, input.assigneeIds ?? []);
    return reply.code(201).send(new Ctx(db).detail(db.select().from(documents).where(eq(documents.id, id)).get()!));
  });

  app.post<{ Params: { id: string } }>("/documents/:id/comments", { preHandler: requireWriter }, async (req, reply) => {
    const root = loadDoc(req, reply);
    if (!root) return;
    const parsed = createCommentInput.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });
    if (!THREAD_KINDS.includes(root.kind as (typeof THREAD_KINDS)[number])) return reply.code(400).send({ error: "Only discussions, actions, meetings and references accept comments" });
    const db = app.db;
    const parentId = parsed.data.parentId ?? root.id;
    const parent = parentId === root.id ? root : db.select().from(documents).where(and(eq(documents.id, parentId), eq(documents.threadRootId, root.threadRootId))).get();
    if (!parent) return reply.code(404).send({ error: "Parent comment not found in this thread" });
    const id = randomUUID();
    const now = nowIso();
    const bodyHtml = cleanHtml(parsed.data.bodyHtml);
    db.insert(documents)
      .values({
        id,
        kind: root.kind,
        parentId: parent.id,
        threadRootId: root.threadRootId,
        authorId: req.userId,
        subject: `Re: ${root.subject.replace(/^Re: /, "")}`,
        bodyHtml,
        bodyText: htmlToText(bodyHtml),
        abstract: abstractOf(bodyHtml),
        subteamId: root.subteamId,
        createdAt: now,
        updatedAt: now,
      })
      .run();
    db.update(documents).set({ updatedAt: now }).where(eq(documents.id, root.threadRootId)).run();
    return reply.code(201).send(new Ctx(db).comment(db.select().from(documents).where(eq(documents.id, id)).get()!));
  });

  app.patch<{ Params: { id: string } }>("/documents/:id", { preHandler: requireWriter }, async (req, reply) => {
    const doc = loadDoc(req, reply);
    if (!doc) return;
    const db = app.db;
    const isAssignee = !!db.select().from(documentAssignees).where(and(eq(documentAssignees.documentId, doc.id), eq(documentAssignees.userId, req.userId))).get();
    const parsed = updateTopicInput.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });
    const input = parsed.data;
    const onlyStatus = Object.keys(input).every((k) => k === "status");
    if (!canEdit(req.role, req.userId, doc) && !(onlyStatus && isAssignee)) {
      return reply.code(403).send({ error: "You can only edit your own documents" });
    }
    const patch: Partial<DocumentRow> = { updatedAt: nowIso() };
    if (input.subject !== undefined) patch.subject = input.subject;
    if (input.bodyHtml !== undefined) {
      patch.bodyHtml = cleanHtml(input.bodyHtml);
      patch.bodyText = htmlToText(patch.bodyHtml);
      patch.abstract = abstractOf(patch.bodyHtml);
    }
    if (input.status !== undefined && doc.kind !== "meeting") patch.status = input.status;
    if (input.subteamId !== undefined) patch.subteamId = input.subteamId || null;
    if (doc.kind === "action") {
      if (input.priority !== undefined) patch.priority = input.priority;
      if (input.dueOn !== undefined) patch.dueOn = input.dueOn;
    }
    if (doc.kind === "meeting") {
      if (input.startsAt !== undefined) patch.startsAt = input.startsAt;
      if (input.endsAt !== undefined) patch.endsAt = input.endsAt;
      if (input.location !== undefined) patch.location = input.location;
      if (input.timezone !== undefined) patch.timezone = input.timezone;
    }
    db.update(documents).set(patch).where(eq(documents.id, doc.id)).run();
    if (input.tags) replaceTags(db, doc.id, input.tags);
    if (input.assigneeIds && doc.kind === "action") replaceAssignees(db, doc.id, input.assigneeIds);
    const ctx = new Ctx(db);
    const updated = db.select().from(documents).where(eq(documents.id, doc.id)).get()!;
    return updated.parentId ? ctx.comment(updated) : ctx.detail(updated);
  });

  app.post<{ Params: { id: string } }>("/documents/:id/inactive", { preHandler: requireWriter }, async (req, reply) => {
    const doc = loadDoc(req, reply);
    if (!doc) return;
    if (!canEdit(req.role, req.userId, doc)) return reply.code(403).send({ error: "Not allowed" });
    app.db.update(documents).set({ inactiveAt: nowIso() }).where(eq(documents.id, doc.id)).run();
    return { ok: true };
  });

  app.delete<{ Params: { id: string } }>("/documents/:id/inactive", { preHandler: requireWriter }, async (req, reply) => {
    const doc = loadDoc(req, reply);
    if (!doc) return;
    if (!canEdit(req.role, req.userId, doc)) return reply.code(403).send({ error: "Not allowed" });
    app.db.update(documents).set({ inactiveAt: null }).where(eq(documents.id, doc.id)).run();
    return { ok: true };
  });

  app.delete<{ Params: { id: string } }>("/documents/:id", { preHandler: requireWriter }, async (req, reply) => {
    const doc = loadDoc(req, reply);
    if (!doc) return;
    if (!canEdit(req.role, req.userId, doc)) return reply.code(403).send({ error: "Not allowed" });
    const db = app.db;
    if (doc.parentId === null) {
      db.delete(documents).where(eq(documents.threadRootId, doc.id)).run();
    } else {
      // Re-parent children so a deleted mid-thread comment does not orphan replies.
      db.update(documents).set({ parentId: doc.parentId }).where(eq(documents.parentId, doc.id)).run();
      db.delete(documents).where(eq(documents.id, doc.id)).run();
    }
    return reply.code(204).send();
  });
}
