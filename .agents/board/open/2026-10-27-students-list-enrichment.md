---
id: str-students-list-enrichment
title: Add class tags, attendance trend and last alert to the students list API
type: feature
from: web
to: backend
priority: normal
status: open
assignee: none
reviewer: none
parent: none
depends_on: []
branch: none
worktree: none
scope: ["apps/nest-api/src/modules/students/**", "apps/nest-api/src/modules/attendance/**"]
allowed_shared: []
created: 2026-10-27
updated: 2026-10-27
---

## What

Return section label, tags, present/total, 14-day attendance trend and last parent alert per student in one scoped list query, for the Figma Students table.

## Why / Context

Figma Students `76:56771` columns. Today the web joins enrollments client-side and has no attendance per student.

## Proposal or Ask

One aggregated query with record scope applied; paginate server-side; add the columns to the web table.

## Scope

**In scope:**

- List endpoint and web columns

**Out of scope:**

- Tag management UI

## Validation

- `bun run lint`, `bun run typecheck`, `bun run test` with a spec per new rule or endpoint.
- Migrations applied to a fresh database and to the previous schema in Docker.
- Playwright e2e for the web flow that uses it.

## Resolution

