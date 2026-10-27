---
id: str-rules-engine-attendance
title: Build the rules engine, starting with attendance policy
type: feature
from: pm
to: backend
priority: high
status: open
assignee: none
reviewer: none
parent: none
depends_on: []
branch: none
worktree: none
scope: ["apps/nest-api/src/modules/rules/**", "apps/nest-api/src/modules/attendance/**"]
allowed_shared: []
created: 2026-10-27
updated: 2026-10-27
---

## What

Typed per-school policies evaluated server-side: attendance cut-off, grace, late marking, absence alert timing and quiet hours.

## Why / Context

Phase 4 of `.agents/plans/school-os-master-plan.md` principle 2: the school's rules are plain code, AI may only help write them. Figma: Settings · Attendance rules `232:140585`.

## Proposal or Ask

Versioned policy rows per tenant, a pure evaluator with unit tests, and the settings screen.

## Scope

**In scope:**

- Attendance rules and settings screen

**Out of scope:**

- Fee and messaging rules (later rule types)

## Validation

- `bun run lint`, `bun run typecheck`, `bun run test` with a spec per new rule or endpoint.
- Migrations applied to a fresh database and to the previous schema in Docker.
- Playwright e2e for the web flow that uses it.

## Resolution

