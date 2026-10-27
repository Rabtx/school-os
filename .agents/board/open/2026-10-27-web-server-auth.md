---
id: str-web-server-auth
title: Check auth on the server before rendering admin pages
type: feature
from: reviewer
to: web
priority: normal
status: open
assignee: none
reviewer: none
parent: none
depends_on: []
branch: none
worktree: none
scope: ["apps/web/**"]
allowed_shared: []
created: 2026-10-27
updated: 2026-10-27
---

## What

Admin pages are guarded only in the browser, so unauthenticated visitors get the page shell and a loading flash.

## Why / Context

S-06 and the web findings in `new_issues.md`; arch #1 to #3.

## Proposal or Ask

Verify the session in middleware or a server layout and redirect before rendering; keep the client store for interactivity. Do it with the Phase 3 app shell rebuild. Done when unauthenticated requests to /admin redirect server-side, with an e2e test.

## Scope

**In scope:**

- `apps/web/**`

**Out of scope:**

- Findings already fixed (see `.agents/plans/audits/triage.md`).

## Validation

- `bun run lint`, `bun run typecheck`, `bun run test`; e2e for touched web flows.
- Migrations applied to a fresh database and to the previous schema in Docker, where schema changes.

## Resolution

