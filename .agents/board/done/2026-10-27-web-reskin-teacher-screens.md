---
id: str-web-reskin-teacher-screens
title: Reskin the teacher screens to Figma
type: feature
from: pm
to: web
priority: normal
status: done
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
- PR 4: marks (`167:37954`) as the gradebook's default tab, with report cards (`166:36303`) as the second. A new marks endpoint (`GET /gradebook/marks?sectionId&subjectId`) returns every published test and homework for one class subject per student, with homework average, a trend over every marked item and an overall (mean of marked tests and homework) with its grade. Marks tab: sort, class and subject pills, latest two homework (marks, waiting, missing, not due), the latest three tests, homework average meter, trend, overall and grade, row menu to mark waiting homework or open the profile, CSV export, Add assessment, and a banner linking to check answers when homework waits on the teacher. AI publish and review wait for Phase 7; terms are not modelled on tests yet, so the Term pill is left out of Marks.
- PR 5: tests (`181:49526`) on the shared list layout: Tests and Quizzes tabs, sort, class and status pills, search, Test planner and New test/quiz in the toolbar. Columns: test, class and subject with draft and exam chips, date and start time, duration, students, and a result (not sent, sent to N students, waiting for marks, or the average with how many are left to mark). A side panel shows status, publish (confirmed) or close, enter marks, details, results and who sits it. The assessment list API adds a results summary per row (marked, absent, mean percentage) in one grouped query. Questions, practice sets, the question bank and family notices have no backend yet; the panel says so instead of showing them.
- Card closed: every teacher frame on Figma page `212:33177` is rebuilt.

