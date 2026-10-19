import type { FastifyInstance } from "fastify";
import { randomUUID } from "node:crypto";
import { and, desc, eq, isNull } from "drizzle-orm";
import { documents } from "@teamroom/db";
import { createAnnouncementInput } from "@teamroom/shared";
import { requireWriter } from "../auth.js";
import { abstractOf, cleanHtml, htmlToText } from "../html.js";
import { Ctx } from "../serializers.js";
import { canEdit } from "./documents.js";

export async function announcementRoutes(app: FastifyInstance) {
  app.get("/announcements", async () => {
    const ctx = new Ctx(app.db);
    const rows = app.db.select().from(documents).where(and(eq(documents.kind, "announcement"), isNull(documents.inactiveAt))).orderBy(desc(documents.createdAt)).all();
    return rows.map((r) => ctx.detail(r));
  });

  app.post("/announcements", { preHandler: requireWriter }, async (req, reply) => {
    const parsed = createAnnouncementInput.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });
    const id = randomUUID();
    const now = new Date().toISOString();
    const bodyHtml = cleanHtml(parsed.data.bodyHtml);
    app.db
      .insert(documents)
      .values({ id, kind: "announcement", threadRootId: id, authorId: req.userId, subject: parsed.data.subject, bodyHtml, bodyText: htmlToText(bodyHtml), abstract: abstractOf(bodyHtml), createdAt: now, updatedAt: now })
      .run();
    return reply.code(201).send(new Ctx(app.db).detail(app.db.select().from(documents).where(eq(documents.id, id)).get()!));
  });

  app.delete<{ Params: { id: string } }>("/announcements/:id", { preHandler: requireWriter }, async (req, reply) => {
    const doc = app.db.select().from(documents).where(and(eq(documents.id, req.params.id), eq(documents.kind, "announcement"))).get();
    if (!doc) return reply.code(404).send({ error: "Announcement not found" });
    if (!canEdit(req.role, req.userId, doc)) return reply.code(403).send({ error: "Not allowed" });
    app.db.delete(documents).where(eq(documents.id, doc.id)).run();
    return reply.code(204).send();
  });
}
