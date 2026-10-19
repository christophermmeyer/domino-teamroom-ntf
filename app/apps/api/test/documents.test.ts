import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { Client, testApp } from "./helpers.js";

describe("documents and threads", () => {
  let app: FastifyInstance;
  let maya: Client;
  let omar: Client;
  beforeAll(async () => {
    const t = await testApp();
    app = t.app;
    maya = await t.as("maya.chen@atlas.example");
    omar = await t.as("omar.haddad@atlas.example");
  });
  afterAll(() => app.close());

  it("lists active top-level thread documents with comment counts", async () => {
    const docs = (await maya.get("/api/documents")).json();
    expect(docs.length).toBeGreaterThan(5);
    expect(docs.every((d: { parentId: string | null }) => d.parentId === null)).toBe(true);
    expect(docs.every((d: { inactiveAt: string | null }) => d.inactiveAt === null)).toBe(true);
    expect(docs.some((d: { kind: string }) => d.kind === "announcement")).toBe(false);
    const gateway = docs.find((d: { subject: string }) => d.subject.includes("API gateway or go direct"));
    expect(gateway.commentCount).toBe(4);
    expect(gateway.author.displayName).toBe("Daniel Okafor");
    expect(gateway.tags).toEqual(["Architecture", "Infrastructure"]);
  });

  it("supports the All Documents filters", async () => {
    const byTag = (await maya.get("/api/documents?tag=Security")).json();
    expect(byTag.length).toBeGreaterThan(0);
    expect(byTag.every((d: { tags: string[] }) => d.tags.includes("Security"))).toBe(true);

    const meetings = (await maya.get("/api/documents?kind=meeting")).json();
    expect(meetings.every((d: { kind: string }) => d.kind === "meeting")).toBe(true);

    const inactive = (await maya.get("/api/documents?view=inactive")).json();
    expect(inactive).toHaveLength(1);

    const assigned = (await omar.get("/api/documents?view=assigned")).json();
    expect(assigned.length).toBe(1);
    expect(assigned[0].assignees.map((a: { id: string }) => a.id)).toContain("u-omar");

    const due = (await maya.get("/api/documents?view=due")).json();
    expect(due.every((d: { kind: string; status: string }) => d.kind === "action" && d.status === "open")).toBe(true);

    const mine = (await omar.get("/api/documents?view=mine")).json();
    expect(mine.every((d: { author: { id: string } }) => d.author.id === "u-omar")).toBe(true);
  });

  it("creates a topic with sanitized HTML, then builds a nested response thread", async () => {
    const create = await maya.post("/api/documents", {
      kind: "discussion",
      subject: "Test topic",
      bodyHtml: '<p>Hello <strong>team</strong></p><script>alert(1)</script><a href="javascript:alert(1)" onclick="x()">x</a>',
      tags: ["QA", "Brand New Tag"],
    });
    expect(create.statusCode).toBe(201);
    const topic = create.json();
    expect(topic.threadRootId).toBe(topic.id);
    expect(topic.bodyHtml).not.toContain("<script");
    expect(topic.bodyHtml).not.toContain("onclick");
    expect(topic.bodyHtml).not.toContain("javascript:");
    expect(topic.bodyHtml).toContain("<strong>team</strong>");
    expect(topic.abstract).toBe("Hello team x");
    expect(topic.tags).toEqual(["Brand New Tag", "QA"]);

    const r1 = (await omar.post(`/api/documents/${topic.id}/comments`, { bodyHtml: "<p>First reply</p>" })).json();
    const r2 = (await maya.post(`/api/documents/${topic.id}/comments`, { parentId: r1.id, bodyHtml: "<p>Nested reply</p>" })).json();
    expect(r1.parentId).toBe(topic.id);
    expect(r2.parentId).toBe(r1.id);
    expect(r2.threadRootId).toBe(topic.id);

    // fetching by a comment id resolves the whole thread
    const thread = (await maya.get(`/api/documents/${r2.id}`)).json();
    expect(thread.root.id).toBe(topic.id);
    expect(thread.comments.map((c: { id: string }) => c.id)).toEqual([r1.id, r2.id]);
    expect(thread.root.commentCount).toBe(2);
  });

  it("validates kinds and meeting times", async () => {
    expect((await maya.post("/api/documents", { kind: "milestone", subject: "x", bodyHtml: "<p>y</p>" })).statusCode).toBe(400);
    expect((await maya.post("/api/documents", { kind: "meeting", subject: "No times", bodyHtml: "<p>y</p>" })).statusCode).toBe(400);
    const ok = await maya.post("/api/documents", { kind: "meeting", subject: "Sync", bodyHtml: "<p>agenda</p>", startsAt: "2030-01-01T10:00:00.000Z", endsAt: "2030-01-01T11:00:00.000Z", location: "Room 1" });
    expect(ok.statusCode).toBe(201);
    expect(ok.json().status).toBeNull();
    const cal = (await maya.get("/api/calendar?from=2029-12-31T00:00:00.000Z&to=2030-01-31T00:00:00.000Z")).json();
    expect(cal.map((e: { id: string }) => e.id)).toContain(ok.json().id);
  });

  it("actions carry priority, due date and assignees; assignees can complete them", async () => {
    const res = await maya.post("/api/documents", { kind: "action", subject: "Fix it", bodyHtml: "<p>soon</p>", dueOn: "2030-01-01", priority: 1, assigneeIds: ["u-omar"] });
    expect(res.statusCode).toBe(201);
    const action = res.json();
    expect(action.status).toBe("open");
    expect(action.assignees[0].id).toBe("u-omar");

    expect((await omar.patch(`/api/documents/${action.id}`, { subject: "rename" })).statusCode).toBe(403);
    const done = await omar.patch(`/api/documents/${action.id}`, { status: "complete" });
    expect(done.statusCode).toBe(200);
    expect(done.json().status).toBe("complete");
  });

  it("marks inactive, restores, and deletes whole threads", async () => {
    const topic = (await maya.post("/api/documents", { kind: "discussion", subject: "Doomed", bodyHtml: "<p>x</p>" })).json();
    const reply = (await maya.post(`/api/documents/${topic.id}/comments`, { bodyHtml: "<p>y</p>" })).json();

    await maya.post(`/api/documents/${topic.id}/inactive`);
    let ids = (await maya.get("/api/documents?view=inactive")).json().map((d: { id: string }) => d.id);
    expect(ids).toContain(topic.id);
    await maya.del(`/api/documents/${topic.id}/inactive`);
    ids = (await maya.get("/api/documents")).json().map((d: { id: string }) => d.id);
    expect(ids).toContain(topic.id);

    expect((await maya.del(`/api/documents/${topic.id}`)).statusCode).toBe(204);
    expect((await maya.get(`/api/documents/${reply.id}`)).statusCode).toBe(404);
  });
});
