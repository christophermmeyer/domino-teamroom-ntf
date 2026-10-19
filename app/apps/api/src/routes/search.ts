import type { FastifyInstance } from "fastify";
import { and, desc, eq, isNotNull, isNull, like, or } from "drizzle-orm";
import { documents, memberships, milestones, users } from "@teamroom/db";
import type { SearchResults } from "@teamroom/shared";
import { Ctx } from "../serializers.js";

/** LIKE-based search for the prototype; FTS5 is the planned upgrade. */
export async function searchRoutes(app: FastifyInstance) {
  app.get<{ Querystring: { q?: string } }>("/search", async (req): Promise<SearchResults> => {
    const q = (req.query.q ?? "").trim();
    if (q.length < 2) return { query: q, documents: [], milestones: [], members: [] };
    const p = `%${q}%`;
    const db = app.db;
    const ctx = new Ctx(db);
    const hits = db
      .select()
      .from(documents)
      .where(and(isNull(documents.parentId), or(like(documents.subject, p), like(documents.bodyText, p))))
      .orderBy(desc(documents.updatedAt))
      .limit(40)
      .all();
    // Comments match too; surface them as their thread root.
    const commentHits = db
      .select()
      .from(documents)
      .where(and(isNotNull(documents.parentId), like(documents.bodyText, p)))
      .limit(40)
      .all();
    const seen = new Set(hits.map((h) => h.id));
    for (const c of commentHits) {
      if (seen.has(c.threadRootId)) continue;
      const root = db.select().from(documents).where(eq(documents.id, c.threadRootId)).get();
      if (root) {
        hits.push(root);
        seen.add(root.id);
      }
    }
    return {
      query: q,
      documents: ctx.summaries(hits),
      milestones: db.select().from(milestones).where(or(like(milestones.title, p), like(milestones.summary, p))).limit(10).all().map((m) => ctx.milestone(m)),
      members: db
        .select()
        .from(users)
        .innerJoin(memberships, eq(memberships.userId, users.id))
        .where(or(like(users.displayName, p), like(users.jobTitle, p), like(users.location, p), like(users.department, p)))
        .limit(10)
        .all()
        .map((r) => ctx.user(r.users.id)),
    };
  });
}
