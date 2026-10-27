---
id: str-approvals-engine
title: Build the approvals engine
type: feature
from: pm
to: backend
priority: high
status: open
assignee: none
reviewer: none
parent: none
depends_on: ["str-auth-session-hardening"]
branch: none
worktree: none
scope: ["apps/nest-api/src/modules/approvals/**", "apps/web/src/modules/approvals/**"]
allowed_shared: []
created: 2026-10-27
updated: 2026-10-27
---

## What

One model for every request: type, drafted payload, risk, requester, approver role, decision, reason, expiry, undo window and resulting action, with the approvals queue screen.

## Why / Context

Phase 4 of `.agents/plans/school-os-master-plan.md`. Every AI write in Phase 6 goes through this queue. Figma: Principal · Approvals `189:57156` and Approval states `221:112353`.

## Proposal or Ask

Start with notices, leave and marks changes as approval types; audit every decision; sidebar Approvals count from this queue.

## Scope

**In scope:**

- Model, API, queue screen, approval states

**Out of scope:**

- Gate pass, seat offer and role change types (add as their modules land)

## Validation

- `bun run lint`, `bun run typecheck`, `bun run test` with a spec per new rule or endpoint.
- Migrations applied to a fresh database and to the previous schema in Docker.
- Playwright e2e for the web flow that uses it.

## Resolution

