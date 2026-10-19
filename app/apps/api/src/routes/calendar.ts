import type { FastifyInstance } from "fastify";
import { and, eq, gte, isNull, lte } from "drizzle-orm";
import { documents, milestones } from "@teamroom/db";
import type { CalendarItem } from "@teamroom/shared";
import { Ctx } from "../serializers.js";

/** Calendar = meeting documents by starts_at, plus milestones on their date. */
export async function calendarRoutes(app: FastifyInstance) {
  app.get<{ Querystring: { from?: string; to?: string } }>("/calendar", async (req, reply) => {
    const { from, to } = req.query;
    if (!from || !to) return reply.code(400).send({ error: "from and to are required (ISO dates)" });
    const ctx = new Ctx(app.db);
    const meetings = app.db
      .select()
      .from(documents)
      .where(and(eq(documents.kind, "meeting"), isNull(documents.parentId), isNull(documents.inactiveAt), gte(documents.endsAt, from), lte(documents.startsAt, to)))
      .orderBy(documents.startsAt)
      .all();
    const ms = app.db
      .select()
      .from(milestones)
      .where(and(isNull(milestones.inactiveAt), gte(milestones.occursOn, from.slice(0, 10)), lte(milestones.occursOn, to.slice(0, 10))))
      .orderBy(milestones.occursOn)
      .all();
    const items: CalendarItem[] = [
      ...meetings.map((m): CalendarItem => ({ type: "meeting", id: m.id, title: m.subject, startsAt: m.startsAt!, endsAt: m.endsAt!, location: m.location, author: ctx.user(m.authorId) })),
      ...ms.map((m): CalendarItem => ({ type: "milestone", id: m.id, title: m.title, occursOn: m.occursOn, author: ctx.user(m.authorId) })),
    ];
    return items;
  });
}
