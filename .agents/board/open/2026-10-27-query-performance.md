---
id: str-query-performance
title: Remove N+1 queries and add pagination to list endpoints
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

Several services query once per row (homework applicability, teacher listing, attendance marking) and list endpoints return everything.

## Why / Context

S-21, S-22, S-23, S-30, S-34, S-37, S-44. Morning gate attendance is the peak load (Phase 9 load tests).

## Proposal or Ask

Batch the per-row queries, add cursor pagination to list endpoints with web callers updated, fix timetable countEntries. Done when the listed findings are fixed with tests.

## Scope

**In scope:**

- `apps/nest-api/src/modules/**`

**Out of scope:**

- Findings already fixed (see `.agents/plans/audits/triage.md`).

## Validation

- `bun run lint`, `bun run typecheck`, `bun run test`; e2e for touched web flows.
- Migrations applied to a fresh database and to the previous schema in Docker, where schema changes.

## Resolution

