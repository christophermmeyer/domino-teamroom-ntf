import Fastify, { type FastifyInstance } from "fastify";
import cookie from "@fastify/cookie";
import rateLimit from "@fastify/rate-limit";
import fastifyStatic from "@fastify/static";
import { existsSync } from "node:fs";
import { sql } from "drizzle-orm";
import { openDb, seed, type Db } from "@teamroom/db";
import { authRoutes, requireAuth } from "./auth.js";
import { settingsRoutes } from "./routes/settings.js";
import { homeRoutes } from "./routes/home.js";
import { documentRoutes } from "./routes/documents.js";
import { announcementRoutes } from "./routes/announcements.js";
import { statusRoutes } from "./routes/status.js";
import { milestoneRoutes } from "./routes/milestones.js";
import { calendarRoutes } from "./routes/calendar.js";
import { memberRoutes } from "./routes/members.js";
import { searchRoutes } from "./routes/search.js";

declare module "fastify" {
  interface FastifyInstance {
    db: Db;
  }
}

export interface AppOptions {
  dbFile?: string;
  staticDir?: string;
  logger?: boolean;
}

export async function buildApp(opts: AppOptions = {}): Promise<FastifyInstance> {
  const app = Fastify({ logger: opts.logger ?? false, trustProxy: process.env.TRUST_PROXY === "1" });
  const db = openDb(opts.dbFile ?? ":memory:");
  seed(db);
  app.decorate("db", db);
  app.decorateRequest("userId", "");
  app.decorateRequest("role", "reader");

  await app.register(cookie);
  await app.register(rateLimit, { global: false });

  app.get("/api/health", async () => {
    db.run(sql`SELECT 1`);
    return { ok: true };
  });

  await app.register(authRoutes, { prefix: "/api/auth" });

  await app.register(
    async (api) => {
      api.addHook("preHandler", requireAuth);
      await api.register(settingsRoutes);
      await api.register(homeRoutes);
      await api.register(documentRoutes);
      await api.register(announcementRoutes);
      await api.register(statusRoutes);
      await api.register(milestoneRoutes);
      await api.register(calendarRoutes);
      await api.register(memberRoutes);
      await api.register(searchRoutes);
    },
    { prefix: "/api" },
  );

  if (opts.staticDir && existsSync(opts.staticDir)) {
    await app.register(fastifyStatic, { root: opts.staticDir, wildcard: false });
    app.setNotFoundHandler((req, reply) => {
      if (req.url.startsWith("/api/") || req.method !== "GET") return reply.code(404).send({ error: "Not found" });
      return reply.sendFile("index.html");
    });
  }

  return app;
}
