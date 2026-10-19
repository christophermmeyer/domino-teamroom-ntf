import Database from "better-sqlite3";
import { drizzle, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema.js";

export type Db = BetterSQLite3Database<typeof schema>;
export * from "./schema.js";
export { seed, DEMO_PASSWORD } from "./seed.js";
export { hashPassword, verifyPassword } from "./password.js";

/**
 * Hand-written DDL kept in step with schema.ts. drizzle-kit migrations are the
 * next step once the schema settles; for the prototype `CREATE IF NOT EXISTS`
 * on boot is enough and keeps the container self-contained.
 */
const DDL = `
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  password_hash TEXT,
  job_title TEXT,
  phone TEXT,
  department TEXT,
  location TEXT,
  bio TEXT,
  avatar_color TEXT NOT NULL DEFAULT '#2563eb',
  locale TEXT NOT NULL DEFAULT 'en',
  timezone TEXT NOT NULL DEFAULT 'UTC',
  legacy_notes_name TEXT,
  legacy_unid TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS memberships (
  user_id TEXT PRIMARY KEY REFERENCES users(id),
  role TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS settings (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  purpose TEXT NOT NULL DEFAULT '',
  leader_id TEXT REFERENCES users(id),
  facilitator_id TEXT REFERENCES users(id),
  show_members INTEGER NOT NULL DEFAULT 1,
  show_subteams INTEGER NOT NULL DEFAULT 1,
  show_milestones INTEGER NOT NULL DEFAULT 1,
  label_discussion TEXT NOT NULL DEFAULT 'Discussion',
  label_action TEXT NOT NULL DEFAULT 'Action Item',
  label_meeting TEXT NOT NULL DEFAULT 'Meeting',
  label_reference TEXT NOT NULL DEFAULT 'Reference',
  filing_interval TEXT NOT NULL DEFAULT 'never',
  file_open_docs INTEGER NOT NULL DEFAULT 0,
  filing_enabled INTEGER NOT NULL DEFAULT 0,
  reminders_enabled INTEGER NOT NULL DEFAULT 0,
  newsletters_enabled INTEGER NOT NULL DEFAULT 0,
  public_base_url TEXT,
  default_role TEXT
);
CREATE TABLE IF NOT EXISTS subteams (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL DEFAULT '',
  inactive_at TEXT,
  legacy_unid TEXT
);
CREATE TABLE IF NOT EXISTS subteam_members (
  subteam_id TEXT NOT NULL REFERENCES subteams(id),
  user_id TEXT NOT NULL REFERENCES users(id),
  is_leader INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (subteam_id, user_id)
);
CREATE TABLE IF NOT EXISTS tags (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE
);
CREATE TABLE IF NOT EXISTS milestones (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  summary TEXT NOT NULL DEFAULT '',
  detail_html TEXT NOT NULL DEFAULT '',
  occurs_on TEXT NOT NULL,
  author_id TEXT NOT NULL REFERENCES users(id),
  inactive_at TEXT,
  expired_at TEXT,
  legacy_unid TEXT,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS documents (
  id TEXT PRIMARY KEY,
  legacy_unid TEXT UNIQUE,
  legacy_form TEXT,
  legacy_doc_type TEXT,
  kind TEXT NOT NULL,
  parent_id TEXT,
  thread_root_id TEXT NOT NULL,
  author_id TEXT NOT NULL REFERENCES users(id),
  subject TEXT NOT NULL,
  abstract TEXT NOT NULL DEFAULT '',
  body_html TEXT NOT NULL DEFAULT '',
  body_text TEXT NOT NULL DEFAULT '',
  status TEXT,
  priority INTEGER,
  due_on TEXT,
  starts_at TEXT,
  ends_at TEXT,
  timezone TEXT,
  location TEXT,
  subteam_id TEXT REFERENCES subteams(id),
  report_on TEXT,
  this_week TEXT,
  goals TEXT,
  issues TEXT,
  summary_html TEXT,
  visibility TEXT NOT NULL DEFAULT 'public',
  never_file INTEGER NOT NULL DEFAULT 0,
  file_after TEXT,
  inactive_at TEXT,
  expired_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_documents_kind ON documents(kind, inactive_at, created_at);
CREATE INDEX IF NOT EXISTS idx_documents_thread ON documents(thread_root_id, created_at);
CREATE INDEX IF NOT EXISTS idx_documents_author ON documents(author_id);
CREATE INDEX IF NOT EXISTS idx_documents_starts ON documents(starts_at);
CREATE INDEX IF NOT EXISTS idx_documents_due ON documents(due_on);
CREATE TABLE IF NOT EXISTS document_tags (
  document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  tag_id TEXT NOT NULL REFERENCES tags(id),
  PRIMARY KEY (document_id, tag_id)
);
CREATE TABLE IF NOT EXISTS document_assignees (
  document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id),
  PRIMARY KEY (document_id, user_id)
);
`;

export function openDb(file = ":memory:"): Db {
  const sqlite = new Database(file);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("busy_timeout = 5000");
  sqlite.pragma("foreign_keys = ON");
  sqlite.exec(DDL);
  return drizzle(sqlite, { schema });
}

export { schema };
