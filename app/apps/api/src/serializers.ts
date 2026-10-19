import { eq, inArray, sql } from "drizzle-orm";
import { documentAssignees, documents, documentTags, memberships, subteams, tags, users, type Db, type DocumentRow, type MilestoneRow, type SubteamRow, type UserRow } from "@teamroom/db";
import type { Comment, DocumentDetail, DocumentSummary, Milestone, Role, SubteamSummary, UserSummary } from "@teamroom/shared";

export function toUserSummary(u: UserRow, role: Role | null): UserSummary {
  return { id: u.id, email: u.email, displayName: u.displayName, jobTitle: u.jobTitle, department: u.department, location: u.location, avatarColor: u.avatarColor, role };
}

export function toSubteamSummary(s: SubteamRow): SubteamSummary {
  return { id: s.id, name: s.name, description: s.description, inactiveAt: s.inactiveAt };
}

/** Lookup maps loaded once per request; the room is team-sized so this is cheap. */
export class Ctx {
  readonly people: Map<string, UserSummary>;
  readonly teams: Map<string, SubteamSummary>;
  constructor(readonly db: Db) {
    const roles = new Map(db.select().from(memberships).all().map((m) => [m.userId, m.role as Role]));
    this.people = new Map(db.select().from(users).all().map((u) => [u.id, toUserSummary(u, roles.get(u.id) ?? null)]));
    this.teams = new Map(db.select().from(subteams).all().map((s) => [s.id, toSubteamSummary(s)]));
  }

  user(id: string): UserSummary {
    return this.people.get(id) ?? { id, email: "", displayName: "Unknown user", jobTitle: null, department: null, location: null, avatarColor: "#6b7280", role: null };
  }

  summaries(rows: DocumentRow[]): DocumentSummary[] {
    if (rows.length === 0) return [];
    const ids = rows.map((r) => r.id);
    const tagRows = this.db.select({ documentId: documentTags.documentId, name: tags.name }).from(documentTags).innerJoin(tags, eq(tags.id, documentTags.tagId)).where(inArray(documentTags.documentId, ids)).all();
    const assigneeRows = this.db.select().from(documentAssignees).where(inArray(documentAssignees.documentId, ids)).all();
    const stats = this.db
      .select({ threadRootId: documents.threadRootId, n: sql<number>`count(*)`, last: sql<string>`max(created_at)` })
      .from(documents)
      .where(sql`${documents.parentId} IS NOT NULL AND ${inArray(documents.threadRootId, ids)}`)
      .groupBy(documents.threadRootId)
      .all();
    const statMap = new Map(stats.map((s) => [s.threadRootId, s]));
    return rows.map((d) => ({
      id: d.id,
      kind: d.kind as DocumentSummary["kind"],
      parentId: d.parentId,
      threadRootId: d.threadRootId,
      subject: d.subject,
      abstract: d.abstract,
      author: this.user(d.authorId),
      status: d.status as DocumentSummary["status"],
      priority: d.priority,
      dueOn: d.dueOn,
      startsAt: d.startsAt,
      endsAt: d.endsAt,
      location: d.location,
      reportOn: d.reportOn,
      subteam: d.subteamId ? (this.teams.get(d.subteamId) ?? null) : null,
      tags: tagRows.filter((t) => t.documentId === d.id).map((t) => t.name).sort(),
      assignees: assigneeRows.filter((a) => a.documentId === d.id).map((a) => this.user(a.userId)),
      inactiveAt: d.inactiveAt,
      createdAt: d.createdAt,
      updatedAt: d.updatedAt,
      commentCount: statMap.get(d.id)?.n ?? 0,
      lastActivityAt: statMap.get(d.id)?.last ?? d.createdAt,
    }));
  }

  detail(row: DocumentRow): DocumentDetail {
    const [s] = this.summaries([row]);
    return { ...s, bodyHtml: row.bodyHtml, summaryHtml: row.summaryHtml, thisWeek: row.thisWeek, goals: row.goals, issues: row.issues, timezone: row.timezone };
  }

  comment(row: DocumentRow): Comment {
    return { id: row.id, parentId: row.parentId!, threadRootId: row.threadRootId, author: this.user(row.authorId), bodyHtml: row.bodyHtml, createdAt: row.createdAt, updatedAt: row.updatedAt };
  }

  milestone(m: MilestoneRow): Milestone {
    return { id: m.id, title: m.title, summary: m.summary, detailHtml: m.detailHtml, occursOn: m.occursOn, author: this.user(m.authorId), inactiveAt: m.inactiveAt, createdAt: m.createdAt };
  }
}
