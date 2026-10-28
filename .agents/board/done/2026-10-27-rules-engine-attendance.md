---
id: str-rules-engine-attendance
title: Build the rules engine, starting with attendance policy
type: feature
from: pm
to: backend
priority: high
status: done
assignee: claude
reviewer: none
parent: none
depends_on: []
branch: ccr-bf0f9944-6h1l31
worktree: none
scope: ["apps/nest-api/src/modules/rules/**", "apps/nest-api/src/modules/attendance/**"]
allowed_shared: []
created: 2026-10-27
updated: 2026-10-28
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

- Policy: `attendancePolicySchema` (Zod) with roll call close, late after, grace, auto-mark absent and its time, excuse from a guardian message, gate scan rules, teacher edit window (2 h, 24 h, 2 days, a week or no limit) and absence alert delay. Cross-field checks: late before close, auto-absent at or after close.
- Storage: `attendance_policies`, one row per saved version (unique tenant + version, so concurrent saves conflict instead of overwriting); every save writes an audit log and mirrors the grace period to `tenant_settings`. Until a school saves, the defaults apply (grace taken from its existing setting). A stored policy that no longer validates falls back to defaults with a warning.
- Evaluator (`attendance-rules.ts`, pure, 14 specs): late threshold, gate scan outcome, roll call open, auto-absent due, teacher edit deadline in the school time zone, quiet hours across midnight, and absence alert time pushed out of quiet hours.
- API: `GET/PUT /tenants/:id/rules/attendance` (settings read/write). Attendance enforces the teacher edit window on marking and confirm-all (403 `ATTENDANCE_EDIT_WINDOW_CLOSED`; leadership exempt) and returns `rules` on every session.
- Web: Settings · Attendance rules rebuilt to `232:140585` (roll call, the gate, absence alerts; version line); roll call shows the closing time and late-from time and locks a teacher's past day with a notice.
- Moved to `str-whatsapp-delivery`: the scheduled auto-absent run, sending absence alerts, and gate scan marking, which use the evaluator above.
