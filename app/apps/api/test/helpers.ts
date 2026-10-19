import type { FastifyInstance, InjectOptions } from "fastify";
import { buildApp } from "../src/app.js";

export const PASSWORD = "teamroom";

export class Client {
  cookie = "";
  constructor(readonly app: FastifyInstance) {}

  async login(email: string) {
    const res = await this.app.inject({ method: "POST", url: "/api/auth/login", payload: { email, password: PASSWORD } });
    const set = res.headers["set-cookie"];
    const raw = Array.isArray(set) ? set[0] : set;
    this.cookie = raw ? raw.split(";")[0] : "";
    return res;
  }

  inject(opts: InjectOptions) {
    return this.app.inject({ ...opts, headers: { ...(opts.headers ?? {}), cookie: this.cookie } });
  }
  get(url: string) {
    return this.inject({ method: "GET", url });
  }
  post(url: string, payload?: unknown) {
    return this.inject({ method: "POST", url, payload: payload as Record<string, unknown> });
  }
  patch(url: string, payload?: unknown) {
    return this.inject({ method: "PATCH", url, payload: payload as Record<string, unknown> });
  }
  del(url: string) {
    return this.inject({ method: "DELETE", url });
  }
}

export async function testApp() {
  const app = await buildApp();
  const as = async (email: string) => {
    const c = new Client(app);
    await c.login(email);
    return c;
  };
  return { app, as };
}
