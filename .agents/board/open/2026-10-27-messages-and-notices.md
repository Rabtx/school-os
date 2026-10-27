---
id: str-messages-and-notices
title: Build messages, notices and announcements
type: feature
from: pm
to: backend
priority: high
status: open
assignee: none
reviewer: none
parent: none
depends_on: ["str-approvals-engine"]
branch: none
worktree: none
scope: ["apps/nest-api/src/modules/messages/**", "apps/nest-api/src/modules/notices/**", "apps/web/src/modules/messages/**"]
allowed_shared: []
created: 2026-10-27
updated: 2026-10-27
---

## What

Threads between school and families, notices and announcements with audiences and templates, and delivery and read state.

## Why / Context

Phase 4 of `.agents/plans/school-os-master-plan.md`. Figma: Messages `77:66449` and `141:27004`, Admin · Notices `185:56501`, Announcements `295:158046`.

## Proposal or Ask

Notices go through approvals; delivery goes through the outbox; parents only see threads for their linked children.

## Scope

**In scope:**

- Model, API, web screens

**Out of scope:**

- WhatsApp provider (see `str-whatsapp-delivery`)

## Validation

- `bun run lint`, `bun run typecheck`, `bun run test` with a spec per new rule or endpoint.
- Migrations applied to a fresh database and to the previous schema in Docker.
- Playwright e2e for the web flow that uses it.

## Resolution

