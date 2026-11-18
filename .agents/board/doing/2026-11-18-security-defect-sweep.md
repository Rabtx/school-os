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

