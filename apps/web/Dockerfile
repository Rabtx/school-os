# syntax=docker/dockerfile:1

ARG BUN_VERSION=1.4.2

FROM oven/bun:${BUN_VERSION}-alpine AS base
WORKDIR /app

FROM base AS deps
COPY package.json bun.lock ./
COPY apps/nest-api/package.json ./apps/nest-api/
COPY apps/web/package.json ./apps/web/
COPY apps/mobile/package.json ./apps/mobile/
COPY apps/docs/package.json ./apps/docs/
COPY apps/rust/package.json ./apps/rust/
COPY packages/rabtx/package.json ./packages/rabtx/
COPY packages/ui/package.json ./packages/ui/
COPY packages/logger/package.json ./packages/logger/
COPY packages/typescript-config/package.json ./packages/typescript-config/
RUN bun install --frozen-lockfile

FROM base AS build
ARG NEXT_PUBLIC_NEST_API_URL=http://localhost:4000
ENV NEXT_PUBLIC_NEST_API_URL=${NEXT_PUBLIC_NEST_API_URL}
ENV NEXT_TELEMETRY_DISABLED=1

# Bun links each workspace's dependencies into its own node_modules (pointing into the root
# store), so take the whole install, not just the root node_modules.
COPY --from=deps /app ./
COPY package.json bun.lock turbo.json ./
COPY apps/web ./apps/web
COPY packages/rabtx ./packages/rabtx
COPY packages/ui ./packages/ui
COPY packages/typescript-config ./packages/typescript-config

WORKDIR /app/apps/web
RUN bun run build

FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup -S school-os && adduser -S school-os -G school-os \
	&& apk add --no-cache wget

COPY --from=build /app/apps/web/public ./apps/web/public
COPY --from=build --chown=school-os:school-os /app/apps/web/.next/standalone ./
COPY --from=build --chown=school-os:school-os /app/apps/web/.next/static ./apps/web/.next/static

USER school-os

EXPOSE 3000

HEALTHCHECK --interval=15s --timeout=5s --start-period=25s --retries=5 \
	CMD wget -qO- "http://127.0.0.1:${PORT}" >/dev/null || exit 1

CMD ["node", "apps/web/server.js"]
