import type { FastifyInstance } from "fastify";
import { randomUUID } from "node:crypto";
import { asc, eq, isNull } from "drizzle-orm";
import { milestones } from "@teamroom/db";
import { createMilestoneInput } from "@teamroom/shared";
import { requireWriter } from "../auth.js";
import { cleanHtml } from "../html.js";
import { Ctx } from "../serializers.js";

export async function milestoneRoutes(app: FastifyInstance) {
  app.get("/milestones", async () => {
    const ctx = new Ctx(app.db);
    return app.db.select().from(milestones).where(isNull(milestones.inactiveAt)).orderBy(asc(milestones.occursOn)).all().map((m) => ctx.milestone(m));
  });

  app.post("/milestones", { preHandler: requireWriter }, async (req, reply) => {
    const parsed = createMilestoneInput.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });
    const id = randomUUID();
    app.db
      .insert(milestones)
      .values({ id, ...parsed.data, detailHtml: cleanHtml(parsed.data.detailHtml), authorId: req.userId, createdAt: new Date().toISOString() })
      .run();
    return reply.code(201).send(new Ctx(app.db).milestone(app.db.select().from(milestones).where(eq(milestones.id, id)).get()!));
  });
}
