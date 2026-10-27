# syntax=docker/dockerfile:1

ARG BUN_VERSION=1.3.13

FROM oven/bun:${BUN_VERSION}-alpine AS base
WORKDIR /app

FROM base AS deps
COPY package.json bun.lock ./
COPY apps/nest-api/package.json ./apps/nest-api/
COPY apps/web/package.json ./apps/web/
COPY apps/mobile/package.json ./apps/mobile/
COPY apps/docs/package.json ./apps/docs/
COPY apps/rust/package.json ./apps/rust/
COPY packages/ui/package.json ./packages/ui/
COPY packages/logger/package.json ./packages/logger/
COPY packages/typescript-config/package.json ./packages/typescript-config/
RUN bun install --frozen-lockfile

FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY package.json bun.lock ./
COPY apps/nest-api ./apps/nest-api
WORKDIR /app/apps/nest-api
RUN bun run build

FROM oven/bun:${BUN_VERSION}-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=4000

RUN addgroup -S school-os && adduser -S school-os -G school-os \
	&& apk add --no-cache wget

COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/apps/nest-api/package.json ./apps/nest-api/package.json
COPY --from=build /app/apps/nest-api/dist ./apps/nest-api/dist
COPY --from=build /app/apps/nest-api/src/database/migrations ./apps/nest-api/src/database/migrations
COPY --from=build /app/apps/nest-api/src/database/migrate.ts ./apps/nest-api/src/database/migrate.ts
COPY apps/nest-api/docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh

RUN chmod +x /usr/local/bin/docker-entrypoint.sh \
	&& chown -R school-os:school-os /app

USER school-os
WORKDIR /app/apps/nest-api

EXPOSE 4000

HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=5 \
	CMD wget -qO- "http://127.0.0.1:${PORT}/api/v1/health" >/dev/null || exit 1

ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["bun", "dist/main.js"]
