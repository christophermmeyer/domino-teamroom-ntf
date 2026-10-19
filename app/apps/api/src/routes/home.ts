import type { FastifyInstance } from "fastify";
import { and, desc, eq, gte, inArray, isNull, sql } from "drizzle-orm";
import { documents, memberships, milestones, subteams, users } from "@teamroom/db";
import { THREAD_KINDS, type ActivityItem, type CalendarItem, type HomeData } from "@teamroom/shared";
import { Ctx, toSubteamSummary } from "../serializers.js";

const VERBS: Record<string, string> = {
  discussion: "wrote discussion",
  action: "assigned action item",
  meeting: "scheduled meeting",
  reference: "published reference",
  announcement: "made announcement",
  status_team: "reported status",
  status_subteam: "reported status",
  status_individual: "reported status",
};

export async function homeRoutes(app: FastifyInstance) {
  app.get("/home", async (): Promise<HomeData> => {
    const db = app.db;
    const ctx = new Ctx(db);
    const nowIso = new Date().toISOString();
    const today = nowIso.slice(0, 10);

    const recent = db.select().from(documents).where(isNull(documents.inactiveAt)).orderBy(desc(documents.createdAt)).limit(12).all();
    const rootIds = [...new Set(recent.map((d) => d.threadRootId))];
    const roots = new Map(db.select().from(documents).where(inArray(documents.id, rootIds)).all().map((r) => [r.id, r]));
    const activity: ActivityItem[] = recent.map((d) => {
      const root = roots.get(d.threadRootId) ?? d;
      return {
        id: d.id,
        verb: d.parentId ? "added comment" : (VERBS[d.kind] ?? "posted"),
        documentId: d.id,
        threadRootId: d.threadRootId,
        subject: root.subject,
        kind: d.kind as ActivityItem["kind"],
        author: ctx.user(d.authorId),
        at: d.createdAt,
      };
    });

    const meetings = db
      .select()
      .from(documents)
      .where(and(eq(documents.kind, "meeting"), isNull(documents.parentId), isNull(documents.inactiveAt), gte(documents.endsAt, nowIso)))
      .orderBy(documents.startsAt)
      .limit(5)
      .all();
    const upcomingMilestones = db.select().from(milestones).where(and(isNull(milestones.inactiveAt), gte(milestones.occursOn, today))).orderBy(milestones.occursOn).limit(5).all();
    const upcoming: CalendarItem[] = [
      ...meetings.map((m): CalendarItem => ({ type: "meeting", id: m.id, title: m.subject, startsAt: m.startsAt!, endsAt: m.endsAt!, location: m.location, author: ctx.user(m.authorId) })),
      ...upcomingMilestones.map((m): CalendarItem => ({ type: "milestone", id: m.id, title: m.title, occursOn: m.occursOn, author: ctx.user(m.authorId) })),
    ]
      .sort((a, b) => (a.type === "meeting" ? a.startsAt : a.occursOn).localeCompare(b.type === "meeting" ? b.startsAt : b.occursOn))
      .slice(0, 6);

    const announcements = db.select().from(documents).where(and(eq(documents.kind, "announcement"), isNull(documents.inactiveAt))).orderBy(desc(documents.createdAt)).limit(3).all();
    const openActions = db
      .select()
      .from(documents)
      .where(and(eq(documents.kind, "action"), eq(documents.status, "open"), isNull(documents.parentId), isNull(documents.inactiveAt)))
      .orderBy(sql`${documents.dueOn} IS NULL, ${documents.dueOn}, ${documents.priority}`)
      .limit(6)
      .all();
    const statusReports = db
      .select()
      .from(documents)
      .where(and(inArray(documents.kind, ["status_team", "status_subteam"]), isNull(documents.inactiveAt)))
      .orderBy(desc(documents.reportOn), desc(documents.createdAt))
      .limit(5)
      .all();

    const count = (where: ReturnType<typeof and>) => db.select({ n: sql<number>`count(*)` }).from(documents).where(where).get()!.n;
    const stats = {
      documents: count(and(inArray(documents.kind, [...THREAD_KINDS]), isNull(documents.parentId), isNull(documents.inactiveAt))),
      comments: count(sql`${documents.parentId} IS NOT NULL`),
      members: db.select({ n: sql<number>`count(*)` }).from(memberships).get()!.n,
      openActions: count(and(eq(documents.kind, "action"), eq(documents.status, "open"), isNull(documents.parentId), isNull(documents.inactiveAt))),
    };

    return {
      stats,
      activity,
      upcoming,
      announcements: ctx.summaries(announcements),
      openActions: ctx.summaries(openActions),
      statusReports: ctx.summaries(statusReports),
      members: db.select().from(users).innerJoin(memberships, eq(memberships.userId, users.id)).orderBy(users.displayName).all().map((r) => ctx.user(r.users.id)),
      subteams: db.select().from(subteams).where(isNull(subteams.inactiveAt)).orderBy(subteams.name).all().map(toSubteamSummary),
    };
  });
}
