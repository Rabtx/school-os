---
id: str-web-reskin-detail-screens
title: Reskin the principal detail screens to Figma
type: feature
from: pm
to: web
priority: high
status: doing
assignee: claude
reviewer: none
parent: none
depends_on: ["str-web-reskin-shell-lists"]
branch: ccr-bf0f9944-6h1l31
worktree: none
scope: ["apps/web/src/modules/students/**", "apps/web/src/modules/guardians/**", "apps/web/src/modules/attendance/**", "apps/web/src/modules/homework/**", "apps/web/src/modules/gradebook/**", "apps/web/src/modules/timetable/**", "apps/web/src/modules/reports/**"]
allowed_shared: []
created: 2026-10-27
updated: 2026-10-27
---

## What

Rebuild the student profile, guardians, roll call, homework, gradebook, timetable, reports and settings screens to their Figma frames.

## Why / Context

Phase 3 step 2 of `.agents/plans/school-os-master-plan.md`. Figma (Principal page): Student profile `77:60454`, Guardians `132:23857`, Roll call `76:62188` and `76:65311`, Homework `77:57765`, Gradebook `77:90702`, Timetable `77:73662`, Reports `77:71451`, Settings `77:89099`, Students row menu, class filter, new student and export (`198:63069`, `198:65318`, `198:67488`, `199:65147`).

## Proposal or Ask

One PR per two or three screens. The student profile is a 440px side panel over the list (Figma `77:60454`), with "Open full profile" for later. Reuse the shell, table and stat card from `str-web-reskin-shell-lists`.

## Scope

**In scope:**

- The screens above and their forms and menus that already have a backend

**Out of scope:**

- Approvals, messages, fees, admissions, automations (wait for their phases)

## Validation

- `bun run lint` (0 warnings), `bun run typecheck`, web vitest.
- Playwright tour of the touched screens: no page, console or API errors; 390px check with no horizontal scroll.
- Screenshot compared with the Figma frame; node IDs recorded below.

## Resolution

Progress:

- PR #104: student profile panel, guardians table, roll call.
- PR #105: shell and principal home rebuilt to the dashboard frame (structure, not just tokens).
- Next PR: shared Figma list layout (`ListPage`, full-bleed `DataTable` with selection, `DataTableFooterBar`, CSV export) on Students, Guardians and Teachers.
- Members follows "Settings · Members & roles" (`232:138695`) and moves to the settings screens.
- Remaining: homework, gradebook, timetable, reports, settings.

