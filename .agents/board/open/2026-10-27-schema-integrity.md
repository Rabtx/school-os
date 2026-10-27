---
id: str-schema-integrity
title: Bring schema constraints in line with the migrations
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
scope: ["apps/nest-api/src/database/**"]
allowed_shared: []
created: 2026-10-27
updated: 2026-10-27
---

## What

Declare the unique indexes and constraints the migrations and the code rely on, and fix provenance columns that block deletes or vanish on cascade.

## Why / Context

S-10, S-11, S-12, S-16, S-26, S-27, S-28, S-31, S-33, S-42, S-43, S-47, S-48, S-53, S-60.

## Proposal or Ask

One migration per coherent change, each applied to a fresh database and to the previous schema in Docker. Done when the Drizzle schema matches the database and each finding is fixed or closed with a reason.

## Scope

**In scope:**

- `apps/nest-api/src/database/**`

**Out of scope:**

- Findings already fixed (see `.agents/plans/audits/triage.md`).

## Validation

- `bun run lint`, `bun run typecheck`, `bun run test`; e2e for touched web flows.
- Migrations applied to a fresh database and to the previous schema in Docker, where schema changes.

## Resolution

