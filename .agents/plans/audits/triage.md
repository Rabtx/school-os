# Audit triage

Status of the findings in `issue_01.md` (S-01 to S-60 plus later sections), `new_issues.md`,
`arch_issues.md` and `bug_fixes.md`, as of the Phase 2 hardening PR. "Fixed" means verified in the
current code. Everything not listed as fixed is open and grouped into a board card in
`.agents/board/open/`; verify each against the code before working on it, since some may have been
fixed in passing.

## Fixed

| Finding | Where it was fixed |
| --- | --- |
| S-01 outbox claim not in a transaction | Claim runs in a transaction with `FOR UPDATE SKIP LOCKED` (before PR #101) |
| S-02 refresh-token reuse does not revoke all sessions | `auth.service` revokes all sessions on reuse (before PR #101) |
| S-05 TenantGuard refreshes the permission cache per request | Guard no longer calls `ensureCacheFresh` |
| S-09 TenantGuard checks tenant before membership | Membership is checked first; a non-member gets the same not found |
| S-17 timing-unsafe login for unknown users | Login verifies against a dummy bcrypt hash |
| S-19 no cleanup of expired auth data | `MaintenanceModule` (Phase 2) |
| S-24 outbox mark-processed/failed race | Updates are conditional on `status = 'processing'`; leases added (Phase 2) |
| S-25 audit log unprotected in the database | Append-only trigger, migration 0025 (Phase 2) |
| S-59 outbox worker has no concurrency safety | Leases plus `SKIP LOCKED` claims (Phase 2) |
| new_issues #1 TenantGuard fails open | Fails closed; AI moved under `/tenants/:tenantId/ai` (Phase 2) |
| Grades, gradebook, homework history and guardians readable outside scope | `AccessScopeService` (PR #101 and Phase 2) |
| Homework/assessment columns missing on fresh databases | Journal fix for migrations 0018 and 0020 (PR #101) |

## Open, grouped into cards

| Card | Findings |
| --- | --- |
| `auth-session-hardening` | S-03, S-04, S-07, S-13, S-15, S-18, S-35, S-40, S-41, S-45, S-46, S-51, S-55, S-57, arch #6 |
| `schema-integrity` | S-10, S-11, S-12, S-16, S-26, S-27, S-28, S-31, S-33, S-42, S-43, S-47, S-48, S-53, S-60 |
| `query-performance` | S-21, S-22, S-23, S-30, S-34, S-37, S-44 |
| `api-validation` | S-14, S-20, S-29, S-32, S-36, S-38, S-39, S-49, S-50, S-52, S-54, S-56, S-58, arch #4, #5 |
| `web-server-auth` | S-06, new_issues web #1 to #4, arch #1 to #3 |
