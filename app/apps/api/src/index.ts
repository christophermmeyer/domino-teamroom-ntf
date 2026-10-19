import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { mkdirSync } from "node:fs";
import { buildApp } from "./app.js";

const here = dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.PORT ?? 8080);
const host = process.env.HOST ?? "0.0.0.0";
const dataDir = process.env.DATA_DIR ?? resolve(here, "../data");
mkdirSync(dataDir, { recursive: true });
const dbFile = process.env.DATABASE_FILE ?? resolve(dataDir, "teamroom.sqlite");
const staticDir = process.env.STATIC_DIR ?? resolve(here, "../../web/dist");

const app = await buildApp({ dbFile, staticDir, logger: true });
await app.listen({ port, host });
