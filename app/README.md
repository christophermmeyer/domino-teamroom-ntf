# TeamRoom (React prototype)

The HCL Domino TeamRoom template replatformed as a self-contained web app: a React SPA and a Fastify API in one container, backed by SQLite. Seed data is the only content; there is no NSF importer.

| Layer | Stack |
|---|---|
| `apps/web` | React 19, TypeScript, Vite, Tailwind 4, React Router 7, TanStack Query |
| `apps/api` | Node 22, Fastify 5, cookie sessions, `sanitize-html` |
| `packages/db` | Drizzle ORM schema over `better-sqlite3`, seed data |
| `packages/shared` | Zod input schemas, enums and API types shared by web and api |

## Run with Docker

```bash
cd app
docker compose up --build
```

Open <http://localhost:8080>. Data persists in the `teamroom-data` volume; `docker compose down -v` resets it.

## Run locally

```bash
cd app
pnpm install
pnpm dev          # API on :8080 (tsx watch) + Vite on :5173 with /api proxied
```

Open <http://localhost:5173>. Other scripts:

```bash
pnpm test         # Vitest API tests (fastify.inject against an in-memory SQLite)
pnpm typecheck    # all workspaces
pnpm build        # web -> apps/web/dist, api -> apps/api/dist (bundled with tsup)
pnpm start        # serve the built app from apps/api on :8080
```

## Demo accounts

Every seeded user has the password `teamroom`. The login page lists them.

| Email | Role |
|---|---|
| maya.chen@atlas.example | owner |
| lena.fischer@atlas.example | facilitator |
| daniel.okafor@, priya.raman@, tom.becker@, omar.haddad@, sofia.alvarez@, jonas.lindqvist@atlas.example | member |
| rita.novak@atlas.example | reader |

Readers can browse but not write. Members edit their own documents. Owners and facilitators edit anything and can change the room setup.

## What is here

- Home: room purpose, stats, announcements, recent activity with TeamRoom verbs, open action items, upcoming meetings and milestones, latest status, team panel.
- All Documents: discussion / action / meeting / reference with the template's views (all, mine, assigned to me, open by due date, inactive) plus type, subteam, tag and text filters.
- Topic thread with nested responses (response-to-response), reply, edit, mark complete / review complete, mark inactive, delete.
- Create and edit documents with a small rich text editor. HTML is the stored body and is sanitized server-side.
- Announcements, Milestones (the template's Event form), Calendar (meetings by start time plus milestones), Status reports (team / subteam / individual), Members and Subteams with profiles, Search, Setup (name, purpose, four customizable document type labels, home panels).
- Light and dark mode, responsive layout.

## Environment

See `.env.example`. `PORT`, `DATA_DIR` (SQLite location), `STATIC_DIR` (built SPA), `TRUST_PROXY`.
