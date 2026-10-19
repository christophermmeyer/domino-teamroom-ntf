import { sqliteTable, text, integer, primaryKey } from "drizzle-orm/sqlite-core";

/**
 * Drizzle schema. SQLite is the default dialect; column names and types are
 * chosen so the same schema can later target Postgres (text ISO timestamps,
 * integer booleans, no SQLite-only types).
 */

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  displayName: text("display_name").notNull(),
  passwordHash: text("password_hash"),
  jobTitle: text("job_title"),
  phone: text("phone"),
  department: text("department"),
  location: text("location"),
  bio: text("bio"),
  avatarColor: text("avatar_color").notNull().default("#2563eb"),
  locale: text("locale").notNull().default("en"),
  timezone: text("timezone").notNull().default("UTC"),
  legacyNotesName: text("legacy_notes_name"),
  legacyUnid: text("legacy_unid"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const sessions = sqliteTable("sessions", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  expiresAt: text("expires_at").notNull(),
  createdAt: text("created_at").notNull(),
});

/** The ACL: one row per user. owner | facilitator | member | reader */
export const memberships = sqliteTable("memberships", {
  userId: text("user_id").primaryKey().references(() => users.id),
  role: text("role").notNull(),
});

/** Single row: the TeamRoom Setup / Mission profile. */
export const settings = sqliteTable("settings", {
  id: integer("id").primaryKey(),
  name: text("name").notNull(),
  purpose: text("purpose").notNull().default(""),
  leaderId: text("leader_id").references(() => users.id),
  facilitatorId: text("facilitator_id").references(() => users.id),
  showMembers: integer("show_members", { mode: "boolean" }).notNull().default(true),
  showSubteams: integer("show_subteams", { mode: "boolean" }).notNull().default(true),
  showMilestones: integer("show_milestones", { mode: "boolean" }).notNull().default(true),
  labelDiscussion: text("label_discussion").notNull().default("Discussion"),
  labelAction: text("label_action").notNull().default("Action Item"),
  labelMeeting: text("label_meeting").notNull().default("Meeting"),
  labelReference: text("label_reference").notNull().default("Reference"),
  filingInterval: text("filing_interval").notNull().default("never"),
  fileOpenDocs: integer("file_open_docs", { mode: "boolean" }).notNull().default(false),
  filingEnabled: integer("filing_enabled", { mode: "boolean" }).notNull().default(false),
  remindersEnabled: integer("reminders_enabled", { mode: "boolean" }).notNull().default(false),
  newslettersEnabled: integer("newsletters_enabled", { mode: "boolean" }).notNull().default(false),
  publicBaseUrl: text("public_base_url"),
  defaultRole: text("default_role"),
});

export const subteams = sqliteTable("subteams", {
  id: text("id").primaryKey(),
  name: text("name").notNull().unique(),
  description: text("description").notNull().default(""),
  inactiveAt: text("inactive_at"),
  legacyUnid: text("legacy_unid"),
});

export const subteamMembers = sqliteTable(
  "subteam_members",
  {
    subteamId: text("subteam_id").notNull().references(() => subteams.id),
    userId: text("user_id").notNull().references(() => users.id),
    isLeader: integer("is_leader", { mode: "boolean" }).notNull().default(false),
  },
  (t) => [primaryKey({ columns: [t.subteamId, t.userId] })],
);

export const tags = sqliteTable("tags", {
  id: text("id").primaryKey(),
  name: text("name").notNull().unique(),
});

/** The Event form: a dated milestone, not a calendar meeting. */
export const milestones = sqliteTable("milestones", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  summary: text("summary").notNull().default(""),
  detailHtml: text("detail_html").notNull().default(""),
  occursOn: text("occurs_on").notNull(),
  authorId: text("author_id").notNull().references(() => users.id),
  inactiveAt: text("inactive_at"),
  expiredAt: text("expired_at"),
  legacyUnid: text("legacy_unid"),
  createdAt: text("created_at").notNull(),
});

/**
 * Main topics, responses (parent_id set), announcements and the three status
 * report forms all live here so activity, search and permissions share a path.
 */
export const documents = sqliteTable("documents", {
  id: text("id").primaryKey(),
  legacyUnid: text("legacy_unid"),
  legacyForm: text("legacy_form"),
  legacyDocType: text("legacy_doc_type"),
  kind: text("kind").notNull(),
  parentId: text("parent_id"),
  threadRootId: text("thread_root_id").notNull(),
  authorId: text("author_id").notNull().references(() => users.id),
  subject: text("subject").notNull(),
  abstract: text("abstract").notNull().default(""),
  bodyHtml: text("body_html").notNull().default(""),
  bodyText: text("body_text").notNull().default(""),
  status: text("status"),
  priority: integer("priority"),
  dueOn: text("due_on"),
  startsAt: text("starts_at"),
  endsAt: text("ends_at"),
  timezone: text("timezone"),
  location: text("location"),
  subteamId: text("subteam_id").references(() => subteams.id),
  reportOn: text("report_on"),
  thisWeek: text("this_week"),
  goals: text("goals"),
  issues: text("issues"),
  summaryHtml: text("summary_html"),
  visibility: text("visibility").notNull().default("public"),
  neverFile: integer("never_file", { mode: "boolean" }).notNull().default(false),
  fileAfter: text("file_after"),
  inactiveAt: text("inactive_at"),
  expiredAt: text("expired_at"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const documentTags = sqliteTable(
  "document_tags",
  {
    documentId: text("document_id").notNull().references(() => documents.id, { onDelete: "cascade" }),
    tagId: text("tag_id").notNull().references(() => tags.id),
  },
  (t) => [primaryKey({ columns: [t.documentId, t.tagId] })],
);

export const documentAssignees = sqliteTable(
  "document_assignees",
  {
    documentId: text("document_id").notNull().references(() => documents.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull().references(() => users.id),
  },
  (t) => [primaryKey({ columns: [t.documentId, t.userId] })],
);

export type UserRow = typeof users.$inferSelect;
export type DocumentRow = typeof documents.$inferSelect;
export type SubteamRow = typeof subteams.$inferSelect;
export type MilestoneRow = typeof milestones.$inferSelect;
export type SettingsRow = typeof settings.$inferSelect;
