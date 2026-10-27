---
id: str-web-reskin-shell-lists
title: Reskin the app shell, dashboard and list pages to Figma
type: feature
from: pm
to: web
priority: high
status: doing
assignee: claude
reviewer: none
parent: none
depends_on: []
branch: ccr-bf0f9944-6h1l31
worktree: none
scope: ["apps/web/src/app/admin/_components/**", "apps/web/src/components/admin/**", "apps/web/src/components/data-table/**", "apps/web/src/modules/dashboard/**"]
allowed_shared: []
created: 2026-10-27
updated: 2026-10-27
---

## What

Sidebar, top bar, dashboard and the shared page shell and data table rebuilt to the Figma frames, so every list page picks up the new look.

## Why / Context

Phase 3 step 1 of `.agents/plans/school-os-master-plan.md`. Figma: Dashboard `76:54336`, Students `76:56771`.

## Proposal or Ask

Restyle only; keep data, navigation, permissions and i18n unchanged.

## Scope

**In scope:**

- Sidebar, top bar, breadcrumb, search
- Dashboard header, stat cards, card chrome
- `AdminPageShell`, `DataTable*`, students status tones

**Out of scope:**

- Per-student class tags, attendance trend and last alert (need API fields, see `str-students-list-enrichment`)

## Validation

- `bun run lint` (0 warnings), `bun run typecheck`, web vitest.
- Playwright tour of the touched screens: no page, console or API errors; 390px check with no horizontal scroll.
- Screenshot compared with the Figma frame; node IDs recorded below.

## Resolution

PR #103 (open, CI running). Move to `done/` when merged.

