---
id: str-rabtx-ui-components
title: Move reskin building blocks into @rabtx/ui
type: chore
from: ui-ux
to: web
priority: normal
status: open
assignee: none
reviewer: none
parent: none
depends_on: ["str-web-reskin-shell-lists"]
branch: none
worktree: none
scope: ["packages/rabtx/src/**", "apps/web/src/**"]
allowed_shared: []
created: 2026-10-27
updated: 2026-10-27
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

