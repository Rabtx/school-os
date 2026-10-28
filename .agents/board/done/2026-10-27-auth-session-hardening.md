---
id: str-auth-session-hardening
title: Harden sessions, tokens and CSRF coverage
type: risk
from: reviewer
to: backend
priority: high
status: done
assignee: claude
reviewer: none
parent: none
depends_on: []
branch: ccr-bf0f9944-6h1l31
worktree: none
scope: ["apps/nest-api/src/modules/auth/**", "apps/nest-api/src/modules/passkeys/**", "apps/nest-api/src/modules/mfa/**", "apps/nest-api/src/modules/social-auth/**"]
allowed_shared: []
created: 2026-10-27
updated: 2026-10-28
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

Each finding was checked against the code on main (d4180cb).

Fixed in this PR:

- **S-40** Password change now rotates the current session's refresh token in the same transaction that revokes the other sessions. Web gets the new cookie, native apps get `refreshToken` in the body and the mobile client stores it. A token copied before the change now reads as reuse. Tests in `auth.service.spec.ts`; checked live (new token 200, old token 401, web stays signed in after reload).
- **S-41** Passkey sign-in start answers an unknown email, an inactive account and an account without passkeys exactly like a request with no email (discoverable options, no error). Tests in `passkeys.service.spec.ts`.
- **S-35** The maintenance job deletes TOTP setups left unconfirmed for a day. While there: `beginTotpSetup` on an enabled factor overwrote it with a pending one, turning two-factor off without a code; it now refuses with `MFA_ALREADY_ENABLED`. Test in `mfa.service.spec.ts`; purge checked on the dev database.
- **S-18** `AUTH_GOOGLE_ALLOWED_DOMAINS` limits which email domains may create a new account with Google. Invited emails (a parent on Gmail) still can; existing accounts are unaffected. Empty keeps today's behaviour, which matches open password registration. Tests in `social-auth.service.spec.ts`.
- **S-13** Refresh records the session's current IP and user agent (the sessions list shows where it is now) and logs a warning when a different user agent uses the session. IP changes are normal on phones, so neither is treated as theft; refresh-token reuse detection remains the theft signal. Tests in `auth.service.spec.ts`.
- **S-55** Documented in `TenantGuard`: the path tenant need not be the token's active tenant; every request checks an active membership in the path tenant.

Already fixed before this PR:

- **S-03** `authenticateAccessToken` loads the session on every request, so logout, logout-all, revoke and password change cut access tokens off at once; a tenant switch changes the session's tenant, so an access token for the old tenant fails `AUTH_TENANT_CONTEXT_INVALID`.
- **S-04** Access tokens are signed with `iss` and `aud`, and verification requires both.
- **S-15** `AuthController`, `AuthMethodsController` and `AuthSecurityController` all use `CsrfGuard`. Tenant mutation endpoints authenticate only with the `Authorization` header (never a cookie), so a cross-site request cannot carry credentials; CSRF does not apply to them.
- **S-51** `authenticateAccessToken` rejects a token whose membership is no longer active or no longer matches the session.

Closed with a reason:

- **S-07 / arch #6** The access token lives only in memory (never storage), lasts 15 minutes and dies with its session; the refresh token is an httpOnly cookie. Script running in the page could call the API with the cookie anyway, so a cookie-held access token would not stop XSS. The reload refresh is single-flight since PR #108. Moving to server-side sessions belongs to `web-server-auth`.
- **S-45** `findSessionById` callers all check the owner (`session.userId === payload.sub`) or verify the refresh token hash; `findChallengeById` is reached only through a token whose hash is verified; passkey finish checks the credential belongs to the challenge's user.
- **S-46** Google-only users can set a password through forgot-password, which works for any active account.
- **S-57** The `SOCIAL_ACCOUNT_LINK_REQUIRED` answer needs a verified Google identity for that exact email, so only the email's owner can see it; it reveals nothing to anyone else.

