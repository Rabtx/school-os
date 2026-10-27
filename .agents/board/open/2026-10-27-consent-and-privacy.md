---
id: str-consent-and-privacy
title: Record guardian consent and log medical access
type: feature
from: pm
to: backend
priority: normal
status: open
assignee: none
reviewer: none
parent: none
depends_on: []
branch: none
worktree: none
scope: ["apps/nest-api/src/modules/consent/**", "apps/nest-api/src/modules/students/**"]
allowed_shared: []
created: 2026-10-27
updated: 2026-10-27
---

## What

Consent records per guardian and channel; every read of medical notes is logged and visible in the activity log.

## Why / Context

Phase 4 of `.agents/plans/school-os-master-plan.md`. Figma: Settings · Privacy & consent `232:144456`, Student profile · Medical access `210:132707`.

## Proposal or Ask

Messaging checks consent before sending; medical fields are only returned with an audited access reason.

## Scope

**In scope:**

- Consent model, checks, medical access log

**Out of scope:**

- Data export (Phase 9)

## Validation

- `bun run lint`, `bun run typecheck`, `bun run test` with a spec per new rule or endpoint.
- Migrations applied to a fresh database and to the previous schema in Docker.
- Playwright e2e for the web flow that uses it.

## Resolution

