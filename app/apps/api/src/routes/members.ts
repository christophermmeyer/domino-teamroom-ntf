import type { FastifyInstance } from "fastify";
import { and, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import { documents, memberships, subteamMembers, subteams, users } from "@teamroom/db";
import { THREAD_KINDS, type MemberDetail, type Role, type SubteamDetail } from "@teamroom/shared";
import { Ctx, toSubteamSummary, toUserSummary } from "../serializers.js";

export async function memberRoutes(app: FastifyInstance) {
  app.get("/members", async (): Promise<MemberDetail[]> => {
    const db = app.db;
    const ctx = new Ctx(db);
    const links = db.select().from(subteamMembers).all();
    const counts = new Map(db.select({ authorId: documents.authorId, n: sql<number>`count(*)` }).from(documents).groupBy(documents.authorId).all().map((r) => [r.authorId, r.n]));
    return db
      .select()
      .from(users)
      .innerJoin(memberships, eq(memberships.userId, users.id))
      .orderBy(users.displayName)
      .all()
      .map(({ users: u, memberships: m }) => ({
        ...toUserSummary(u, m.role as Role),
        phone: u.phone,
        bio: u.bio,
        subteams: links.filter((l) => l.userId === u.id).map((l) => ctx.teams.get(l.subteamId)!).filter(Boolean),
        documentCount: counts.get(u.id) ?? 0,
      }));
  });

  app.get<{ Params: { id: string } }>("/members/:id", async (req, reply) => {
    const db = app.db;
    const row = db.select().from(users).innerJoin(memberships, eq(memberships.userId, users.id)).where(eq(users.id, req.params.id)).get();
    if (!row) return reply.code(404).send({ error: "Member not found" });
    const ctx = new Ctx(db);
    const links = db.select().from(subteamMembers).where(eq(subteamMembers.userId, row.users.id)).all();
    const recent = db
      .select()
      .from(documents)
      .where(and(eq(documents.authorId, row.users.id), isNull(documents.parentId), isNull(documents.inactiveAt), inArray(documents.kind, [...THREAD_KINDS])))
      .orderBy(desc(documents.createdAt))
      .limit(10)
      .all();
    const detail: MemberDetail & { recentDocuments: ReturnType<Ctx["summaries"]> } = {
      ...toUserSummary(row.users, row.memberships.role as Role),
      phone: row.users.phone,
      bio: row.users.bio,
      subteams: links.map((l) => ctx.teams.get(l.subteamId)!).filter(Boolean),
      documentCount: recent.length,
      recentDocuments: ctx.summaries(recent),
    };
    return detail;
  });

  app.get("/subteams", async (): Promise<SubteamDetail[]> => {
    const db = app.db;
    const ctx = new Ctx(db);
    const links = db.select().from(subteamMembers).all();
    const counts = new Map(
      db.select({ subteamId: documents.subteamId, n: sql<number>`count(*)` }).from(documents).where(and(isNull(documents.parentId), isNull(documents.inactiveAt))).groupBy(documents.subteamId).all().map((r) => [r.subteamId, r.n]),
    );
    return db
      .select()
      .from(subteams)
      .orderBy(subteams.name)
      .all()
      .map((s) => {
        const mine = links.filter((l) => l.subteamId === s.id);
        const leader = mine.find((l) => l.isLeader);
        return { ...toSubteamSummary(s), leader: leader ? ctx.user(leader.userId) : null, members: mine.map((l) => ctx.user(l.userId)), documentCount: counts.get(s.id) ?? 0 };
      });
  });

  app.get<{ Params: { id: string } }>("/subteams/:id", async (req, reply) => {
    const db = app.db;
    const s = db.select().from(subteams).where(eq(subteams.id, req.params.id)).get();
    if (!s) return reply.code(404).send({ error: "Subteam not found" });
    const ctx = new Ctx(db);
    const mine = db.select().from(subteamMembers).where(eq(subteamMembers.subteamId, s.id)).all();
    const leader = mine.find((l) => l.isLeader);
    const docs = db.select().from(documents).where(and(eq(documents.subteamId, s.id), isNull(documents.parentId), isNull(documents.inactiveAt))).orderBy(desc(documents.updatedAt)).limit(20).all();
    return { ...toSubteamSummary(s), leader: leader ? ctx.user(leader.userId) : null, members: mine.map((l) => ctx.user(l.userId)), documentCount: docs.length, recentDocuments: ctx.summaries(docs) };
  });
}
