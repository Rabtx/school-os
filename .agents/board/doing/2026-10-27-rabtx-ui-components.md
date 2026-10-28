---
id: str-rabtx-ui-components
title: Move reskin building blocks into @rabtx/ui
type: chore
from: ui-ux
to: web
priority: normal
status: doing
assignee: claude
reviewer: none
parent: none
depends_on: ["str-web-reskin-shell-lists"]
branch: ccr-bf0f9944-6h1l31
worktree: none
scope: ["packages/rabtx/src/**", "apps/web/src/**"]
allowed_shared: []
created: 2026-10-27
updated: 2026-10-28
---

## What

Promote the sidebar nav item, stat card, filter pill, data table, tabs, segmented control, empty state and avatar into `@rabtx/ui` with docs and a spec each.

## Why / Context

Phase 3 step 5 of `.agents/plans/school-os-master-plan.md`; the parent and teacher phone apps (Phase 5) need the same tokens and parts.

## Proposal or Ask

Extract as the screens stabilise; web imports from `@rabtx/ui` instead of local copies.

## Scope

**In scope:**

- Components listed above

**Out of scope:**

- Mobile-only components

## Validation

- Package lint, typecheck and specs; web tour unchanged.

## Resolution

Progress:

- PR 1: avatar, stat card, meter and trend, tabs, segmented control and empty state move into `@rabtx/ui` (`./avatar`, `./stat`, `./meter`, `./tabs`, `./segmented`, `./empty-state`). Each has a `*.styles.ts` of Tailwind classes on `--rx-*` tokens, a React wrapper, a spec and a page in the `/ui` gallery. The segmented control is a real radio group (roving tab stop, arrow keys, Home and End). Web now imports them: `InitialsAvatar` and `attendance-viz` are deleted, `ListPage` renders `TabNav`, roll call uses `SegmentedControl`, the dashboard `StatCard` wraps the package card with its count-up, and `StateMessage` wraps `EmptyState`.
- Next: filter pill, data table and sidebar nav item.
