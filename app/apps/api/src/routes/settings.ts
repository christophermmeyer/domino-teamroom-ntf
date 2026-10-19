import type { FastifyInstance } from "fastify";
import { eq, isNull, sql } from "drizzle-orm";
import { settings, subteams, tags, documentTags, documents } from "@teamroom/db";
import { updateSettingsInput, type Settings } from "@teamroom/shared";
import { requireManager } from "../auth.js";
import { Ctx, toSubteamSummary } from "../serializers.js";

export function loadSettings(ctx: Ctx): Settings {
  const db = ctx.db;
  const s = db.select().from(settings).where(eq(settings.id, 1)).get()!;
  const counts = db
    .select({ id: tags.id, name: tags.name, count: sql<number>`count(${documentTags.documentId})` })
    .from(tags)
    .leftJoin(documentTags, eq(documentTags.tagId, tags.id))
    .leftJoin(documents, sql`${documents.id} = ${documentTags.documentId} AND ${documents.inactiveAt} IS NULL`)
    .groupBy(tags.id)
    .orderBy(tags.name)
    .all();
  return {
    name: s.name,
    purpose: s.purpose,
    leader: s.leaderId ? ctx.user(s.leaderId) : null,
    facilitator: s.facilitatorId ? ctx.user(s.facilitatorId) : null,
    labels: { discussion: s.labelDiscussion, action: s.labelAction, meeting: s.labelMeeting, reference: s.labelReference },
    showMembers: s.showMembers,
    showSubteams: s.showSubteams,
    showMilestones: s.showMilestones,
    tags: counts,
    subteams: db.select().from(subteams).where(isNull(subteams.inactiveAt)).orderBy(subteams.name).all().map(toSubteamSummary),
  };
}

export async function settingsRoutes(app: FastifyInstance) {
  app.get("/settings", async () => loadSettings(new Ctx(app.db)));

  app.patch("/settings", { preHandler: requireManager }, async (req, reply) => {
    const parsed = updateSettingsInput.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });
    const { labels, ...rest } = parsed.data;
    app.db
      .update(settings)
      .set({
        ...rest,
        ...(labels?.discussion ? { labelDiscussion: labels.discussion } : {}),
        ...(labels?.action ? { labelAction: labels.action } : {}),
        ...(labels?.meeting ? { labelMeeting: labels.meeting } : {}),
        ...(labels?.reference ? { labelReference: labels.reference } : {}),
      })
      .where(eq(settings.id, 1))
      .run();
    return loadSettings(new Ctx(app.db));
  });
}
