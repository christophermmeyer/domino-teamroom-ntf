import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { randomBytes } from "node:crypto";
import { eq, lt } from "drizzle-orm";
import { memberships, sessions, users, verifyPassword } from "@teamroom/db";
import { loginInput, type Role } from "@teamroom/shared";
import { toUserSummary } from "./serializers.js";

export const SESSION_COOKIE = "teamroom_sid";
const IDLE_DAYS = 14;

declare module "fastify" {
  interface FastifyRequest {
    userId: string;
    role: Role;
  }
}

function sessionCookieOptions(req: FastifyRequest) {
  return {
    path: "/",
    httpOnly: true,
    sameSite: "lax" as const,
    secure: req.protocol === "https",
    maxAge: IDLE_DAYS * 24 * 3600,
  };
}

/** Cookie session lookup. Attaches userId + membership role, or 401. */
export async function requireAuth(req: FastifyRequest, reply: FastifyReply) {
  const sid = req.cookies[SESSION_COOKIE];
  if (!sid) return reply.code(401).send({ error: "Not signed in" });
  const db = req.server.db;
  const session = db.select().from(sessions).where(eq(sessions.id, sid)).get();
  if (!session || session.expiresAt < new Date().toISOString()) {
    if (session) db.delete(sessions).where(eq(sessions.id, sid)).run();
    reply.clearCookie(SESSION_COOKIE, { path: "/" });
    return reply.code(401).send({ error: "Session expired" });
  }
  const membership = db.select().from(memberships).where(eq(memberships.userId, session.userId)).get();
  if (!membership) return reply.code(403).send({ error: "No access to this TeamRoom" });
  req.userId = session.userId;
  req.role = membership.role as Role;
}

export async function requireWriter(req: FastifyRequest, reply: FastifyReply) {
  if (req.role === "reader") return reply.code(403).send({ error: "Readers cannot create or change content" });
}

export async function requireManager(req: FastifyRequest, reply: FastifyReply) {
  if (req.role !== "owner" && req.role !== "facilitator") return reply.code(403).send({ error: "Only owners and facilitators can do that" });
}

export async function authRoutes(app: FastifyInstance) {
  // Demo convenience: the login page lists seeded accounts. Not for production.
  app.get("/demo-users", async () => {
    const db = app.db;
    const roles = new Map(db.select().from(memberships).all().map((m) => [m.userId, m.role as Role]));
    return db
      .select()
      .from(users)
      .orderBy(users.displayName)
      .all()
      .map((u) => toUserSummary(u, roles.get(u.id) ?? null));
  });

  app.post("/login", { config: { rateLimit: { max: 20, timeWindow: "1 minute" } } }, async (req, reply) => {
    const parsed = loginInput.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: "Email and password are required" });
    const db = app.db;
    const user = db.select().from(users).where(eq(users.email, parsed.data.email.toLowerCase())).get();
    if (!user || !verifyPassword(parsed.data.password, user.passwordHash)) {
      return reply.code(401).send({ error: "Incorrect email or password" });
    }
    const membership = db.select().from(memberships).where(eq(memberships.userId, user.id)).get();
    if (!membership) return reply.code(403).send({ error: "No access to this TeamRoom" });

    const now = new Date();
    db.delete(sessions).where(lt(sessions.expiresAt, now.toISOString())).run();
    const sid = randomBytes(32).toString("base64url");
    const expires = new Date(now.getTime() + IDLE_DAYS * 86400_000);
    db.insert(sessions).values({ id: sid, userId: user.id, expiresAt: expires.toISOString(), createdAt: now.toISOString() }).run();
    reply.setCookie(SESSION_COOKIE, sid, sessionCookieOptions(req));
    return toUserSummary(user, membership.role as Role);
  });

  app.get("/me", { preHandler: requireAuth }, async (req) => {
    const user = app.db.select().from(users).where(eq(users.id, req.userId)).get()!;
    return toUserSummary(user, req.role);
  });

  app.post("/logout", async (req, reply) => {
    const sid = req.cookies[SESSION_COOKIE];
    if (sid) app.db.delete(sessions).where(eq(sessions.id, sid)).run();
    reply.clearCookie(SESSION_COOKIE, { path: "/" });
    return { ok: true };
  });
}
