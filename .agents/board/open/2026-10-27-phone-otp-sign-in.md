---
id: str-phone-otp-sign-in
title: Let parents sign in with a phone OTP
type: feature
from: mobile
to: backend
priority: high
status: open
assignee: none
reviewer: none
parent: none
depends_on: ["str-auth-session-hardening"]
branch: none
worktree: none
scope: ["apps/nest-api/src/modules/auth/**"]
allowed_shared: []
created: 2026-10-27
updated: 2026-10-27
---

## What

Phone number plus one-time code sign-in for parents, rate limited, linked to their guardian record.

## Why / Context

Phase 4 of `.agents/plans/school-os-master-plan.md`; required by the Expo parent app (Phase 5).

## Proposal or Ask

Reuse the SMS provider from `str-whatsapp-delivery`; codes hashed, short expiry, attempt limits.

## Scope

**In scope:**

- API and web sign-in

**Out of scope:**

- Mobile app screens (Phase 5)

## Validation

- `bun run lint`, `bun run typecheck`, `bun run test` with a spec per new rule or endpoint.
- Migrations applied to a fresh database and to the previous schema in Docker.
- Playwright e2e for the web flow that uses it.

## Resolution

