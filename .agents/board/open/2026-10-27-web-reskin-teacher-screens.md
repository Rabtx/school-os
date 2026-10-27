---
id: str-web-reskin-teacher-screens
title: Reskin the teacher screens to Figma
type: feature
from: pm
to: web
priority: normal
status: open
assignee: none
reviewer: none
parent: none
depends_on: ["str-web-reskin-detail-screens"]
branch: none
worktree: none
scope: ["apps/web/src/modules/dashboard/components/teacher-dashboard.tsx", "apps/web/src/modules/staff/**", "apps/web/src/app/admin/my-classes/**"]
allowed_shared: []
created: 2026-10-27
updated: 2026-10-27
---

## What

Teacher home, my classes, roll call, homework, check answers, marks and report cards on the Figma Teacher page.

## Why / Context

Phase 3 step 3 of `.agents/plans/school-os-master-plan.md`. Figma page `212:33177` (Teacher).

## Proposal or Ask

Same pattern as the principal screens; teacher views only show their assigned sections (record scope already enforced by `AccessScopeService`).

## Scope

**In scope:**

- Teacher screens with an existing backend

**Out of scope:**

- AI checker and publish marks (Phase 7)

## Validation

- `bun run lint` (0 warnings), `bun run typecheck`, web vitest.
- Playwright tour of the touched screens: no page, console or API errors; 390px check with no horizontal scroll.
- Screenshot compared with the Figma frame; node IDs recorded below.

## Resolution

