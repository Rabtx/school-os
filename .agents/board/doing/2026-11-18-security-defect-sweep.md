---
id: str-security-defect-sweep
title: Close invite-accept race, tenant-creation abuse and catalog exposure
type: bug
from: reviewer
to: backend
priority: high
status: doing
assignee: vale
reviewer: none
parent: none
depends_on: []
branch: grid/chat-4ab827c4
worktree: /home/grid/Projects/.grid-worktrees/school-os/chat-4ab827c4
scope: ["apps/nest-api/src/modules/memberships/**", "apps/nest-api/src/modules/tenants/tenants.service.ts", "apps/nest-api/src/modules/authorization/**"]
allowed_shared: []
created: 2026-11-18
updated: 2026-11-18
---

## What

Fix the clearest still-open security defects from the audit (`issue_01.md`): the invite-accept
TOCTOU (S-14), the tenant slug race (S-52), the missing per-user tenant cap (S-58), and the
permission catalog open to any authenticated user (S-38). Raised and claimed in one step at the
human's direct request; the session branch `grid/chat-4ab827c4` is used instead of a new wtp
worktree because the work is a small focused sweep, not feature work.

## Why / Context

Findings come from `.agents/plans/audits/issue_01.md` and are grouped on the open
`2026-10-27-api-validation.md` card. Most audit items were fixed in passing; the items here were
re-verified against the code today:

- **S-14** `membership-invites.service.ts` activates the membership and consumes the invite in two
  separate writes; `updateInvite` is not conditional on `status = 'pending'`, so concurrent accepts
  of the same token race (second create can hit `memberships_tenant_user_unique` as a 500).
- **S-52** `tenants.service.ts` probes `slugExists` then inserts; two concurrent creates with the
  same name both pass the probe and one dies on `tenants_slug_unique` with a 500.
- **S-58** `POST /tenants` has a rate limit (5/min) but no per-user cap on owned tenants.
- **S-38** `GET /permissions` returns the global catalog to any authenticated user; nothing in
  web/mobile calls it.

## Proposal or Ask

- Atomic invite accept: one transaction claims the invite conditionally on `pending` and not
  expired, then activates or creates the membership; losers get `INVITE_NOT_FOUND`.
- Retry tenant creation once per unique-violation on the slug with the next suffix, and cap active
  owned tenants per user (5) with `TENANT_CREATION_LIMIT`.
- Gate `GET /permissions` on holding an active membership with a management role in any tenant.

Done when each fix lands with a test, lint/typecheck/tests pass, and the remaining card items are
explicitly accounted for.

## Scope

**In scope:**

- `apps/nest-api/src/modules/memberships/memberships.repository.ts`
- `apps/nest-api/src/modules/memberships/membership-invites.service.ts`
- `apps/nest-api/src/modules/tenants/tenants.service.ts`
- `apps/nest-api/src/modules/authorization/authorization.module.ts`
- `apps/nest-api/src/modules/authorization/permissions.controller.ts`
- specs under the touched modules

**Out of scope:**

- S-42 (homework/assessment recipients transaction) — structural, stays on `schema-integrity`.
- S-06 / web-server-auth (server-side route protection) — web-owned card.
- S-30 pagination — needs the endpoint-shape decision on the query-performance card.
- S-16/26/27 cascade redesign — schema-integrity card.

## Validation

- `bun run lint`, `bun run format`, `bun run typecheck`, `bun run test`
- targeted vitest for `tenants.service.spec.ts` and the new `membership-invites.service.spec.ts`

## Resolution

Fixed and pushed (commit `3525d9c`, PR #133):

- **S-14** `MembershipsRepository.acceptInviteAtomically` claims the invite conditionally on
  `status = 'pending'` + not expired, then activates (or creates) the membership in the same
  transaction, keeping `membership_roles` in sync. Service (`acceptInviteRecord`,
  `applyPendingInvitesForUser`) treats a lost claim as `INVITE_NOT_FOUND` / skip. Tests in the new
  `membership-invites.service.spec.ts` (7 cases incl. concurrent-consumed path).
- **S-52** `TenantsService.createWithSlugRetry` retries on the `tenants_slug_unique` violation with
  the next `-N` suffix (max 5 retries, then `TENANT_SLUG_CONFLICT`); non-unique errors rethrow.
  Tests in `tenants.service.spec.ts`.
- **S-58** `assertUnderOwnedTenantCap` rejects creation with 403 `TENANT_CREATION_LIMIT` at 5
  active owned tenants (`MAX_OWNED_ACTIVE_TENANTS`); `countActiveOwnedTenantsForUser` added.
- **S-38** `GET /permissions` gated on `hasActiveManagementRoleForUser` (reads `membership_roles`,
  so dual-role members count); `AuthorizationModule` imports `MembershipsModule`. No web/mobile
  consumer exists; permissions come from the tenant context.

Verified as-designed, no change:

- **S-20** suspended members in `listMembersForTenant` are a deliberate admin-UI state — the
  members page has a Suspended filter, badge icon and excludes suspended from role/summary math.
  Recommend closing with this reason on the `2026-10-27-api-validation.md` card.
- Already fixed in passing since the audit: S-08, S-29, S-31, S-33, S-34, S-36 (throttle), S-60,
  S-62, S-17/S-56 (triage), S-10/S-11/S-12 (schema drift), W-01, W-03.

Validation:

- `bun run lint`: pass (nest-api 0 warnings; shellcheck/shfmt unavailable in this environment)
- `bun run format`: pass
- `bun run typecheck`: pass (7/7 tasks)
- `bun run test` (nest-api): 37 files / 209 tests pass
- `bun run architecture:check`: pass (boundary + kebab-case)
- lefthook pre-commit: architecture/format/large-files/lint/secrets/typecheck all green

Contract impact: `GET /permissions` now requires a management role; not documented as an endpoint
contract anywhere (docs list the catalog as global *data*), so no doc change was needed.

Review: pending — requested on PR #133 (https://github.com/Rabtx/school-os/pull/133). Card stays
in doing/ until the review outcome is recorded.

Commit: `3525d9c`