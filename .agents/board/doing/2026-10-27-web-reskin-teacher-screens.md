---
id: str-web-reskin-teacher-screens
title: Reskin the teacher screens to Figma
type: feature
from: pm
to: web
priority: normal
status: doing
assignee: claude
reviewer: none
parent: none
depends_on: ["str-web-reskin-detail-screens"]
branch: ccr-bf0f9944-6h1l31
worktree: none
scope: ["apps/web/src/modules/dashboard/components/teacher-home/**", "apps/web/src/modules/staff/**", "apps/web/src/app/admin/my-classes/**", "apps/nest-api/src/modules/staff/**"]
allowed_shared: []
created: 2026-10-27
updated: 2026-10-28
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

Progress:

- PR 1: teacher home (`158:31492`) and My classes (`158:32640`). The dashboard API adds `toReviewCount` (homework handed in, not graded) and each class's roll-call rate and daily trend over the last 10 school days. Home: next class, roll call, to review, due today and drafts; today's lessons with taught/now/next status; homeroom roll call; needs-you list; students absent several days in a row. Unread messages and AI drafts wait for Phases 4 and 7, so their cards show homework due today and drafts instead. My classes: Today, This week and All classes tabs as one table with attendance meter, trend and status, row menu for roll call, homework and tests. The old command-centre components and onboarding dialog are removed.
- PR 2: roll call (`160:32559`, row menu `200:85320`) on the shared list layout for teachers and leadership: Roll call / Late arrivals / Absences tabs (`?status=`), class, date and status pills, guardian, check-in time and method columns, row menu to mark or open the profile, stats footer. The session response adds each student's primary guardian and latest check-in source. Teachers land on their first homeroom with students instead of an empty page. Parent alert status waits for Phase 4.
- PR 3: check answers (`165:36039`) as the homework page's Submissions tab (`?tab=submissions&homeworkId=`), reached from each assignment's "Check answers" action. Homework picker, status filter (needs marking / marked / not handed in), search, handed-in and marks columns, stats footer, and a side panel to mark, comment, excuse or mark not handed in, with save and next. The submissions API now lists every recipient, so students who never handed in show as not handed in instead of being left out. Fixes marking wiping the hand-in time and attachment. The AI checker waits for Phase 7.
- Next: marks and report cards.

