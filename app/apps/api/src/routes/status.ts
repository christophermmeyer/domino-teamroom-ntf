import type { FastifyInstance } from "fastify";
import { randomUUID } from "node:crypto";
import { and, desc, eq, inArray, isNull, type SQL } from "drizzle-orm";
import { documents } from "@teamroom/db";
import { createStatusReportInput, STATUS_KINDS } from "@teamroom/shared";
import { requireWriter } from "../auth.js";
import { abstractOf, cleanHtml, htmlToText } from "../html.js";
import { Ctx } from "../serializers.js";

const TYPE_TO_KIND: Record<string, string> = { team: "status_team", subteam: "status_subteam", individual: "status_individual" };

export async function statusRoutes(app: FastifyInstance) {
  app.get<{ Querystring: { type?: string; subteam?: string } }>("/status-reports", async (req, reply) => {
    const where: SQL[] = [isNull(documents.inactiveAt)];
    if (req.query.type) {
      const kind = TYPE_TO_KIND[req.query.type];
      if (!kind) return reply.code(400).send({ error: "type must be team, subteam or individual" });
      where.push(eq(documents.kind, kind));
    } else {
      where.push(inArray(documents.kind, [...STATUS_KINDS]));
    }
    if (req.query.subteam) where.push(eq(documents.subteamId, req.query.subteam));
    const ctx = new Ctx(app.db);
    const rows = app.db.select().from(documents).where(and(...where)).orderBy(desc(documents.reportOn), desc(documents.createdAt)).all();
    return rows.map((r) => ctx.detail(r));
  });

  app.post("/status-reports", { preHandler: requireWriter }, async (req, reply) => {
    const parsed = createStatusReportInput.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });
    const d = parsed.data;
    if (d.kind === "status_subteam" && !d.subteamId) return reply.code(400).send({ error: "Subteam status reports need a subteam" });
    const id = randomUUID();
    const now = new Date().toISOString();
    const bodyHtml = cleanHtml(d.bodyHtml);
    const summaryHtml = cleanHtml(d.summaryHtml);
    const textOf = [summaryHtml, bodyHtml, d.thisWeek, d.goals, d.issues].filter(Boolean).map((h) => htmlToText(h!)).join(" ");
    app.db
      .insert(documents)
      .values({
        id,
        kind: d.kind,
        threadRootId: id,
        authorId: req.userId,
        subject: d.subject,
        reportOn: d.reportOn,
        summaryHtml,
        bodyHtml,
        bodyText: textOf,
        abstract: abstractOf(summaryHtml || bodyHtml || d.thisWeek || ""),
        thisWeek: d.thisWeek ? cleanHtml(d.thisWeek) : null,
        goals: d.goals ? cleanHtml(d.goals) : null,
        issues: d.issues ? cleanHtml(d.issues) : null,
        subteamId: d.subteamId || null,
        createdAt: now,
        updatedAt: now,
      })
      .run();
    return reply.code(201).send(new Ctx(app.db).detail(app.db.select().from(documents).where(eq(documents.id, id)).get()!));
  });
}
