---
id: str-whatsapp-delivery
title: Deliver alerts and messages over WhatsApp with SMS fallback
type: feature
from: pm
to: backend
priority: high
status: open
assignee: none
reviewer: none
parent: none
depends_on: ["str-messages-and-notices"]
branch: none
worktree: none
scope: ["apps/nest-api/src/modules/notifications/**"]
allowed_shared: []
created: 2026-10-27
updated: 2026-10-28
---

## What

Provider interface with Meta Cloud API first: approved English and Urdu templates, delivery and read receipts, SMS fallback and retries through the outbox.

## Why / Context

Phase 4 of `.agents/plans/school-os-master-plan.md`. Feeds the dashboard parent-alerts card and the sidebar WhatsApp status card (Figma `76:54336`, state `209:118340`).

## Proposal or Ask

Webhook for receipts with signature check; connection status endpoint for the sidebar card.

## From the rules engine

The attendance policy (`apps/nest-api/src/modules/rules`) already decides the timing; this card runs it on a schedule:

- Auto-mark absent: at `isAutoAbsentDue(policy, localMinutes)`, mark still-unmarked students absent (source `rule`, audited).
- Absence alerts: queue one per absent student at `absenceAlertAt(policy, sessionDate, timeZone, quietHours)`, which already moves sends out of quiet hours.
- Gate scans: when a scan arrives, `classifyScan(policy, localMinutes)` gives present, late or no change.

## Scope

**In scope:**

- Provider, templates, receipts, status card

**Out of scope:**

- Voice calls

## Validation

- `bun run lint`, `bun run typecheck`, `bun run test` with a spec per new rule or endpoint.
- Migrations applied to a fresh database and to the previous schema in Docker.
- Playwright e2e for the web flow that uses it.

## Resolution

