import { z } from "zod";

/** Behaviour keys for the four customizable TeamRoom document types (DefaultDocType1–4). */
export const THREAD_KINDS = ["discussion", "action", "meeting", "reference"] as const;
export type ThreadKind = (typeof THREAD_KINDS)[number];

export const STATUS_KINDS = ["status_team", "status_subteam", "status_individual"] as const;
export type StatusKind = (typeof STATUS_KINDS)[number];

export const DOCUMENT_KINDS = [...THREAD_KINDS, "announcement", ...STATUS_KINDS] as const;
export type DocumentKind = (typeof DOCUMENT_KINDS)[number];

export const ROLES = ["owner", "facilitator", "member", "reader"] as const;
export type Role = (typeof ROLES)[number];

export const DOC_STATUSES = ["open", "complete"] as const;
export type DocStatus = (typeof DOC_STATUSES)[number];

export const DOCUMENT_VIEWS = ["all", "mine", "assigned", "due", "inactive"] as const;
export type DocumentView = (typeof DOCUMENT_VIEWS)[number];

export const canWrite = (role: Role | null | undefined) => role === "owner" || role === "facilitator" || role === "member";
export const canManage = (role: Role | null | undefined) => role === "owner" || role === "facilitator";

// ---------- API DTOs ----------

export interface UserSummary {
  id: string;
  email: string;
  displayName: string;
  jobTitle: string | null;
  department: string | null;
  location: string | null;
  avatarColor: string;
  role: Role | null;
}

export interface MemberDetail extends UserSummary {
  phone: string | null;
  bio: string | null;
  subteams: SubteamSummary[];
  documentCount: number;
}

export interface SubteamSummary {
  id: string;
  name: string;
  description: string;
  inactiveAt: string | null;
}

export interface SubteamDetail extends SubteamSummary {
  leader: UserSummary | null;
  members: UserSummary[];
  documentCount: number;
}

export interface Tag {
  id: string;
  name: string;
  count: number;
}

export interface Settings {
  name: string;
  purpose: string;
  leader: UserSummary | null;
  facilitator: UserSummary | null;
  labels: Record<ThreadKind, string>;
  showMembers: boolean;
  showSubteams: boolean;
  showMilestones: boolean;
  tags: Tag[];
  subteams: SubteamSummary[];
}

export interface DocumentSummary {
  id: string;
  kind: DocumentKind;
  parentId: string | null;
  threadRootId: string;
  subject: string;
  abstract: string;
  author: UserSummary;
  status: DocStatus | null;
  priority: number | null;
  dueOn: string | null;
  startsAt: string | null;
  endsAt: string | null;
  location: string | null;
  reportOn: string | null;
  subteam: SubteamSummary | null;
  tags: string[];
  assignees: UserSummary[];
  inactiveAt: string | null;
  createdAt: string;
  updatedAt: string;
  commentCount: number;
  lastActivityAt: string;
}

export interface DocumentDetail extends DocumentSummary {
  bodyHtml: string;
  summaryHtml: string | null;
  thisWeek: string | null;
  goals: string | null;
  issues: string | null;
  timezone: string | null;
}

export interface Comment {
  id: string;
  parentId: string;
  threadRootId: string;
  author: UserSummary;
  bodyHtml: string;
  createdAt: string;
  updatedAt: string;
}

export interface Thread {
  root: DocumentDetail;
  comments: Comment[];
}

export interface Milestone {
  id: string;
  title: string;
  summary: string;
  detailHtml: string;
  occursOn: string;
  author: UserSummary;
  inactiveAt: string | null;
  createdAt: string;
}

export interface ActivityItem {
  id: string;
  verb: string;
  documentId: string;
  threadRootId: string;
  subject: string;
  kind: DocumentKind;
  author: UserSummary;
  at: string;
}

export interface HomeData {
  stats: { documents: number; comments: number; members: number; openActions: number };
  activity: ActivityItem[];
  upcoming: CalendarItem[];
  announcements: DocumentSummary[];
  openActions: DocumentSummary[];
  statusReports: DocumentSummary[];
  members: UserSummary[];
  subteams: SubteamSummary[];
}

export type CalendarItem =
  | { type: "meeting"; id: string; title: string; startsAt: string; endsAt: string; location: string | null; author: UserSummary }
  | { type: "milestone"; id: string; title: string; occursOn: string; author: UserSummary };

export interface SearchResults {
  query: string;
  documents: DocumentSummary[];
  milestones: Milestone[];
  members: UserSummary[];
}

// ---------- Input schemas (shared by api validation and web forms) ----------

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD");
const isoDateTime = z.string().datetime({ offset: true });

export const loginInput = z.object({
  email: z.string().trim().min(1),
  password: z.string().min(1),
});

export const createTopicInput = z.object({
  kind: z.enum(THREAD_KINDS),
  subject: z.string().trim().min(1).max(200),
  bodyHtml: z.string().min(1).max(50000),
  tags: z.array(z.string().trim().min(1)).max(10).default([]),
  subteamId: z.string().nullable().optional(),
  priority: z.number().int().min(1).max(5).nullable().optional(),
  dueOn: isoDate.nullable().optional(),
  assigneeIds: z.array(z.string()).max(20).optional(),
  startsAt: isoDateTime.nullable().optional(),
  endsAt: isoDateTime.nullable().optional(),
  timezone: z.string().nullable().optional(),
  location: z.string().trim().max(200).nullable().optional(),
});
export type CreateTopicInput = z.infer<typeof createTopicInput>;

export const updateTopicInput = createTopicInput.partial().extend({
  status: z.enum(DOC_STATUSES).optional(),
});
export type UpdateTopicInput = z.infer<typeof updateTopicInput>;

export const createCommentInput = z.object({
  parentId: z.string().optional(),
  bodyHtml: z.string().min(1).max(50000),
});

export const createAnnouncementInput = z.object({
  subject: z.string().trim().min(1).max(200),
  bodyHtml: z.string().min(1).max(50000),
});

export const createStatusReportInput = z.object({
  kind: z.enum(STATUS_KINDS),
  subject: z.string().trim().min(1).max(200),
  reportOn: isoDate,
  summaryHtml: z.string().max(20000).default(""),
  bodyHtml: z.string().max(50000).default(""),
  thisWeek: z.string().max(20000).nullable().optional(),
  goals: z.string().max(20000).nullable().optional(),
  issues: z.string().max(20000).nullable().optional(),
  subteamId: z.string().nullable().optional(),
});

export const createMilestoneInput = z.object({
  title: z.string().trim().min(1).max(200),
  summary: z.string().trim().max(500).default(""),
  detailHtml: z.string().max(20000).default(""),
  occursOn: isoDate,
});

export const updateSettingsInput = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  purpose: z.string().trim().max(2000).optional(),
  labels: z
    .object({ discussion: z.string().trim().min(1), action: z.string().trim().min(1), meeting: z.string().trim().min(1), reference: z.string().trim().min(1) })
    .partial()
    .optional(),
  showMembers: z.boolean().optional(),
  showSubteams: z.boolean().optional(),
  showMilestones: z.boolean().optional(),
});

export const listDocumentsQuery = z.object({
  view: z.enum(DOCUMENT_VIEWS).default("all"),
  kind: z.enum(THREAD_KINDS).optional(),
  tag: z.string().optional(),
  subteam: z.string().optional(),
  author: z.string().optional(),
  q: z.string().optional(),
});
export type ListDocumentsQuery = z.infer<typeof listDocumentsQuery>;
