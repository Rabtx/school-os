---
id: str-auth-session-hardening
title: Harden sessions, tokens and CSRF coverage
type: risk
from: reviewer
to: backend
priority: high
status: open
assignee: none
reviewer: none
parent: none
depends_on: []
branch: none
worktree: none
scope: ["apps/nest-api/src/modules/auth/**", "apps/nest-api/src/modules/passkeys/**", "apps/nest-api/src/modules/mfa/**", "apps/nest-api/src/modules/social-auth/**"]
allowed_shared: []
created: 2026-10-27
updated: 2026-10-27
---

## What

Close the open session and token findings from the audit: in-flight access tokens survive logout and password change, no iss/aud claims, CSRF guard missing on several mutation controllers, Google sign-in auto-creates accounts, passkey begin reveals whether an account has a passkey.

## Why / Context

S-03, S-04, S-07, S-13, S-15, S-18, S-35, S-40, S-41, S-45, S-46, S-51, S-55, S-57 in `.agents/plans/audits/issue_01.md`; arch #6 in `arch_issues.md`. Parents will sign in on phones (Phase 4), so this must land first.

## Proposal or Ask

Verify each finding against the code, fix the real ones with a test each, and close the rest with a note. Done when every listed finding is fixed or closed with a reason in this card.

## Scope

**In scope:**

- `apps/nest-api/src/modules/auth/**`
- `apps/nest-api/src/modules/passkeys/**`
- `apps/nest-api/src/modules/mfa/**`
- `apps/nest-api/src/modules/social-auth/**`

**Out of scope:**

- Findings already fixed (see `.agents/plans/audits/triage.md`).

## Validation

- `bun run lint`, `bun run typecheck`, `bun run test`; e2e for touched web flows.
- Migrations applied to a fresh database and to the previous schema in Docker, where schema changes.

## Resolution

