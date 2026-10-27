# Implementation Plan: Remaining Issues & Architecture Debt

*Generated after audit of School OS monorepo (apps/nest-api + apps/web)*

---

## Phase 1: Data Integrity & Performance (Week 1-2)

| # | Issue | Files | Approach |
|---|-------|-------|----------|
| 1 | **N+1 in homework listForLinkedStudents** - 150+ queries for 50 homework × 3 students | `homework.service.ts:270-296` | Batch fetch all enrollments in single query, filter in-memory |
| 2 | **N+1 in assessments list** - separate count query per assessment | `assessments.service.ts:42-63` | Use window function `COUNT(*) OVER()` or subquery in single query |
| 3 | **AuthService god class** - 12 constructor dependencies | `auth.service.ts` (731 lines) | Extract: `MfaService`, `PasskeyService`, `MagicLinkService`, `SocialAuthService`, `SessionService` |
| 4 | **Billing webhook no rate limit** | `billing.controller.ts:59` | Add `@Throttle({ default: { limit: 100, ttl: 60_000 } })` |

---

## Phase 2: Pagination & Validation Hardening (Week 2-3)

| # | Issue | Files | Approach |
|---|-------|-------|----------|
| 5 | **Pagination on all list endpoints** | All controllers | Create `PaginationPipe` + `OffsetPaginationDto`; apply to: students, homework, assessments, enrollments, academic years, classes, sections, teachers, guardians, members |
| 6 | **UUID validation on query params** | Multiple controllers | Create `UuidQueryPipe` for optional params: `campusId`, `academicYearId`, `sectionSubjectId`, `studentId`, `sectionId` |
| 7 | **Date validation on query params** | `assessments.controller.ts:54-55`, `attendance.controller.ts:52` | Create `DateQueryPipe` using `z.coerce.date()` |
| 8 | **Status enum validation** | Multiple controllers | Create `EnumQueryPipe` or use `ParseEnumPipe` for `status` params |
| 9 | **Campuses list/get permissions** | `campuses.controller.ts:41-58` | Add `@RequirePermissions(ACADEMIC_READ)` or new `CAMPUS_READ` code |

---

## Phase 3: Web App UX & Architecture (Week 3-4)

| # | Issue | Files | Approach |
|---|-------|-------|----------|
| 10 | **Students page decomposition** (846 lines) | `students-page.tsx` | Split into: `StudentFilters`, `StudentTable`, `StudentDrawer`, `StudentIdCards`, `StudentActions` |
| 11 | **Billing page → React Query** | `billing-page.tsx:92-132` | Convert to `useQuery(['billing', ...])` + `useMutation` |
| 12 | **Session provider waterfall** | `session-provider.tsx:63-182` | Chain queries with `enabled: !!previousQuery.data` |
| 13 | **Global search implementation** | `global-search.tsx` | Implement search API + results dropdown, OR remove UI |
| 14 | **Topbar notification bell** | `topbar-actions.tsx:63,73` | Add `useQuery` for unread count; wire printer button or remove |

---

## Phase 4: Auth Forms & Polish (Week 4)

| # | Issue | Files | Approach |
|---|-------|-------|----------|
| 15 | **Signup form Zod validation** | `signup-form.tsx:74-81` | Add `signupSchema` mirroring `loginSchema` pattern |
| 16 | **Reset password JS validation** | `reset-password-form.tsx:38-41` | Add Zod schema + `minLength` check before submit |
| 17 | **Login empty state** | `login-form.tsx:73` | Show spinner + "Signing in..." text |
| 18 | **Parent redirect fallback** | `admin-home-page.tsx:30-36` | Add timeout + retry button |
| 19 | **Signup ToS/Privacy links** | `signup-form.tsx:235-237` | Add actual `<Link>` URLs |
| 20 | **Verify email dev code display** | `verify-email-form.tsx:88-94` | Ensure `NODE_ENV=production` in all non-dev deploys |

---

## Phase 5: Cleanup & Dead Code (Week 4)

| # | Issue | Files | Approach |
|---|-------|-------|----------|
| 21 | **Chat shell hardcoded theme** | `app-shell.tsx:55` | Remove `data-theme="light"` |
| 22 | **Remove `component-example.tsx`** | `component-example.tsx` | Delete 470-line dead file |
| 23 | **TenantProvider cleanup** | `tenant-context.tsx` | Remove export from index or add deprecation warning |
| 24 | **Schema indexes** | `students.schema.ts`, `roles.schema.ts` | Add composite index on `deletedAt` + unique constraint on `tenantId+code` |
| 25 | **Outbox retry/backoff** | `outbox-processor.service.ts:54-63` | Exponential backoff (3 retries), dead-letter queue |

---

## Phase 6: Architecture Debt (Ongoing)

| Item | Description | Effort |
|------|-------------|--------|
| A | **AuthService → 5 services** | Large refactor; needs interface design first |
| B | **Students page → 5 components** | Medium; extract gradually |
| C | **Pagination DTO adoption** | Low per-endpoint; high consistency value |
| D | **Reusable Zod pipes** | Medium; invest in shared validation layer |

---

## Key Clarifying Questions (Decide Before Starting)

1. **Pagination approach:**
   - A: Add to ALL list endpoints now (breaking for frontend)
   - B: Optional `page/limit` with large defaults (backward compatible)
   - C: New `*Paginated` endpoints alongside existing

2. **AuthService decomposition:** Detailed interface design doc first, or dive into extraction?

3. **Students page decomposition:** Single PR or incremental across multiple PRs?

4. **Global search:** Implement properly (needs backend API) or remove non-functional UI?

5. **Priority order:** N+1 queries (Phase 1) before web app (Phase 3), or interleave?

---

## Estimated Effort

| Phase | Estimated Days | Risk |
|-------|---------------|------|
| 1: Data Integrity | 3-5 | Medium |
| 2: Pagination/Validation | 3-4 | Low |
| 3: Web UX | 4-6 | Medium |
| 4: Auth Forms | 1-2 | Low |
| 5: Cleanup | 1-2 | Low |
| 6: Architecture Debt | 5-10+ | High |

**Total: ~17-29 days** depending on Phase 6 scope.

---

*All previously fixed issues (55+ security, transaction, validation, dead code, permissions) are complete and committed to `feat/notifications-foundation`.*