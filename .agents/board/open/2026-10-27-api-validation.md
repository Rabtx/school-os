---
id: str-api-validation
title: Validate every query parameter and tighten management checks
type: chore
from: reviewer
to: backend
priority: normal
status: open
assignee: none
reviewer: none
parent: none
depends_on: []
branch: none
worktree: none
scope: ["apps/nest-api/src/modules/**"]
allowed_shared: []
created: 2026-10-27
updated: 2026-10-27
---

## What

Some controllers parse query strings by hand, tenant creation has no rate limit or per-user cap, and a few repository lookups are not tenant-scoped.

## Why / Context

S-14, S-20, S-29, S-32, S-36, S-38, S-39, S-49, S-50, S-52, S-54, S-56, S-58; arch #4 and #5.

## Proposal or Ask

Zod schemas for every query DTO, a rate limit and cap on tenant creation, tenant-scoped repository lookups. Done when the listed findings are fixed or closed with a reason.

## Scope

**In scope:**

- `apps/nest-api/src/modules/**`

**Out of scope:**

- Findings already fixed (see `.agents/plans/audits/triage.md`).

## Validation

- `bun run lint`, `bun run typecheck`, `bun run test`; e2e for touched web flows.
- Migrations applied to a fresh database and to the previous schema in Docker, where schema changes.

## Resolution

