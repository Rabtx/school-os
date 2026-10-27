---
id: str-web-states-and-command-search
title: Build the shared states, command search and menus
type: feature
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
scope: ["apps/web/src/components/**", "packages/rabtx/src/**"]
allowed_shared: []
created: 2026-10-27
updated: 2026-10-27
---

## What

Loading, no results, offline and error, success and undo, confirm a risky action, bulk select, no access, notifications panel, ⌘K command search and the avatar and campus menu.

## Why / Context

Phase 3 step 4 of `.agents/plans/school-os-master-plan.md`. Figma: Principal · States section `208:93911` (`208:93912` to `209:118340`).

## Proposal or Ask

Build each state once as a shared component and use it on every screen; ⌘K opens the command search from the sidebar Search row.

## Scope

**In scope:**

- Shared state components and their adoption on the reskinned screens

**Out of scope:**

- "AI is not sure" and "WhatsApp disconnected" states (land with Phases 6 and 4)

## Validation

- `bun run lint` (0 warnings), `bun run typecheck`, web vitest.
- Playwright tour of the touched screens: no page, console or API errors; 390px check with no horizontal scroll.
- Screenshot compared with the Figma frame; node IDs recorded below.

## Resolution

