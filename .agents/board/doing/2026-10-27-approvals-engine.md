---
id: str-approvals-engine
title: Build the approvals engine
type: feature
from: pm
to: backend
priority: high
status: doing
assignee: backend
reviewer: none
parent: none
depends_on: ["str-auth-session-hardening"]
branch: ccr-bf0f9944-6h1l31
worktree: none
scope: ["apps/nest-api/src/modules/approvals/**", "apps/web/src/modules/approvals/**"]
allowed_shared: []
created: 2026-10-27
updated: 2026-10-28
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

## Progress

**PR A (done):** the engine and one complete type.

- `approval_requests` (migration `0031`): type, payload snapshot, risk, approver role (leadership or owner), requester, decision, reason, result, undo window, expiry, and one pending request per thing changed (partial unique index on `dedupe_key`).
- Typed registry (`approvals.registry.ts`): each handler validates who may ask and what, describes the card, applies as the approver and reverses on undo. Approve claims the row first (only one leader wins), applies, then opens a 15-second undo window; a failed apply puts the request back. Expiry is applied lazily when the queue is read.
- API: queue with today's totals, mine, get, create, approve, decline with reason, undo, cancel. Every step writes `audit_logs` (`approvals.requested|approved|declined|undone|expired|cancelled`).
- `attendance_change`: a teacher on a day the edit window has closed asks from the roll call row menu; approving sets the mark as the principal; undo restores the replaced mark.
- Web `/admin/approvals` (Figma `82:37115`, states `221:114293`, `221:115806`, `221:118631`, `221:121411`): one card at a time, Up next, ⌘↵ approve, decline dialog with reasons, Approved with undo countdown, Declined, Nothing is waiting.
- Sidebar Approvals item with the pending count as an accent pill (`NavItem` `countTone`).

**PR B (next):** `leave` (guardian request from My children, applies excused for the days) and `marks_change` (closed assessments lock for teachers, who request a change). Notices land with messaging.

## Resolution

