import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { Client, testApp } from "./helpers.js";

describe("auth and roles", () => {
  let app: FastifyInstance;
  let as: Awaited<ReturnType<typeof testApp>>["as"];
  beforeAll(async () => ({ app, as } = await testApp()));
  afterAll(() => app.close());

  it("rejects API calls without a session cookie", async () => {
    expect((await app.inject({ method: "GET", url: "/api/home" })).statusCode).toBe(401);
  });

  it("rejects a wrong password and unknown users", async () => {
    const bad = await app.inject({ method: "POST", url: "/api/auth/login", payload: { email: "maya.chen@atlas.example", password: "nope" } });
    expect(bad.statusCode).toBe(401);
    const unknown = await app.inject({ method: "POST", url: "/api/auth/login", payload: { email: "nobody@atlas.example", password: "teamroom" } });
    expect(unknown.statusCode).toBe(401);
  });

  it("sets an httpOnly cookie and serves /me with the membership role", async () => {
    const c = new Client(app);
    const res = await c.login("maya.chen@atlas.example");
    expect(res.statusCode).toBe(200);
    expect(String(res.headers["set-cookie"])).toMatch(/HttpOnly/);
    expect(String(res.headers["set-cookie"])).toMatch(/SameSite=Lax/);
    const me = await c.get("/api/auth/me");
    expect(me.json().role).toBe("owner");
    expect(me.json()).not.toHaveProperty("passwordHash");
  });

  it("invalidates the session on logout", async () => {
    const c = await as("tom.becker@atlas.example");
    expect((await c.get("/api/auth/me")).statusCode).toBe(200);
    await c.post("/api/auth/logout");
    expect((await c.get("/api/auth/me")).statusCode).toBe(401);
  });

  it("readers can read but not write", async () => {
    const rita = await as("rita.novak@atlas.example");
    expect((await rita.get("/api/documents")).statusCode).toBe(200);
    const res = await rita.post("/api/documents", { kind: "discussion", subject: "x", bodyHtml: "<p>y</p>" });
    expect(res.statusCode).toBe(403);
  });

  it("members edit only their own documents; facilitators edit any", async () => {
    const tom = await as("tom.becker@atlas.example");
    const daniel = await as("daniel.okafor@atlas.example");
    const lena = await as("lena.fischer@atlas.example");
    const doc = (await tom.post("/api/documents", { kind: "discussion", subject: "Tom's topic", bodyHtml: "<p>hi</p>" })).json();
    expect((await daniel.patch(`/api/documents/${doc.id}`, { subject: "hijack" })).statusCode).toBe(403);
    expect((await tom.patch(`/api/documents/${doc.id}`, { subject: "Tom's topic v2" })).statusCode).toBe(200);
    expect((await lena.patch(`/api/documents/${doc.id}`, { subject: "Facilitated" })).statusCode).toBe(200);
  });

  it("only owners and facilitators change settings", async () => {
    const tom = await as("tom.becker@atlas.example");
    expect((await tom.patch("/api/settings", { name: "Nope" })).statusCode).toBe(403);
    const maya = await as("maya.chen@atlas.example");
    const res = await maya.patch("/api/settings", { labels: { action: "To-do" } });
    expect(res.statusCode).toBe(200);
    expect(res.json().labels.action).toBe("To-do");
  });
});
