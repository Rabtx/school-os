---
id: str-web-states-and-command-search
title: Build the shared states, command search and menus
type: feature
from: ui-ux
to: web
priority: normal
status: done
assignee: claude
reviewer: none
parent: none
depends_on: ["str-web-reskin-shell-lists"]
branch: ccr-bf0f9944-6h1l31
worktree: none
scope: ["apps/web/src/components/**", "apps/web/src/app/admin/**", "apps/web/src/modules/**"]
allowed_shared: []
created: 2026-10-27
updated: 2026-10-28
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

Shared states live in `apps/web/src/components/states` and are used across the reskinned screens (Figma section `208:93911`):

- **Command search** (`209:105359`): ⌘K or Ctrl+K anywhere in admin, the sidebar Search row and the topbar search box open one palette over pages (the viewer's own navigation), classes and students (name, code or phone, active campus). Arrow keys, Enter, Escape. A student opens their profile panel. The "ask School OS" answer waits for Phase 6.
- **Confirm a risky action** (`208:106059`): `useConfirm()` / `useConfirmedAction()` with "What happens" rows, optional type-to-confirm and a footer note. Now in front of deleting an academic year, class (grade) or section (type to confirm), revoking an invite (replaces `window.confirm`), removing a passkey and signing out a device. Those deletes used to run on the first click and swallow errors; errors now show as a toast.
- **No results** (`208:93912`): `NoResults` with the active filters as removable chips and Clear filters, through a new `emptyState` slot on `DataTable`; used on Students.
- **No access** (`209:112623`): `NoAccess` replaces the 16 raw "missing permission" alerts across the app.
- **Offline and error** (`208:98960`): `OfflineBanner` in the admin layout while the browser is offline; `ErrorState` with Try again for failed sections.
- **Notifications** (`209:101673`): the bell opens a panel with what exists today: invites waiting for the viewer and invites they sent that are not accepted yet, plus an honest "all caught up". Leave, gate and AI items land with their phases.
- **Avatar and campus menu** (`209:108913`): the user menu lists campuses with active-year student counts and switches between them, for roles allowed to switch.
- **Success and undo** (`208:102491`): toasts moved to bottom center and already take an action; no current action has an undo endpoint yet, so none offers Undo.
- **Bulk select** (`208:109641`): delivered in PR #106 (row selection, footer bar, export of the selection).
- **Loading** (`208:96483`): `DataTable` skeleton rows already match the frame.

Checked with Playwright on the live app: command search finds and opens a student, the sidebar row opens it, no-results chips clear, the section delete stays locked until the name is typed, notifications and campus menu render, the offline banner appears and clears, a teacher sees No access on Members; shell, roles and settings tours clean at 1440 and 390.

