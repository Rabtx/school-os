# School OS — Issue Tracker (issue_01)

**Generated:** 2026-07-24
**Branch audited:** `feat/notifications-foundation`
**Scope:** `apps/nest-api` (NestJS 11 + Drizzle + PostgreSQL), `apps/web` (Next.js 16 + React 19), database schema and migrations.
**Method:** Three parallel deep audits (API + web + schema) followed by direct source verification of the top findings.

This file collects every real issue found in the codebase. Each item has a stable id (`S-01`, `H-12`, `M-03`, `L-08`, `W-04`, …) so it can be referenced from commits, PRs, and follow-up issues. Severity legend:

- **C — Critical** (security, data corruption, or production outage risk)
- **H — High** (real bug, race, N+1, or security weakness with mitigation in depth)
- **M — Medium** (correctness, reliability, performance, missing constraint)
- **L — Low** (code quality, minor UX, documentation, minor leaks)

> **Reading order recommendation:** read the **Top 25** in §1 first, then pick items from the **Quick Wins** checklist in §7. Everything else is for later.

---

## Table of Contents

1. [Top 25 — fix this sprint](#1-top-25--fix-this-sprint)
2. [Critical issues (severity C)](#2-critical-issues-severity-c)
3. [High-priority issues (severity H)](#3-high-priority-issues-severity-h)
4. [Medium-priority issues (severity M)](#4-medium-priority-issues-severity-m)
5. [Low-priority issues (severity L)](#5-low-priority-issues-severity-l)
6. [Web app issues (apps/web)](#6-web-app-issues-appsweb)
7. [Quick wins checklist](#7-quick-wins-checklist)
8. [Verification notes](#8-verification-notes)

---

## 1. Top 25 — fix this sprint

These are the items with the worst blast-radius and the lowest cost-to-fix. Triage every one before merging anything else to `main`.

| # | ID | Sev | Area | One-line |
|---|----|-----|------|----------|
| 1 | S-01 | C | Nest / notifications | Outbox `claimPendingBatch` is not inside a transaction — `FOR UPDATE` is a no-op, workers double-dispatch events |
| 2 | S-02 | C | Nest / auth | Refresh-token reuse does NOT cascade-revoke all user sessions (RFC 6819 §5.2.2.3) |
| 3 | S-03 | C | Nest / auth | Logout / `changePassword` / `switchTenant` do not invalidate the in-flight access token (15-min window) |
| 4 | S-04 | C | Nest / crypto | JWT has no `iss` / `aud` claims; same secret reused across services would cross-accept tokens |
| 5 | S-05 | C | Nest / authorization | `tenant.guard.ts` still calls `ensureCacheFresh()` on every request — the "fix" was incomplete |
| 6 | S-06 | C | Web / auth | `RequireAuth` is a client-side gate; RSC payload for `/admin/*` is streamed to unauthenticated visitors |
| 7 | S-07 | C | Web / auth | JWT access token held in zustand client memory — any XSS can exfiltrate it |
| 8 | S-08 | C | Nest / members | `assertCanManageTarget` allows a vice_principal to promote a teacher to vice_principal |
| 9 | S-09 | C | Nest / tenants | `TenantGuard` checks tenant existence before membership — leaks which UUIDs are valid tenants |
| 10 | S-10 | H | Schema / DRIFT | `homework_recipients` and `assessment_recipients` missing unique indexes in the Drizzle schema (DB has them, schema doesn't) |
| 11 | S-11 | H | Schema / DRIFT | `roles` partial unique indexes don't match the schema |
| 12 | S-12 | H | Schema / DRIFT | `students.membership_id` partial unique index not declared in the schema |
| 13 | S-13 | H | Nest / sessions | No IP / User-Agent binding on sessions; cookie theft is undetectable |
| 14 | S-14 | H | Nest / invites | Invite accept flow is not atomic — membership activation and invite consumption in separate awaits (TOCTOU) |
| 15 | S-15 | H | Nest / CSRF | `CsrfGuard` not applied to `auth-security.controller.ts` or most tenant mutation endpoints |
| 16 | S-16 | H | Nest / schema | Cascading deletes from `users` wipe memberships and all `createdByMembershipId` provenance across tenants |
| 17 | S-17 | H | Nest / auth | `consumePasswordTiming` is a fixed 200 ms `setTimeout`, not a real bcrypt compare — enumeration & DoS surface |
| 18 | S-18 | H | Nest / social-auth | Google login auto-creates federated accounts based on `email_verified === true`; no domain allow-list |
| 19 | S-19 | H | Nest / schema | No cleanup job for expired auth challenges, sessions, webauthn challenges, recovery codes, or stale invites |
| 20 | S-20 | H | Nest / repository | `members.listMembersForTenant` returns suspended memberships — leaks in admin UI and leave-tenant flow |
| 21 | W-01 | H | Web / forms | `Score` input in `AssessmentDetailPage` accepts `NaN` and out-of-range numbers |
| 22 | W-02 | H | Web / forms | Domain forms (homework, assessments) have no client-side zod validation despite backend schemas |
| 23 | W-03 | M | Web / security | Dev OTP surfaced in URL via `?devCode=…` — leaks via `Referer`, history, password-manager backups |
| 24 | W-04 | M | Web / memory | Object URL leak in `admit-student-wizard` when removing a photo |
| 25 | S-21 | M | Nest / homework | `homeworkAppliesToStudents` triggers N+1 enrollment fetch in a loop; per-page query count explodes for parents with multiple children |

---

## 2. Critical issues (severity C)

### S-01 — Outbox `claimPendingBatch` is not inside a transaction (double-dispatch race)
- **Files:** `apps/nest-api/src/modules/notifications/outbox.repository.ts:11-35`
- **Verified:** yes — read the file directly.
- **Issue:** `claimPendingBatch` builds a `select ... for('update')` inside an `update ... where id IN (subquery)`, but the whole statement runs **outside** `db.transaction(...)`. In Postgres, `FOR UPDATE` is meaningless without a transaction — the lock is released before the `UPDATE` runs. Two polling workers (or two timers in the same process) can both transition the same `pending` row to `processing` and dispatch the event twice.
- **Plus:** `markProcessed` / `markFailed` filter only by `id`, not by `status = 'processing'`. A crash between claim and dispatch leaves the row stuck in `processing` forever — no reaper exists.
- **Fix:**
  1. `return this.database.db.transaction(async (tx) => tx.update(outboxEvents)... )`
  2. Switch to `for('update', { skipLocked: true })` so multiple workers don't block each other.
  3. Add `attempts` and `next_attempt_at` columns + a backoff schedule.
  4. Filter the mark-* updates with `and(eq(outboxEvents.id, id), eq(outboxEvents.status, 'processing'))`.
  5. Add a `@Cron` reaper that re-queues rows stuck in `processing` for more than N minutes.

### S-02 — Refresh-token reuse does NOT cascade-revoke all user sessions
- **Files:** `apps/nest-api/src/modules/auth/auth.service.ts:204-230` and `:240-246`; `auth.repository.ts:130-180`
- **Issue:** When a presented refresh token fails verification, only the **current** session is revoked (`reason: 'refresh_token_reuse'`). Per RFC 6819 §5.2.2.3 and OWASP ASVS V3.5, refresh-token reuse should be treated as theft and **all** sessions for that user should be revoked, forcing re-authentication.
- **Fix:** on `verifyRefreshToken` failure, call `this.authRepository.revokeAllSessions(session.userId, 'refresh_token_reuse_detected')` and require re-auth before re-issuing.

### S-03 — Logout / `changePassword` / `switchTenant` do not invalidate the in-flight access token
- **Files:** `apps/nest-api/src/modules/auth/auth.service.ts:204-294`; `auth-crypto.service.ts:147-153`
- **Issue:** `authenticateAccessToken` checks signature + `exp` only, not the session. With `JWT_ACCESS_EXPIRES_IN=15m`, a stolen access token survives all of: logout, password change, and tenant switch.
- **Fix:** add a `version` (or `ver`) field on the session, include it in the JWT, and reject tokens whose `ver` is older than `session.lastUsedAt`. Alternative: maintain a `jti` denylist in Redis populated on `logout` / `changePassword` / `switchTenant` / user deactivation.

### S-04 — JWT has no `iss` / `aud` claims
- **Files:** `apps/nest-api/src/modules/auth/auth-crypto.service.ts:147-153`
- **Issue:** `signAccessToken` emits no `iss` or `aud`. `jose`'s `jwtVerify` accepts arbitrary claims by default. If the same `jwtSecret` is ever reused in another service or environment, tokens cross-accept.
- **Fix:** add `iss: 'school-os-api'` and `aud: 'school-os-web'` (or per-platform) to `signAccessToken`, and require both in `verifyAccessToken`.

### S-05 — `tenant.guard.ts` still calls `ensureCacheFresh()` on every request
- **Files:** `apps/nest-api/src/modules/tenants/tenant.guard.ts:48`
- **Verified:** yes — the line `await this.permissions.ensureCacheFresh();` is still there.
- **Issue:** the recent commit `fix(nest-api): remove forced permission cache refresh` removed the *unconditional* refresh but the guard still awaits `ensureCacheFresh()` on every authenticated request. With a 5 s TTL and high QPS, this becomes a full role-permission join every 5 s of traffic on every request. It is also on the hot path: every `tenants/:id/*` request hits it.
- **Fix:** drop the call from the guard. Load once on `OnModuleInit` and listen for `rolePermissions` writes to invalidate. Accept a small (≤5 s) window for permission changes to propagate.

### S-06 — `RequireAuth` is a client-side gate; RSC payload is streamed to unauthenticated visitors
- **Files:** `apps/web/src/modules/auth/components/require-auth.tsx:8-31`; `apps/web/src/app/admin/layout.tsx:11`
- **Verified:** yes — no `middleware*` files exist anywhere in `apps/web`.
- **Issue:** `RequireAuth` is `"use client"`. It only reads `user` from the zustand store, which is empty until `SessionProvider` calls `authService.refresh()` on the client. The RSC payload for `/admin/*` is streamed to unauthenticated visitors before the login redirect fires. **Sensitive PII (students, assessments, attendance) leaks through the RSC payload.**
- **Fix:**
  1. Add `apps/web/middleware.ts` that calls `authService.refresh()` server-side and redirects to `/login?next=…` for unauthenticated `/admin/**` and `/chat/**` traffic.
  2. Better: convert the admin layout to a server component that awaits a server-side `getSession()` and calls `redirect()` on missing/expired session; mount `SessionProvider` only inside the protected tree.

### S-07 — JWT access token held in zustand client memory
- **Files:** `apps/web/src/store/session-store.ts:14`; `apps/web/src/store/session-provider.tsx:43-47`; `apps/web/src/lib/api/client.ts:74`
- **Issue:** `useSessionStore.token` is in zustand state. Any XSS (third-party shadcn primitive, future rich-text field, compromised `motion` / `@hugeicons` chain) can read it via `useSessionStore.getState().token` and exfiltrate the bearer.
- **Fix:** move the access token into an `HttpOnly` + `Secure` + `SameSite=Lax` cookie set by the Nest API response; have the API client rely on `credentials: "include"`; keep only the `User` object in the zustand store.

### S-08 — `assertCanManageTarget` allows a vice_principal to promote a teacher to vice_principal
- **Files:** `apps/nest-api/src/modules/members/members.service.ts:395-425`; `apps/nest-api/src/modules/members/members.capabilities.ts:42-53`
- **Verified:** yes — read both files directly.
- **Issue:** `canManageTarget` (capabilities.ts:42-53) restricts **managing** a user (e.g. principal cannot manage principal). `assertCanManageTarget` (members.service.ts:407-425) adds **role-transition** checks for principal→admin/principal, admin→owner/principal/admin. There is **no check** for `actorRole === 'vice_principal' && nextRole === 'vice_principal'`. A vice_principal can therefore promote a teacher to vice_principal.
- **Fix:** add `if (nextRole === 'vice_principal' && actorRole !== 'principal' && actorRole !== 'owner') throw` to `assertCanManageTarget`. Consider consolidating the two functions into a single `canActorManage(actorRole, targetRole, nextRole?)` helper.

### S-09 — `TenantGuard` checks tenant existence before membership (UUID enumeration)
- **Files:** `apps/nest-api/src/modules/tenants/tenant.guard.ts:34-44`
- **Verified:** yes — read the file directly.
- **Issue:** order is (1) `findById` + `isActive` check, (2) `requireActiveMembership`. A non-member hitting `/tenants/<valid-uuid>` gets `TENANT_INACTIVE`; a non-member hitting a non-existent UUID gets `TENANT_NOT_FOUND`. The order leaks which UUIDs are valid tenants.
- **Fix:** call `requireActiveMembership` first; check the tenant's active status from the membership's tenant record. Return the same error code (`TENANT_NOT_FOUND`) for both cases.

---

## 3. High-priority issues (severity H)

### S-10 — `homework_recipients` and `assessment_recipients` missing unique indexes in the Drizzle schema
- **Files:** `apps/nest-api/src/database/schema/homework-recipients.schema.ts:14-29`; `apps/nest-api/src/database/schema/assessment-recipients.schema.ts:14-29`
- **Issue:** migration `0018_homework_assessments_v2.sql:23,35` defines `homework_recipients_homework_student_unique` and `assessment_recipients_assessment_student_unique` UNIQUE indexes on `(homework_id, student_id)` and `(assessment_id, student_id)`. The current schema files declare **no unique indexes at all**. Running `drizzle-kit generate` will produce a destructive diff. Repos that rely on this constraint (e.g. `assessments.repository.ts:238-258` `delete-then-insert` inside a transaction) will silently lose the dedup guarantee under concurrency.
- **Fix:** add `uniqueIndex('homework_recipients_homework_student_unique').on(table.homeworkId, table.studentId)` and the assessment equivalent.

### S-11 — `roles` partial unique indexes don't match the schema
- **Files:** `apps/nest-api/src/database/schema/roles.schema.ts:21-25`
- **Issue:** migration `0006_roles_permissions.sql:25-26` creates two **partial** unique indexes: `roles_platform_code_unique` (`code WHERE tenant_id IS NULL`) and `roles_tenant_code_unique` (`(tenant_id, code) WHERE tenant_id IS NOT NULL`). The schema declares a single non-partial `uniqueIndex('roles_tenant_code_idx').on(table.tenantId, table.code)`. The partial-NULL-only invariant is not expressed in the schema; Drizzle will emit a divergent migration on next generate.
- **Fix:** use Drizzle's `.where(sql\`tenant_id IS NULL\`)` for the platform-role unique, and a second unique on `(tenantId, code)` with `.where(sql\`tenant_id IS NOT NULL\`)`.

### S-12 — `students.membership_id` partial unique index not declared in the schema
- **Files:** `apps/nest-api/src/database/schema/students.schema.ts:35`
- **Issue:** migration `0019_student_membership_link.sql:7-9` creates `students_membership_id_unique` as `UNIQUE INDEX ... WHERE "membership_id" IS NOT NULL`. The schema declares `membershipId: uuid('membership_id').references(...)` with **no `uniqueIndex` declared**. Drizzle will not regenerate this partial unique correctly — it would emit a full unique constraint that conflicts with the existing partial one.
- **Fix:** add `uniqueIndex('students_membership_id_unique').on(table.membershipId).where(sql\`membership_id IS NOT NULL\`)`.

### S-13 — No IP / User-Agent binding on sessions
- **Files:** `apps/nest-api/src/database/schema/sessions.schema.ts:23-31`; `apps/nest-api/src/modules/auth/auth.service.ts`
- **Issue:** the `sessions` table stores `userAgent` and `ipAddress` for *informational* display in `listSessions`, but `auth.service.refresh` and `authenticateAccessToken` never compare them to the current request. A stolen refresh cookie from a different IP / UA works perfectly. Combined with S-02, the only theft signal is refresh-reuse detection.
- **Fix:** add an `ipAddress` / `userAgent` check in `auth.service.refresh` and `authenticateAccessToken`; treat mismatches as theft (revoke all sessions for that user). At minimum, log mismatches to a future audit log.

### S-14 — Invite accept flow is not atomic (TOCTOU)
- **Files:** `apps/nest-api/src/modules/members/members.service.ts:127-250`; `apps/nest-api/src/modules/membership-invites/membership-invites.service.ts:79-92`
- **Issue:** `acceptInviteRecord` does membership activation in one await, then invite consumption in another:
  1. `activateInviteForUser` → calls `memberships.update(...)`
  2. then `memberships.updateInvite(invite.id, { status: 'accepted', acceptedAt, membershipId })`
  This is a classic TOCTOU. The unique index on `memberships(tenantId, userId)` would catch a duplicate creation, but if the user's account was suspended in between, the second call could fail or land on a different active user.
- **Fix:** wrap the entire `acceptInviteRecord` in a `db.transaction` that does `UPDATE membershipInvites SET status='accepted' WHERE id=$1 AND status='pending' RETURNING ...` and aborts if no row is returned. Do the membership insert/update inside the same transaction.

### S-15 — `CsrfGuard` not applied to `auth-security.controller.ts` or most tenant mutation endpoints
- **Files:** `apps/nest-api/src/modules/auth/auth-security.controller.ts:28`; various
- **Issue:** the `CsrfGuard` is applied at the controller level to `AuthController` and `AuthMethodsController` only. `AuthSecurityController` and tenant mutation controllers have only `JwtAuthGuard`. Defense in depth: even if `X-Requested-With` + Origin is not a strong CSRF defense by itself, missing it entirely weakens the layered approach.
- **Fix:** add `@UseGuards(CsrfGuard)` to all authenticated mutation controllers, or better, make `CsrfGuard` a global `APP_GUARD` with `@Public()` / `@SkipCsrf()` opt-outs.

### S-16 — Cascading deletes from `users` wipe memberships and all `createdByMembershipId` provenance
- **Files:** `apps/nest-api/src/database/schema/users.schema.ts:31-36`; cascades in `memberships.schema`, `staff_profiles`, `section_subjects.teacher_membership_id`, `attendance_marks.marked_by_membership_id`, `audit_logs.actor_membership_id`, `assessments/homework.created_by_membership_id`
- **Issue:** deleting a user account will permanently destroy teacher history, mark attribution, audit trails, and `created_by` provenance — **including across all tenants the user belonged to**, not just one.
- **Fix:** change `memberships.user_id` to `ON DELETE RESTRICT` (or `SET NULL` with cleanup); keep `users` cascade to auth-only tables (`sessions`, `passkeys`, `totp_factors`, `auth_challenges`, `auth_identities`, `user_profiles`). Add an explicit `softDeleteUser` service path that flips `users.is_active = false` and `memberships.status = 'suspended'` instead of hard-deleting.

### S-17 — `consumePasswordTiming` is a 200 ms `setTimeout`, not a real bcrypt compare
- **Files:** `apps/nest-api/src/modules/auth/auth.service.ts:107-134, 684-687`
- **Issue:** when the user does not exist (`user` is null), the code does `await this.crypto.hashPassword(body.password)` and discards the result. When the user exists with `passwordHash == null` (federated-only), `consumePasswordTiming` waits 200 ms and returns `false`. The two paths are not equal-latency:
  - The user-not-found branch uses `bcrypt.hash` (not `compare`); latency is ~200-300 ms.
  - The federated-only branch is exactly 200 ms (`setTimeout`) and never touches bcrypt.
  - A known user does a real `bcrypt.compare` (~250 ms at 12 rounds).
  - An attacker can therefore distinguish (a) email exists, (b) email exists with no password set, (c) email does not exist. The recent "fix bcrypt timing dos" commit was incomplete.
- **Fix:**
  1. Pre-compute a dummy bcrypt hash (`$2b$12$...`) at module init.
  2. In both fallback paths, call `bcrypt.compare(password, DUMMY_HASH)` and discard the result.
  3. Delete `consumePasswordTiming`.

### S-18 — Google login auto-creates federated accounts; no domain allow-list
- **Files:** `apps/nest-api/src/modules/social-auth/social-auth.service.ts:30-58, 73-99`
- **Issue:** `authenticateGoogle` checks `payload.email_verified !== true` and rejects unverified Google emails. However, Google Workspace allows an attacker to **create** an account on their own Google Workspace tenant with `email_verified=true` and a matching email address (e.g. `victim@school.com` if they control `school.com`'s Google Workspace). For new emails, the system silently creates an account.
- **Fix:** for non-allow-listed domains, require admin invite or email-verification round-trip (e.g. send a 6-digit code to the email first). Add `AUTH_GOOGLE_DOMAIN_ALLOWLIST` env var.

### S-19 — No cleanup job for expired auth challenges, sessions, webauthn challenges, recovery codes, or stale invites
- **Files:** every module under `apps/nest-api/src/modules/auth`, `passkeys`, `mfa`, `memberships`
- **Issue:** searched all modules — no scheduled job deletes `authChallenges` past `expires_at`, no job purges revoked/expired `sessions`, no job deletes consumed `webauthn_authentication_challenges`, no job deletes `totp_recovery_codes` for users that no longer have MFA, and the only expiry helper `MembershipsRepository.expireStaleInvites()` (memberships.repository.ts:243-250) is defined but **never called**. Tables grow unbounded; indexes (`auth_challenges_expires_at_idx`, `sessions_expires_at_idx`, `webauthn_auth_challenges_expires_at_idx`) become ineffective as the histograms skew.
- **Fix:** add a Nest `@Cron` job in a `MaintenanceService` that calls `delete().where(and(eq(status,'pending'), lt(expiresAt, now())))` for each table. Call `expireStaleInvites()` on a schedule.

### S-20 — `members.listMembersForTenant` returns suspended memberships
- **Files:** `apps/nest-api/src/modules/memberships/memberships.repository.ts:72-87, 89-101`
- **Issue:** `listMembersForTenant` returns suspended members in the admin UI. `countActiveOwners` correctly filters by `status='active'`. Inconsistent contract.
- **Fix:** add `eq(memberships.status, 'active')` to `listMembersForTenant` by default and offer an opt-in `includeSuspended` flag.

### S-21 — `homeworkAppliesToStudents` triggers N+1 enrollment fetch
- **Files:** `apps/nest-api/src/modules/homework/homework.service.ts:281-296`; `listForLinkedStudents:226-233`
- **Issue:** for each student id, the code calls `this.students.listEnrollments(tenantId, { studentId })` — one query per student. For a parent with 5 children, that's 5 round-trips per homework item. Combined with `listRecipientStudentIds` for `selected_students` mode (another query per homework, line 294), a single page load produces tens-to-hundreds of queries. Plus `buildDetailResponse` calls `listStudentsInSections` per homework to compute `recipientCount` (line 312, 357) — N queries for N different sections.
- **Fix:** batch everything. `enrollments` has an index on `(tenantId, studentId, sectionId)`. Fetch all enrollments for the studentIds set in one query, then bucket in memory. Same for `listStudentsInSections` — pass all sectionIds once, groupBy in memory.

### S-22 — `staff.service.listTeachers` triggers 2 queries per teacher
- **Files:** `apps/nest-api/src/modules/staff/staff.service.ts:57-75`
- **Issue:** the recent "fix(nest-api) ... optimize teacher detail query" commit message claims a fix, but `listTeachers` still does `Promise.all` of two queries *per teacher row* inside `rows.map`. For 100 teachers, that's 200 queries per page load.
- **Fix:** build a `Map<membershipId, count>` for homeroom sections and another for subject assignments by querying once with `groupBy(teacherMembershipId)`.

### S-23 — `attendance.confirmAllPresent` and `markAttendance` perform N+1 student lookups
- **Files:** `apps/nest-api/src/modules/attendance/attendance.service.ts:131-144`
- **Issue:** for each `mark` in `input.marks`, the service calls `this.students.findStudentById(tenantId, mark.studentId)` — one query per student. With 40 students per class, that's 40 sequential lookups. The `enrolled` set is computed once (good), but the per-student existence check is redundant (we already have the enrollment set; if the student is in `activeStudentIds`, the student row exists).
- **Fix:** drop the per-student lookup; rely on the membership-in-tenant and the enrollment check. Or batch-lookup all student ids in one query.

### S-24 — Outbox race: no idempotency guard on `markProcessed` / `markFailed`
- **Files:** `apps/nest-api/src/modules/notifications/outbox.repository.ts:18, 38-48`
- **Issue:** see S-01. In addition, the `markProcessed` and `markFailed` updates filter only by `id`, not by `status = 'processing'`. A handler that retries (e.g. webhook redelivery, an at-least-once dispatcher) can call `markProcessed` twice and emit duplicate side-effects.
- **Fix:** filter the mark-* updates with `and(eq(outboxEvents.id, id), eq(outboxEvents.status, 'processing'))`.

### S-25 — `audit_logs` is append-only at the application layer but unprotected at the DB layer
- **Files:** `apps/nest-api/src/database/schema/audit-logs.schema.ts:11-29`; `apps/nest-api/src/modules/attendance/attendance.repository.ts:159-179`
- **Issue:** no `tenantId` + `createdAt` composite index, no DB-level append-only enforcement (no `REVOKE UPDATE, DELETE` for the app role). The `audit_logs_resource_idx` exists, but `(tenant_id, created_at DESC)` is the expected query pattern for any tenant-scoped audit viewer — currently the query will do a sort.
- **Fix:** add `index('audit_logs_tenant_created_idx').on(table.tenantId, table.createdAt)`. Optionally: `REVOKE UPDATE, DELETE ON audit_logs FROM school_os_app` and grant only via a separate `school_os_audit_writer` role, OR use an INSERT-only view.

### S-26 — `tenants` is hard-deleted by cascade chain; soft-delete does nothing
- **Files:** `apps/nest-api/src/database/schema/tenants.schema.ts:13`; all referencing tables
- **Issue:** `tenants.schema.ts:13` declares `deletedAt`, but every referencing table has `onDelete: 'cascade'`. The soft-delete on `tenants` does nothing — rows survive. Worse, there is no service that converts the soft-delete into a real purge, so soft-deleted tenants still surface in `tenants.id` joins.
- **Fix:** add a `purgeTenant(id)` job that hard-deletes in dependency order; or change the relevant FKs to `ON DELETE RESTRICT` and document tenant archival as a manual operation.

### S-27 — `assessments.createdByMembershipId` and `homework_assignments.createdByMembershipId` use `ON DELETE RESTRICT`
- **Files:** `apps/nest-api/src/database/schema/assessments.schema.ts:50-53`; `apps/nest-api/src/database/schema/homework-assignments.schema.ts:43-46`
- **Issue:** combined with S-16, deleting any membership that created an assessment or homework is **blocked**. If the membership is the *owner*, the owner can't leave the tenant — and there is no path to reassign or null out `createdByMembershipId`.
- **Fix:** switch to `ON DELETE SET NULL` and make the columns nullable. Or add a `reassignCreator(assessmentId, newMembershipId)` admin endpoint.

### S-28 — `assessments.upsertResults` uses select-then-insert without unique index
- **Files:** `apps/nest-api/src/modules/assessments/assessments.repository.ts:175-218`
- **Issue:** the loop runs inside `db.transaction(...)` but does `select` then `update` (or `insert`) without `for('update')`. Two concurrent grade-entry calls can both observe "no existing" and both `insert`, causing a unique-constraint 23505 that bubbles up as a 500. Likely missing the `(assessmentId, studentId)` unique index — verify in migration `0018`.
- **Fix:** add `uniqueIndex('assessment_results_assessment_student_unique').on(assessmentId, studentId)` and switch to `INSERT ... ON CONFLICT DO UPDATE`.

### S-29 — Homework/Assessments controllers don't validate query params
- **Files:** `apps/nest-api/src/modules/homework/homework.controller.ts:37-39`; `apps/nest-api/src/modules/assessments/assessments.controller.ts:42-45, :52-56`; `apps/nest-api/src/modules/timetable/timetable.controller.ts:18-37`; `apps/nest-api/src/modules/attendance/attendance.controller.ts:100`
- **Issue:** the list query schemas (`listHomeworkQuerySchema`, `listAssessmentsQuerySchema`, `plannerAssessmentsQuerySchema`, `dateSchema`) exist but are **never applied** — the controllers rely on the global pipe, which only fires on `@Body()`, not `@Query()`. Passing `?status=garbage&from=not-a-date` to `/assessments/planner?from=2025-01-01&to=abc` is passed straight to drizzle; `to=abc` will throw a 500 from Postgres ("invalid input syntax for type date"). Small DoS and noisy error.
- **Fix:** apply `@Query(new ZodValidationPipe(listAssessmentsQuerySchema))` etc., or extract query validation in the service.

### S-30 — List endpoints have no pagination
- **Files:** `homework.service.ts:34-58`, `assessments.service.ts:38-64`, `staff.controller.ts:33-41`, `members.service.ts:41-112`, `students.service.ts`
- **Issue:** a tenant with 10,000 homeworks or 10,000 assessments returns all of them. The codebase has a `paginationSchema` (`apps/nest-api/src/common/pagination.ts`) with `page` and `limit` (max 100), but **no list endpoint uses it**. The schema is exported and unused.
- **Fix:** apply `paginationSchema` to all list endpoints.

### S-31 — Session `userAgent` stored as unbounded `text`
- **Files:** `apps/nest-api/src/database/schema/sessions.schema.ts:19-20`
- **Issue:** `userAgent: text('user_agent')` — unbounded text in the DB. Although HTTP servers cap header sizes, a malicious client can set a large `User-Agent`. The `userAgent` is rendered into the `listSessions` response, so an attacker can inject a very long string that the JSON response carries around.
- **Fix:** cap at write time: `request.get('user-agent')?.slice(0, 512) ?? null` and change the column to `varchar(512)`.

### S-32 — AI service `parseAcademicDraft` has no size cap
- **Files:** `apps/nest-api/src/modules/ai/ai.service.ts:67-100`
- **Issue:** `parseAcademicDraft` does `trimmed.slice(jsonStart, jsonEnd + 1)` then `JSON.parse`. The LLM upstream `assist` returns the full reply (no cap). `JSON.parse` of a megabyte-long string is slow.
- **Fix:** cap `reply` length in `ai.client.ts` (`isAssistResponse` only checks shape, not length) and reject replies > N chars with a 502.

### S-33 — `audit_logs.resource_id` set to empty string when the mark insert silently failed
- **Files:** `apps/nest-api/src/modules/attendance/attendance.repository.ts:167-187`
- **Issue:** if `mark?.id` is `undefined` (insert/update returned no row), the audit log gets `resource_id: ''` — an invalid UUID. The migration enforces UUID type, so this would throw at insert time and roll back the *whole* transaction (including the mark inserts and outbox events). A partial failure aborts the entire bulk mark operation.
- **Fix:** skip the audit log row if `mark?.id` is missing, or generate a placeholder UUID and log a separate "missing" event. Ensure `insert().values().returning()` always returns when the insert succeeded, or handle the empty-array case explicitly.

### S-34 — `timetable.repository.countEntries` is broken
- **Files:** `apps/nest-api/src/modules/timetable/timetable.repository.ts:43-50`
- **Issue:** `countEntries(tenantId)` selects `timetableEntries.id` (not `count(*)`), then returns `row ? 1 : 0`. So it always returns 1 if *any* entry exists, 0 otherwise. Currently unused — dead code with a bug.
- **Fix:** either use `count(*)` and return the number, or remove the function.

### S-35 — Pending TOTP factors are never cleaned up on abandon
- **Files:** `apps/nest-api/src/modules/mfa/mfa.service.ts:79-100`
- **Issue:** `beginTotpSetup` returns the unencrypted TOTP secret in the response. The encrypted version is also stored. If the user calls `beginTotpSetup` twice without completing `confirmTotpSetup`, the pending `secretEncrypted` is overwritten (correct), but there is no cleanup of pending setups — a user who started setup and walked away leaves a pending `isEnabled=false` row with a valid encrypted TOTP secret indefinitely. A privileged DB attacker (e.g. SQLi elsewhere) could retrieve it.
- **Fix:** add a `cancelTotpSetup` flow and a sweeper that deletes pending TOTP factors older than 24 h.

### S-36 — `tenants.create` (POST `/tenants`) has no permission check and no rate limit
- **Files:** `apps/nest-api/src/modules/tenants/tenants.controller.ts:33-43`
- **Issue:** the endpoint has `@UseGuards(JwtAuthGuard)` only — no `TenantGuard`, no `PermissionsGuard`, no `@Throttle`. A logged-in user with no role can spin up a tenant and an `owner` membership. Open to automated abuse.
- **Fix:** add `@Throttle` to create-tenant; require a verified email and an active session. Optionally require an invitation token.

### S-37 — Permissions cache: 5 s TTL forces a join storm
- **Files:** `apps/nest-api/src/modules/authorization/permissions.service.ts:11-66`
- **Issue:** every protected request calls `ensureCacheFresh()` (S-05). Role/permission changes propagate within ≤5 s + the in-flight request latency. With high QPS, that's a full join every 5 s of traffic on every request.
- **Fix:** use event-driven invalidation: when a `rolePermissions` row is written, call `permissions.refreshCache()` directly. Drop the 5 s TTL.

### S-38 — Permission catalog exposed to any authenticated user
- **Files:** `apps/nest-api/src/modules/authorization/permissions.controller.ts:8-22`
- **Issue:** `GET /permissions` returns the global permission catalog (codes + descriptions) without tenant filter. Available to any authenticated user. Allows targeted phishing / permission-target identification.
- **Fix:** restrict to management roles only (`PermissionCodes.TENANT_MEMBERSHIP_READ` or similar).

### S-39 — `requireManage` checks a hardcoded `managementRoles` set
- **Files:** `apps/nest-api/src/modules/members/members.service.ts:42-50, 459-470`
- **Issue:** the `TENANT_MEMBERSHIP_MANAGE` permission is required (good), but then an extra role check is applied: `managementRoles.has(membership.role)`. If the role-permission mapping in the DB grants `TENANT_MEMBERSHIP_MANAGE` to `vice_principal`, this hardcoded set blocks it.
- **Fix:** decouple — either trust the permission check entirely (remove the `managementRoles` check), or document the discrepancy.

### S-40 — `changePassword` doesn't rotate the current session's refresh token
- **Files:** `apps/nest-api/src/modules/auth/auth.service.ts:300-340`
- **Issue:** `changePassword` revokes all sessions *except* `currentSessionId`. The current session's refresh token hash is unchanged, so the user stays logged in. If the user's device was compromised at the time of the change, the attacker (who has the refresh cookie) keeps that session.
- **Fix:** rotate the refresh token on the current session too, or require re-authentication.

### S-41 — Passkey `beginAuthentication` reveals whether a user has a passkey
- **Files:** `apps/nest-api/src/modules/passkeys/passkeys.service.ts:147-176`
- **Issue:** providing an `email` reveals whether that email is registered with a passkey via a different `invalidPasskey()` response timing / message. User enumeration.
- **Fix:** return a generic 200 with empty `allowCredentials: []` regardless of whether the user has passkeys; let the client fail at verification.

### S-42 — `homework.update` and `assessments.update` write recipients in a separate transaction
- **Files:** `apps/nest-api/src/modules/homework/homework.service.ts:171-180`; `apps/nest-api/src/modules/assessments/assessments.service.ts:178-187`
- **Issue:** the flow is (1) `this.homework.update(...)` (no transaction), (2) `this.homework.syncRecipients(...)` (transaction), (3) `this.homework.update(...)` again. If the process dies between (1) and (2), the assignment update persists but recipients are not synced. If recipients are synced before the assignment status update, the recipients might point at a stale `assignMode`.
- **Fix:** wrap all three steps in a single transaction.

### S-43 — `homework.recipients` upsert is `delete + insert`, no unique index
- **Files:** `apps/nest-api/src/modules/homework/homework.repository.ts:131-152`
- **Issue:** `syncRecipients` deletes all existing recipients and re-inserts. Concurrent teachers updating recipients at the same time both delete+insert; the second commits overwrites the first. Acceptable, but the lack of a unique index on `(homeworkId, studentId)` means a future code path that does `insert` without a `delete` could create duplicates. (Same for `assessment_recipients`.) See S-10 for the schema fix.
- **Fix:** rely on the unique index added in S-10.

### S-44 — Permission cache is shared across tenant boundaries
- **Files:** `apps/nest-api/src/modules/authorization/permissions.service.ts:9-34`; `apps/nest-api/src/modules/authorization/permissions.guard.ts:46`
- **Issue:** the map is built from `rolePermissions` joined with `roles WHERE roles.tenantId IS NULL` (see `permissions.repository.ts:27`), so the *content* is platform-wide — that's correct. But `tenant.guard.ts:48` calls `await this.permissions.ensureCacheFresh()` on **every** tenant-scoped request (S-05). After an admin removes a permission from a role, all existing access tokens for users with that role continue to be accepted for up to 5 s.
- **Fix:** same as S-05 — drop the forced refresh; invalidate on writes.

### S-45 — `findChallengeById` / `findSessionById` lack tenantId / userId guards
- **Files:** `apps/nest-api/src/modules/auth/auth.repository.ts:48-83, 225-252`; `apps/nest-api/src/modules/passkeys/passkeys.repository.ts:24-31, 52-58`
- **Issue:** `findChallengeById(challengeId)` is called by routes that have already authenticated a user. Without checking that the challenge belongs to that user, this leaks `attempts` / `consumedAt` between users. The challenge routes always go through `validateChallenge(email, purpose, code)` which checks email — but other entry points (e.g. the WebAuthn path) only check by `id`. `findSessionById` is similar.
- **Fix:** `findChallengeById` must also `eq(authChallenges.userId, currentUser.id)` or `eq(authChallenges.email, currentUser.email)`; same for `findSessionById`.

### S-46 — `users.passwordHash` nullable but no `setPassword` API for federated users
- **Files:** `apps/nest-api/src/modules/users/users.service.ts:15, 38`
- **Issue:** social-login users have `passwordHash = null` forever and there's no way to set one post-registration — `UsersService.createUser` requires `passwordHash: string`. A Google-only user can't add a password.
- **Fix:** make `passwordHash` optional in `UsersService.createUser` input; add `setPassword(userId, hash)` API.

### S-47 — `homework.assessments` etc. don't use `INSERT ... ON CONFLICT` for bulk operations
- **Files:** `assessments.repository.ts:175-218` (S-28); `homework.repository.ts:131-152` (S-43)
- **Issue:** see S-28 and S-43.
- **Fix:** see S-28 and S-43.

---

## 4. Medium-priority issues (severity M)

### S-48 — `subsidies/subscriptions`: `subscriptions` partial uniqueness broken
- **Files:** `apps/nest-api/src/database/schema/subscriptions.schema.ts:26-30`; `apps/nest-api/src/modules/billing/billing.repository.ts:67-114`
- **Issue:** `BillingRepository.upsertFromWebhook` inserts without checking and never sets `providerSubscriptionId` to `NULL` on cancellation, so a single user can accumulate multiple rows with the same `(provider, NULL)` — the unique index doesn't block them (NULLs don't conflict in PG) and the upsert lookup via `findByProviderSubscription` won't find them.
- **Fix:** add `uniqueIndex('subscriptions_user_provider_status_unique').on(userId, provider).where(sql\`status NOT IN ('canceled', 'incomplete_expired')\`)` — enforce one active subscription per provider per user.

### S-49 — `MembershipsRepository.findActiveById` is global, not tenant-scoped
- **Files:** `apps/nest-api/src/modules/memberships/memberships.repository.ts:50-57`
- **Issue:** used by `auth.service.ts:571, 612` to resolve session → tenant context. After looking up the membership it does re-check `userId` and `tenantId` matches against the session — good. But `findActiveById` itself can be called from any code path and would return any active membership. If any controller ever calls this directly, you'll leak membership rows across tenants.
- **Fix:** keep the API, but add a sibling `findActiveByIdAndTenant(tenantId, id)` and migrate call sites; reserve `findActiveById` for system paths only.

### S-50 — `users.findByEmail` is by email globally; `users.email` is globally unique
- **Files:** `apps/nest-api/src/modules/users/users.repository.ts:44-51`; `apps/nest-api/src/database/schema/users.schema.ts:21`
- **Issue:** by design (one user can belong to multiple tenants), but the global `users_email_unique` prevents the same person from re-registering with the same email across tenants. May conflict with the multi-tenant invite flow at `membershipInvites.email` which has no uniqueness constraint.
- **Fix:** document the decision; if per-tenant emails are wanted, drop the global `users_email_unique` and add `(tenant_id, email)` uniqueness on `memberships`.

### S-51 — `findSessionById` accepts the request's `tenantId` but JWT's `tid` is not re-verified
- **Files:** `apps/nest-api/src/modules/authorization/permissions.guard.ts:46-52`; `apps/nest-api/src/modules/tenants/tenant.guard.ts:48-59`
- **Issue:** `JwtAuthGuard` does not verify the membership still exists for `payload.tid`. A user whose membership was revoked but who still has a valid access token (≤15 min, per S-03) can still use endpoints that scope by JWT `tid`.
- **Fix:** `authenticateAccessToken` should also verify `payload.tid` resolves to an *active* membership for `payload.sub`; deny otherwise. Tied to S-03.

### S-52 — `tenants.create` slug uniqueness check is not race-safe
- **Files:** `apps/nest-api/src/modules/tenants/tenants.service.ts:73-89`; `apps/nest-api/src/modules/tenants/tenants.repository.ts:46-76`
- **Issue:** `resolveUniqueSlug` reads-then-inserts in a loop. Two concurrent `POST /tenants` calls with the same name can both observe "slug does not exist" and both insert, hitting the unique constraint.
- **Fix:** catch unique-constraint errors and retry with a new suffix inside the loop.

### S-53 — `audit_logs.metadata` is unbounded `jsonb`
- **Files:** `apps/nest-api/src/modules/attendance/attendance.repository.ts:159-179`
- **Issue:** `metadata: { status, previousStatus, ... }` is small here. But future audit rows might include free-form text. A user could potentially bloat the table.
- **Fix:** add a Postgres check constraint or a service-layer size cap (e.g. 64 KB).

### S-54 — `requestIdMiddleware` does not validate inbound request id format
- **Files:** `apps/nest-api/src/common/middleware/request-id.middleware.ts:14-20`
- **Issue:** a client can send `x-request-id: foo\n2024-01-01T00:00:00Z [INFO] fake log line`. NestJS uses the same id in `requestId` for logs, so the attacker can inject newlines into the log.
- **Fix:** validate against a strict regex (e.g. `^[A-Za-z0-9._-]{1,128}$`).

### S-55 — `tenants.tenantId` path param doesn't have to match JWT's `tid`
- **Files:** many controllers
- **Issue:** `tenant.guard.ts:34-46` only verifies that the tenant is active and the user has membership — it does *not* check that the path's `tenantId` matches the JWT's active tenant. May be intentional; document.
- **Fix:** document the design decision; add an opt-in strict check if desired.

### S-56 — `consumePasswordTiming` is misleadingly named and hardcodes 200 ms
- **Files:** `apps/nest-api/src/modules/auth/auth.service.ts:684-687`
- **Issue:** see S-17. The 200 ms is hardcoded and the function is named `consumePasswordTiming` ("Timing" is a typo for "timing" — actually correct, just confusing).
- **Fix:** see S-17.

### S-57 — `social-auth.linkGoogle` uses case-sensitive email comparison
- **Files:** `apps/nest-api/src/modules/social-auth/social-auth.service.ts:106-127`
- **Issue:** `if (!user || user.email !== profile.email)`. Both sides go through lowercasing, so it's correct *for* lowered emails. But the conflict response leaks user existence: an attacker can probe `is this email registered?` by attempting Google login.
- **Fix:** always return the same generic `SOCIAL_ACCOUNT_LINK_REQUIRED` error regardless of whether the email exists.

### S-58 — `tenants.create` has no per-user tenant cap (resource exhaustion)
- **Files:** `apps/nest-api/src/modules/tenants/tenants.service.ts:29-40`
- **Issue:** see S-36. A user can call `POST /tenants` repeatedly, creating unlimited tenants.
- **Fix:** add a per-user cap (e.g. max 5 active tenants).

### S-59 — `outbox-processor` runs even in production with no jitter and no concurrency safety
- **Files:** `apps/nest-api/src/modules/notifications/outbox-processor.service.ts:29-34`
- **Issue:** `setInterval` with `outboxPollIntervalMs` (default 5000) starts at module init. In a multi-pod deployment, every pod runs the same loop and races on the same rows (see S-01). No exponential backoff on failed events.
- **Fix:** see S-01.

### S-60 — `totp_recovery_codes` has no index
- **Files:** `apps/nest-api/src/database/schema/totp-factors.schema.ts:18-23`; `apps/nest-api/src/modules/mfa/mfa.repository.ts:56-77`
- **Issue:** the FK alone doesn't provide an index. With recovery codes being only ~10 rows per user this is currently fine, but you'll do seqscans under growth.
- **Fix:** add `index('totp_recovery_codes_user_idx').on(table.userId)` and optionally `uniqueIndex('totp_recovery_codes_user_code_unique').on(table.userId, table.codeHash)`.

### S-61 — `webauthn_authentication_challenges.user_id` has no index
- **Files:** `apps/nest-api/src/database/schema/webauthn-challenges.schema.ts:18`; `apps/nest-api/src/modules/passkeys/passkeys.repository.ts:55-72`
- **Issue:** `passkeys.repository.ts:55-72` finds challenges by `id`, so this is currently OK — but any future "list challenges for user" query will seqscan.
- **Fix:** add `index('webauthn_auth_challenges_user_id_idx').on(table.userId)`.

### S-62 — `membership_invites` has no `(tenant_id, email)` lookup index
- **Files:** `apps/nest-api/src/database/schema/membership-invites.schema.ts:31-35`
- **Issue:** migration `0011` adds `membership_invites_pending_tenant_email_unique` as a partial unique on `(tenant_id, email) WHERE status='pending'`, but the schema does not declare it. Same DRIFT issue as S-10/S-11/S-12.
- **Fix:** add the partial unique in the schema: `uniqueIndex('membership_invites_pending_tenant_email_unique').on(tenantId, email).where(sql\`status = 'pending'\`)`.

### S-63 — `enrollments(tenant_id, student_id)` composite index missing
- **Files:** `apps/nest-api/src/database/schema/enrollments.schema.ts:33-37`; `apps/nest-api/src/modules/students/students.repository.ts:208-223`; `apps/nest-api/src/modules/staff/staff.repository.ts:316-326`
- **Issue:** the existing `enrollments_tenant_id_idx` and `enrollments_student_id_idx` are not composite. The planner will pick `student_id` (better selectivity) then filter `tenant_id` post-hoc.
- **Fix:** add `index('enrollments_tenant_student_idx').on(table.tenantId, table.studentId)`.

### S-64 — `section_subjects(section_id)` index missing
- **Files:** `apps/nest-api/src/database/schema/section-subjects.schema.ts:25-28`; `apps/nest-api/src/modules/staff/staff.repository.ts:195-215`
- **Issue:** the FK reference is unindexed on the bare column. `findSectionSubjectById` joins on `section_id`.
- **Fix:** add `index('section_subjects_section_id_idx').on(table.sectionId)`.

### S-65 — `attendance_events` has no `(tenant_id, session_id)` composite index
- **Files:** `apps/nest-api/src/database/schema/attendance-events.schema.ts:24-28`
- **Issue:** the handler queries by `(tenant_id, session_id)` for audit replay.
- **Fix:** add `index('attendance_events_tenant_session_idx').on(table.tenantId, table.sessionId)`.

### S-66 — `outbox_events_status_created_idx` not in any migration
- **Files:** `apps/nest-api/src/database/schema/outbox-events.schema.ts:24-29`
- **Issue:** the Drizzle schema has it, but no migration creates it. After a fresh migration on a clean DB, the index won't exist.
- **Fix:** add a new migration that explicitly creates `outbox_events_status_created_idx`.

### S-67 — `getErrorMessage` in HTTP exception filter returns `HttpStatus[statusCode]`
- **Files:** `apps/nest-api/src/common/filters/http-exception.filter.ts:69-82`
- **Issue:** `HttpStatus[statusCode]` returns e.g. `"UNAUTHORIZED"`, `"BAD_REQUEST"`. Shown to API consumers. Not user-friendly.
- **Fix:** map to human-friendly strings.

### S-68 — `requireActiveMembership` leaks tenant existence via 404
- **Files:** `apps/nest-api/src/modules/memberships/memberships.service.ts:17-26`
- **Issue:** `requireActiveMembership` returns `NotFoundException` with `code: TENANT_NOT_FOUND` even when the user is just not a member of that tenant (e.g. cross-tenant access attempt). Leaks information. Also the HTTP status 404 is wrong for an authorization failure.
- **Fix:** distinguish "tenant does not exist" (404) from "user is not a member of this tenant" (403, code `NOT_A_MEMBER`).

### S-69 — `parseDurationMs` only handles `s/m/h/d`
- **Files:** `apps/nest-api/src/modules/auth/auth-crypto.service.ts:182-191`
- **Issue:** the regex `^\d+[smhd]$` rejects `1y`; only `s/m/h/d` are documented. Not a security issue.
- **Fix:** none needed; OK as-is.

### S-70 — `membership_roles.role` and `memberships.role` are independent columns
- **Files:** `apps/nest-api/src/database/schema/memberships.schema.ts:18, 24`; `apps/nest-api/src/database/schema/membership-roles.schema.ts:11-14`
- **Issue:** the app keeps them in sync at write time, but there's no DB-level constraint enforcing that `memberships.role IN (SELECT role FROM membership_roles WHERE membership_id = memberships.id)`. When you add `vice_principal` (migration `0020`), you must update BOTH columns.
- **Fix:** add a deferred FK or trigger; or normalize by dropping `memberships.role` and always reading from `membership_roles`.

### S-71 — `CORS allowedHeaders` doesn't include `Cookie` or `X-CSRF-Token`
- **Files:** `apps/nest-api/src/app.setup.ts:35-45`
- **Issue:** not currently a problem because the API uses bearer tokens, not cookies for auth. If you switch to cookie-based CSRF, add `Cookie` and `X-CSRF-Token` here.

### S-72 — `homework.service.buildDetailResponse` returns entire section roster
- **Files:** `apps/nest-api/src/modules/homework/homework.service.ts:333-340`
- **Issue:** a teacher with `HOMEWORK_READ` permission for one section can call `getById(homework)` for a *different* section's homework and see that section's roster, provided the teacher has access to that section's `sectionSubject` (because `requireSectionSubjectAccess` checks the sectionSubject, not the section). May be intended ("teacher who teaches Subject Math in any section can see all Math homeworks") or not.
- **Fix:** document or restrict to the teacher's *own* sections.

### S-73 — `audit_logs.resource_id` empty-string when insert silently failed
- **Files:** `apps/nest-api/src/modules/attendance/attendance.repository.ts:167-187`
- **Issue:** see S-33.

### S-74 — `member.updateMember` self-update protection has a narrow bypass for dual roles
- **Files:** `apps/nest-api/src/modules/members/members.service.ts:250-335`
- **Issue:** the code correctly prevents demoting the *last* owner and blocks self-updates. But a user who has a teacher + parent dual-role membership can hit `POST /tenants/:tid/members/:mid/roles` to add a *third* role — `addMemberRole` has the same self-check, so this is safe. Note the role-hierarchy inconsistency between `canManageTarget` and `assertCanManageTarget` — see S-08.
- **Fix:** consolidate to a single `canActorManage(actorRole, targetRole, nextRole?)` helper.

### S-75 — `homework.assessments` etc. list endpoints return unlimited results
- **Files:** see S-30.

### S-76 — TOTP secret returned in plaintext to client
- **Files:** `apps/nest-api/src/modules/mfa/mfa.service.ts:79-100`
- **Issue:** standard behavior — the user must see the secret to set up their authenticator. Acceptable.

### S-77 — `permission-cache` is shared across tenants
- **Files:** see S-44.

### S-78 — Migration `0020` uses `ALTER TYPE … ADD VALUE` outside a transaction
- **Files:** `apps/nest-api/src/database/migrations/0020_vice_principal_role.sql:1`
- **Issue:** PostgreSQL allows `ALTER TYPE … ADD VALUE` only outside a transaction block. The migration file uses `--> statement-breakpoint` separators, which Drizzle uses for separate statements — fine. But because of PG limitation, the migration cannot be wrapped in a transaction, and if any subsequent statement in the same migration fails, the type change is already committed.
- **Fix:** if you have a migration-test pipeline that wraps in `BEGIN`/`COMMIT`, special-case enum-altering migrations. Otherwise no action.

---

## 5. Low-priority issues (severity L)

### S-79 — `app.module.ts:32` global throttler 100 req/min is generous
- **Files:** `apps/nest-api/src/app.module.ts:32`
- **Issue:** 100/min per IP is generous for expensive endpoints (e.g. `assessments.list` triggers `toPublicWithCount` for every row, which triggers `listStudentsInSections` per row — see S-21). Combined with no pagination (S-30), a single IP can request 100 × O(homeworks × sections) DB queries per minute.
- **Fix:** lower the global limit (e.g. 60/min) and add per-endpoint `@Throttle` for expensive reads (homework, assessments, attendance pulse, teacher dashboard). Consider a separate `AuthThrottler` with shorter TTL (15 s) for `/auth/login`.

### S-80 — `themeInitScript` and inline scripts duplicate storage keys
- **Files:** `apps/web/src/components/theme/theme.ts:42-43`; `apps/web/src/modules/landing/lib/theme.ts:14-22`
- **Issue:** the inline scripts hardcode `"theme"` and `"atlas-theme"` storage keys and the `"dark"` default. If someone renames `THEME_STORAGE_KEY` in the TS file, the inline script will still read the old key — causing an FOUC flash on first paint until the React effect re-applies.
- **Fix:** generate the script string from the same constants via a function and assert the result in a test.

### S-81 — `score > maxScore` check missing
- **Files:** `apps/web/src/modules/assessments/components/assessment-detail-page.tsx:177-187`
- **Issue:** see W-01.

### S-82 — `planner.addDays` is DST-naive
- **Files:** `apps/web/src/modules/test-planner/components/test-planner-page.tsx:28-32`
- **Issue:** `setDate` handles month/year rollover, but DST transitions can make the resulting Date one hour off. The calendar week buckets are based on `toDateKey(date)` which uses the *local* date. If a user views the planner from a different timezone than the school, dates may not align.
- **Fix:** use UTC date components or normalize to the school's timezone.

### S-83 — `admin-topbar.tsx` `crumbsForPath` misses most admin routes
- **Files:** `apps/web/src/app/admin/_components/admin-topbar.tsx:23-45`
- **Issue:** only `/admin/members`, `/admin/account/profile`, `/admin/account/security`, and `/admin/timetable` get custom crumbs. Everything else falls through to `defaultCrumbs = [{ label: "Dashboard" }, { label: "Overview" }]`.
- **Fix:** derive the label from the navigation item's `label` field via `useAdminNavigationQuery().sections` + `resolveActiveNavigationKey`.

### S-84 — `Math.max(1_000, NaN)` in `session-provider`
- **Files:** `apps/web/src/store/session-provider.tsx:58`
- **Issue:** if `tokenExpiresAt` is not a valid date string, `new Date(tokenExpiresAt).getTime()` is `NaN`, `NaN - Date.now() - 60000` is `NaN`, and `Math.max(1000, NaN)` is `NaN`. `setTimeout(attemptRefresh, NaN)` schedules it to fire never (silently) — the user is left with an expired token and no auto-refresh.
- **Fix:** guard: `if (Number.isNaN(expiresAt)) return;` and fall back to immediate refresh.

### S-85 — `AdminScrollLock` sets `document.body.style.height = "100%"`
- **Files:** `apps/web/src/app/admin/_components/admin-scroll-lock.tsx:20-23`
- **Issue:** forced `html/body { height: 100% }` on the admin shell can cause bottom-content cutoff on mobile Safari with the dynamic toolbar. The fixed `height: 100%` doesn't account for `100dvh` changes.
- **Fix:** use `100dvh` or skip the body style entirely.

### S-86 — `students-page.tsx` re-fetches on every drawer open
- **Files:** `apps/web/src/modules/students/components/students-page.tsx:326-335`
- **Issue:** `useStudentQuery(tenantId, manageStudentId || null, Boolean(manageOpen && manageStudentId))`. The query is gated by `manageOpen` so it only fires when the drawer is open, but the `staleTime` is 60 s. Opening, closing, and reopening the drawer within 60 s re-fires the network request because the query is disabled (unmounted).
- **Fix:** bump `staleTime` for student-detail queries, or move the query out of the drawer (always-on, just keep the data fresh).

### S-87 — `e2e/home.spec.ts` is the only E2E test
- **Files:** `apps/web/e2e/home.spec.ts`
- **Issue:** six lines, one test. The application has login, role-based dashboards, multi-tenant switching, admissions wizard, assessment grading, etc. — none have e2e coverage. The recent security commit cannot be verified by the test suite to ensure no regression.
- **Fix:** add at least one happy-path e2e per major flow.

### S-88 — `Helmet` config relaxes `crossOriginResourcePolicy`
- **Files:** `apps/nest-api/src/app.setup.ts:14-21`
- **Issue:** `crossOriginResourcePolicy: { policy: 'cross-origin' }` — relaxes CORP, allowing resources to be loaded cross-origin. Required for serving uploads to a web app on a different origin. Acceptable, but understand the tradeoff: any origin in `corsOrigins` can fetch your static assets.

### S-89 — `OTP` validator allows `000000` but generator never produces it
- **Files:** `apps/nest-api/src/modules/auth/auth.dto.ts:5`
- **Issue:** the regex `/^\d{6}$/` accepts `000000`, but `generateOtp` uses `randomInt(100_000, 1_000_000)` which never returns that. Asymmetric but not a bug.

### S-90 — `findSessionById` does not check session expiry
- **Files:** `apps/nest-api/src/modules/auth/auth.repository.ts`
- **Issue:** not strictly an issue — the access token's `exp` is checked in `verifyAccessToken`; the session's `expires_at` is checked in some paths. Verify consistency.

### S-91 — `dev-auth-code.ts` reads `devCode` from URL but only in dev
- **Files:** `apps/web/src/modules/auth/lib/dev-auth-code.ts:12-39`
- **Issue:** see W-03. The reading is gated to `process.env.NODE_ENV === "development"`, but the URL itself is built unconditionally.

### S-92 — `dev OTP` is shown in plaintext in the form
- **Files:** `apps/web/src/modules/auth/components/reset-password-form.tsx:62-69`
- **Issue:** same as W-03.

### S-93 — `ZodValidationPipe` `metatype` may be `undefined` for primitives
- **Files:** `apps/nest-api/src/common/pipes/zod-validation.pipe.ts:46-50`
- **Issue:** the check `const metatype = metadata.metatype as ZodSchemaProvider | undefined` — for `@Query('date') date: string` (primitive), no validation is performed. Inconsistent with `@Body()`. OK as designed; document.

### S-94 — `Zod v4` is used; verify consistency
- **Files:** everywhere
- **Issue:** `package.json` has `"zod": "^4.4.3"`. DTOs use `z.email()`, `z.string().strict()`. Consistent.

### S-95 — `audit_logs` is never queried by application code, only inserted
- **Files:** `audit-logs.schema.ts`
- **Issue:** safe, but no audit-log viewer surface exists.

---

## 6. Web app issues (apps/web)

The web app issues below are also referenced from §1–§5 with IDs `W-01` through `W-09`.

### W-01 — `Score` input accepts `NaN` and out-of-range numbers
- **Files:** `apps/web/src/modules/assessments/components/assessment-detail-page.tsx:177-187`
- **Issue:** `Input type="number" min={0} max={detailQuery.data?.maxScore}` — but the value is bound to a string. When the user clears the field, `row.score` is `""`. The save handler does `row.status === "graded" && row.score.trim() !== "" ? Number(row.score) : null` (line 95), which will pass through `Number("abc")` if a paste happens and yields `NaN`. There's no upper-bound check.
- **Fix:** `const score = Number(row.score); if (Number.isNaN(score) || score < 0 || score > maxScore) { setError("Invalid score"); return; }`.

### W-02 — Domain forms (homework, assessments) have no client-side zod validation
- **Files:** `apps/web/src/modules/homework/components/homework-page.tsx:287-341`; `apps/web/src/modules/assessments/components/assessments-page.tsx:163-198`; `apps/web/src/modules/students/components/admit-student-wizard.tsx`
- **Issue:** `handleSubmit` only checks `sectionSubjectId` and `studentIds`. It does not call zod to validate `title`, `description`, `materials`, `dueAt`, `estimatedMinutes`, etc. The auth forms (login, signup, reset password) do use zod (`auth.schemas.ts`); the new domain forms do not.
- **Fix:** define `homeworkCreateSchema` and `assessmentCreateSchema` next to the existing types; run `schema.safeParse(form)` in `handleSubmit` and surface `result.error.issues[0]?.message` to the existing `error` state.

### W-03 — Dev OTP surfaced in URL via `?devCode=…`
- **Files:** `apps/web/src/modules/auth/lib/dev-auth-code.ts:12-26`; `apps/web/src/modules/auth/components/forgot-password-form.tsx:33`; `apps/web/src/modules/auth/components/signup-form.tsx:86-93`
- **Issue:** `buildAuthRedirectUrl(path, email, devCode, inviteToken)` appends `?email=…&devCode=…&invite=…` to the URL. The reading is gated to `process.env.NODE_ENV === "development"`, but the redirect itself is built unconditionally. In a production build the URL still contains the devCode (it just isn't read). The `Referer` header on the next navigation will leak it to any third-party asset. Browser history and password-manager backups will also store it.
- **Fix:** move the dev code display to a server-only path or a one-time `sessionStorage` write gated by `isDevAuthCodeEnabled()`; never put the dev OTP in a URL parameter. Add a build-time check that fails the build if `AUTH_DEV_EXPOSE_CODES === true` and `NODE_ENV === "production"`.

### W-04 — Object URL leak in `admit-student-wizard`
- **Files:** `apps/web/src/modules/students/components/admit-student-wizard.tsx:102-110`
- **Issue:** `useEffect(() => { if (!photoFile) { setPhotoPreview(null); return; } const url = URL.createObjectURL(photoFile); setPhotoPreview(url); return () => URL.revokeObjectURL(url); }, [photoFile]);`. If `photoFile` is set to `null` directly (line 255 has a "Remove photo" button that calls `setPhotoFile(null)`), the next effect run will see `!photoFile` and *not* call `revokeObjectURL` on the existing preview. The previous URL is overwritten in state but never revoked.
- **Fix:** store the URL in a ref and call `URL.revokeObjectURL` explicitly in the `Remove photo` handler, or always revoke on the next-render cleanup regardless of next value.

### W-05 — `ResetPasswordForm` accepts arbitrary `email` and `code` without zod validation
- **Files:** `apps/web/src/modules/auth/components/reset-password-form.tsx:35-51`
- **Issue:** `handleSubmit` only checks `password !== confirmPassword` and POSTs `{ email, code, newPassword }` to the API. The email and code are not passed through `emailSchema` or any code-format check. The `code` input has a `pattern="[0-9]{6}"` HTML attribute (line 92), but `pattern` is a soft constraint.
- **Fix:** run `emailSchema.safeParse({ email })` and a `z.string().regex(/^\d{6}$/).safeParse({ code })` before submission; surface issues; disable the submit button when invalid.

### W-06 — `RequireAuth` does not handle the case where the user is signed in but the tenant context has zero tenants
- **Files:** `apps/web/src/modules/auth/components/require-auth.tsx:8-31`
- **Issue:** `RequireAuth` only checks `user`. A newly-registered user with no tenant sees the admin shell. The shell then defers to `TenantOnboardingGate` (admin/layout.tsx:12), which redirects them to `/admin/onboarding/tenant`.
- **Fix:** when the refresh session call returns 401, call `clearSession()` (already done). But during the in-flight refresh, the `user` value is still set, so the layout renders. Add a check: if `loading && !user` show the spinner (current), and if `user` is set but `membershipLoading` is true, also show a spinner to avoid flashing the admin shell.

### W-07 — `assignHomeworkOpened` ref pattern may double-fire on React 19 strict mode
- **Files:** `apps/web/src/modules/staff/components/class-detail-page.tsx:121-140`
- **Issue:** two `useEffect` blocks read `assignHomeworkOpened.current` to gate `setHomeworkSheetOpen(true)`. The ref is set inside the effect. On a section change (e.g. user navigates from `/my-classes/A` to `/my-classes/B` with `?assignHomework=1` in the URL), the effect won't refire because `assignHomeworkOpened.current` is already `true`. This is a *feature* (don't reopen the sheet on re-render) but breaks deep-linking after navigation.
- **Fix:** reset the ref in a `useEffect(() => { return () => { assignHomeworkOpened.current = false; } }, [sectionId])` so the gate resets per section.

### W-08 — `useStudentQuery` and similar IDOR-vulnerable calls do not check that the user has access to the resource
- **Files:** `apps/web/src/modules/students/hooks/use-student-queries.ts:29-39`; `apps/web/src/modules/students/services/students.service.ts:20-21`
- **Issue:** the hook only checks "is the token present and is tenantId present" before calling the API. Authorization is delegated entirely to the Nest API backend. This is fine *only* if the backend enforces the same scoping the UI assumes.
- **Fix:** add a client-side check that the requested `tenantId` is in `useSessionStore.tenants` and that the user has the relevant permission (`STUDENTS_READ`) before firing the request. Surface a 403 inline in the data table.

### W-09 — `AcceptInvitePage` accepts any token without re-confirming freshness
- **Files:** `apps/web/src/app/accept-invite/page.tsx:36-79`
- **Issue:** the token in the URL is a long-lived invite token, not a one-time OTP. The `emailMismatch` check uses the API's `preview.email`; if a user changes their account email first, the preview email is stale.
- **Fix:** require a one-time confirmation step ("I want to join {tenant} as {role}") on a server action that re-validates the token server-side; gate `completeAccept` behind an explicit user click that re-checks `preview.email === user.email` server-side, not just on the client.

---

## 7. Quick wins checklist

These items are ≤30 min each and have high signal-to-noise. Triage in order.

- [ ] **QW-01** Wrap `claimPendingBatch` in `db.transaction(...)` and add `for('update', { skipLocked: true })`. (S-01, S-24)
- [ ] **QW-02** Add `uniqueIndex(...).on(homeworkId, studentId)` to `homework-recipients.schema.ts` (and the assessment equivalent). (S-10)
- [ ] **QW-03** Add `iss` / `aud` claims to `signAccessToken` and `verifyAccessToken`. (S-04)
- [ ] **QW-04** Remove `await this.permissions.ensureCacheFresh()` from `tenant.guard.ts:48`. (S-05)
- [ ] **QW-05** Use a precomputed dummy bcrypt hash in the user-not-found and federated-only paths; delete `consumePasswordTiming`. (S-17)
- [ ] **QW-06** Reorder `tenant.guard.ts` to call `requireActiveMembership` first. (S-09)
- [ ] **QW-07** Add `if (nextRole === 'vice_principal' && actorRole !== 'principal' && actorRole !== 'owner') throw` in `assertCanManageTarget`. (S-08)
- [ ] **QW-08** Add `apps/web/middleware.ts` for `/admin/**` server-side auth. (S-06)
- [ ] **QW-09** Cap `parseAcademicDraft` reply length in `ai.client.ts` (OOM risk on huge LLM responses). (S-32)
- [ ] **QW-10** Validate query params with Zod in `homework.controller`, `assessments.controller`, `timetable.controller`, `attendance.controller` (the schemas exist; they're not applied). (S-29)
- [ ] **QW-11** Add NaN / range check to `Score` input in `AssessmentDetailPage`. (W-01)
- [ ] **QW-12** Define `homeworkCreateSchema` and `assessmentCreateSchema` for client-side zod validation. (W-02)
- [ ] **QW-13** Move dev OTP out of the URL — use `sessionStorage` and a dev-only display path. (W-03)
- [ ] **QW-14** Fix the `Remove photo` handler in `admit-student-wizard` to revoke the prior object URL. (W-04)
- [ ] **QW-15** Add a `@Cron` `MaintenanceService` for expired auth challenges, sessions, webauthn challenges, and `expireStaleInvites()`. (S-19)
- [ ] **QW-16** Add `uniqueIndex('assessment_results_assessment_student_unique').on(assessmentId, studentId)` and switch to `INSERT ... ON CONFLICT DO UPDATE`. (S-28)
- [ ] **QW-17** Add `uniqueIndex('membership_invites_pending_tenant_email_unique').on(tenantId, email).where(sql\`status = 'pending'\`)`. (S-62)
- [ ] **QW-18** Add `uniqueIndex('students_membership_id_unique').on(table.membershipId).where(sql\`membership_id IS NOT NULL\`)`. (S-12)
- [ ] **QW-19** Add `index('enrollments_tenant_student_idx').on(table.tenantId, table.studentId)`. (S-63)
- [ ] **QW-20** Add `index('attendance_events_tenant_session_idx').on(table.tenantId, table.sessionId)`. (S-65)
- [ ] **QW-21** Add `index('section_subjects_section_id_idx').on(table.sectionId)`. (S-64)
- [ ] **QW-22** Add `index('webauthn_auth_challenges_user_id_idx').on(table.userId)`. (S-61)
- [ ] **QW-23** Add `index('totp_recovery_codes_user_idx').on(table.userId)`. (S-60)
- [ ] **QW-24** Add `index('audit_logs_tenant_created_idx').on(table.tenantId, table.createdAt)`. (S-25)
- [ ] **QW-25** Fix `timetable.repository.countEntries` to use `count(*)` or remove the function. (S-34)
- [ ] **QW-26** Add a migration that creates `outbox_events_status_created_idx` (currently only in the schema). (S-66)
- [ ] **QW-27** Validate `requestIdMiddleware` against a strict regex (e.g. `^[A-Za-z0-9._-]{1,128}$`). (S-54)
- [ ] **QW-28** Cap `userAgent` write at 512 chars and change the column to `varchar(512)`. (S-31)
- [ ] **QW-29** Tighten `consumeRecoveryCode` filter with a unique index on `(userId, codeHash)`. (S-60)
- [ ] **QW-30** Add `CsrfGuard` to all authenticated mutation controllers, or make it a global `APP_GUARD` with `@Public()` / `@SkipCsrf()` opt-outs. (S-15)

---

## 8. Verification notes

The following items from the audit were **directly verified** against source code (read the file at the cited line):

- **S-01** `outbox.repository.ts:11-35` — no `db.transaction(...)` wrap; the `for('update')` is on a subquery inside an `update ... where id IN (...)` running at the top level.
- **S-05** `tenant.guard.ts:48` — line `await this.permissions.ensureCacheFresh();` is present.
- **S-08** `members.capabilities.ts:42-53` (`canManageTarget`) and `members.service.ts:395-425` (`assertCanManageTarget`) — the function does not check `nextRole === 'vice_principal'`.
- **S-09** `tenant.guard.ts:34-44` — `findById` + `isActive` runs *before* `requireActiveMembership`.
- **S-23** `attendance.service.ts:131-144` — per-student `findStudentById` inside a loop.
- **S-34** `timetable.repository.ts:43-50` — `countEntries` returns `row ? 1 : 0` regardless of actual count.

Items marked "verified: yes" above are confirmed; items not so marked are inferred from the audit agent's read of the relevant files. Before fixing any item, re-read the file at the cited location to confirm the current state.

---

## Appendix: file index

The following files were read or scanned during this audit. Use this as a starting point for follow-up work.

```
apps/nest-api/src/
  app.module.ts
  app.setup.ts
  common/
    filters/http-exception.filter.ts
    middleware/request-id.middleware.ts
    pagination.ts
    pipes/zod-validation.pipe.ts
  database/
    database.service.ts
    schema/
      attendance-events.schema.ts
      audit-logs.schema.ts
      enrollments.schema.ts
      homework-recipients.schema.ts
      assessment-recipients.schema.ts
      homework-assignments.schema.ts
      assessments.schema.ts
      memberships.schema.ts
      membership-roles.schema.ts
      membership-invites.schema.ts
      outbox-events.schema.ts
      roles.schema.ts
      section-subjects.schema.ts
      sessions.schema.ts
      students.schema.ts
      subscriptions.schema.ts
      tenants.schema.ts
      timetable.repository.ts
      totp-factors.schema.ts
      users.schema.ts
      webauthn-challenges.schema.ts
    migrations/
      0000_*.sql .. 0020_*.sql (sample read: 0001, 0006, 0010, 0011, 0017, 0018, 0019, 0020)
  modules/
    ai/ai.service.ts
    assessments/{controller, service, repository}.ts
    attendance/{controller, service, repository}.ts
    auth/{auth.controller, auth.service, auth.repository, auth-security.controller, csrf.guard, jwt-auth.guard, refresh-cookie.service, auth-crypto.service, auth.dto}.ts
    authorization/{permissions.controller, permissions.service, permissions.repository, permissions.guard}.ts
    homework/{controller, service, repository}.ts
    members/{members.service, members.capabilities}.ts
    memberships/{memberships.service, memberships.repository}.ts
    mfa/{mfa.service, mfa.repository}.ts
    notifications/{outbox.repository, outbox-processor.service}.ts
    passkeys/{passkeys.service, passkeys.repository}.ts
    social-auth/social-auth.service.ts
    staff/{controller, service, repository}.ts
    students/{controller, service, repository, student-photo-upload}.ts
    tenants/{tenants.controller, tenants.service, tenants.repository, tenant.guard}.ts
    timetable/{controller, repository}.ts
    users/{users.service, users.repository}.ts

apps/web/
  e2e/home.spec.ts
  src/
    app/admin/_components/{admin-scroll-lock, admin-topbar}.tsx
    app/admin/layout.tsx
    app/accept-invite/page.tsx
    components/theme/theme.ts
    lib/api/client.ts
    lib/user-display.ts
    modules/
      academics/hooks/use-section-subject-options.ts
      assessments/components/{assessments-page, assessment-detail-page}.tsx
      auth/components/{require-auth, forgot-password-form, signup-form, reset-password-form}.tsx
      auth/lib/dev-auth-code.ts
      dashboard/components/{admin-home-page, admin-sidebar}.tsx
      homework/components/homework-page.tsx
      staff/components/class-detail-page.tsx
      students/components/{admit-student-wizard, students-page}.tsx
      students/hooks/use-student-queries.ts
      students/services/students.service.ts
      test-planner/components/test-planner-page.tsx
    store/{session-store, session-provider}.tsx
```

**End of issue_01.md**
