import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { Client, testApp } from "./helpers.js";

describe("home, settings, announcements, status, members, search", () => {
  let app: FastifyInstance;
  let maya: Client;
  beforeAll(async () => {
    const t = await testApp();
    app = t.app;
    maya = await t.as("maya.chen@atlas.example");
  });
  afterAll(() => app.close());

  it("health check", async () => {
    expect((await app.inject({ method: "GET", url: "/api/health" })).json()).toEqual({ ok: true });
  });

  it("settings expose labels, tag counts and subteams", async () => {
    const s = (await maya.get("/api/settings")).json();
    expect(s.name).toBe("Project Atlas");
    expect(s.labels).toEqual({ discussion: "Discussion", action: "Action Item", meeting: "Meeting", reference: "Reference" });
    expect(s.leader.displayName).toBe("Maya Chen");
    expect(s.tags.find((t: { name: string }) => t.name === "Security").count).toBeGreaterThan(0);
    expect(s.subteams).toHaveLength(4);
  });

  it("home aggregates activity, upcoming items, announcements, actions and status", async () => {
    const h = (await maya.get("/api/home")).json();
    expect(h.stats.members).toBe(9);
    expect(h.stats.openActions).toBeGreaterThan(0);
    expect(h.activity.length).toBeGreaterThan(5);
    expect(h.activity.some((a: { verb: string }) => a.verb === "added comment")).toBe(true);
    expect(h.upcoming.length).toBeGreaterThan(0);
    expect(h.upcoming.some((u: { type: string }) => u.type === "milestone")).toBe(true);
    expect(h.announcements).toHaveLength(3);
    expect(h.openActions.every((a: { kind: string; status: string }) => a.kind === "action" && a.status === "open")).toBe(true);
    expect(h.statusReports.length).toBeGreaterThan(0);
  });

  it("announcements are created and deleted", async () => {
    const res = await maya.post("/api/announcements", { subject: "Hi", bodyHtml: "<p>There</p>" });
    expect(res.statusCode).toBe(201);
    const list = (await maya.get("/api/announcements")).json();
    expect(list[0].subject).toBe("Hi");
    expect((await maya.del(`/api/announcements/${res.json().id}`)).statusCode).toBe(204);
  });

  it("status reports filter by type and validate subteam reports", async () => {
    const team = (await maya.get("/api/status-reports?type=team")).json();
    expect(team.every((s: { kind: string }) => s.kind === "status_team")).toBe(true);
    const bad = await maya.post("/api/status-reports", { kind: "status_subteam", subject: "x", reportOn: "2030-01-01" });
    expect(bad.statusCode).toBe(400);
    const ok = await maya.post("/api/status-reports", { kind: "status_individual", subject: "Maya: weekly", reportOn: "2030-01-01", thisWeek: "<p>Planned</p>", goals: "<p>Ship</p>", issues: "" });
    expect(ok.statusCode).toBe(201);
    expect(ok.json().thisWeek).toBe("<p>Planned</p>");
  });

  it("milestones list and create", async () => {
    const res = await maya.post("/api/milestones", { title: "GA", summary: "General availability", occursOn: "2030-06-01" });
    expect(res.statusCode).toBe(201);
    const all = (await maya.get("/api/milestones")).json();
    expect(all.at(-1).title).toBe("GA");
  });

  it("members and subteams include memberships and leaders", async () => {
    const members = (await maya.get("/api/members")).json();
    expect(members).toHaveLength(9);
    expect(members.find((m: { id: string }) => m.id === "u-rita").role).toBe("reader");
    const subteams = (await maya.get("/api/subteams")).json();
    const platform = subteams.find((s: { name: string }) => s.name === "Platform & APIs");
    expect(platform.leader.displayName).toBe("Daniel Okafor");
    expect(platform.members).toHaveLength(3);
    const detail = (await maya.get(`/api/subteams/${platform.id}`)).json();
    expect(detail.recentDocuments.length).toBeGreaterThan(0);
    expect((await maya.get("/api/members/u-nobody")).statusCode).toBe(404);
  });

  it("search spans documents, comments, milestones and members", async () => {
    const r = (await maya.get("/api/search?q=gateway")).json();
    expect(r.documents.length).toBeGreaterThan(0);
    const viaComment = (await maya.get("/api/search?q=Safari matrix")).json();
    expect(viaComment.documents[0].subject).toContain("regression suite");
    expect((await maya.get("/api/search?q=sign-off")).json().milestones.length).toBe(1);
    expect((await maya.get("/api/search?q=Berlin")).json().members[0].displayName).toBe("Tom Becker");
    expect((await maya.get("/api/search?q=a")).json().documents).toEqual([]);
  });
});
