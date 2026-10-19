# syntax=docker/dockerfile:1

# ---- build: install workspace, build web (static) and api (bundled) ----
FROM node:22-alpine AS build
RUN apk add --no-cache python3 make g++ && corepack enable
WORKDIR /src
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY packages/db/package.json packages/db/
COPY packages/shared/package.json packages/shared/
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build

# ---- prod deps: only what the api needs at runtime ----
FROM node:22-alpine AS deps
RUN apk add --no-cache python3 make g++ && corepack enable
WORKDIR /src
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/api/package.json apps/api/
COPY packages/db/package.json packages/db/
COPY packages/shared/package.json packages/shared/
RUN pnpm install --frozen-lockfile --prod --filter @teamroom/api... \
 && pnpm --filter @teamroom/api deploy --prod --legacy /out

# ---- runtime ----
FROM node:22-alpine
RUN apk add --no-cache tini && addgroup -S app && adduser -S app -G app
WORKDIR /app
ENV NODE_ENV=production PORT=8080 DATA_DIR=/data STATIC_DIR=/app/web
COPY --from=deps /out/node_modules ./node_modules
COPY --from=build /src/apps/api/dist ./dist
COPY --from=build /src/apps/web/dist ./web
RUN mkdir -p /data && chown -R app:app /data /app
USER app
VOLUME ["/data"]
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://127.0.0.1:8080/api/health || exit 1
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "dist/index.js"]
