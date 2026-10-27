# School OS Codebase Deep Audit & Issue Report (`new_issues.md`)

This document provides a comprehensive, deep-research audit of the `school-os` codebase, with a primary focus on `apps/nest-api` (NestJS backend API) and `apps/web` (Next.js web application).

---

## Executive Summary & System Overview

School OS is a multi-tenant school management system built on a monorepo architecture using Turborepo and Bun.
- **`apps/nest-api`**: NestJS application providing the production API layer over PostgreSQL (via Drizzle ORM), using JWT session tokens, custom tenant/permission guards, and Argon2 password hashing.
- **`apps/web`**: Next.js App Router frontend consuming Nest API with React Query, Zustand session management, and Tailwind UI components.

During this deep research, we audited system security, access control, multi-tenancy isolation, route protection, input validation, and state management across both backend and frontend layers. Below is the prioritized list of discovered issues, vulnerabilities, and logical flaws.

---

## 1. Backend (`apps/nest-api`) Issues

### 🔴 HIGH SEVERITY / ARCHITECTURAL & SECURITY RISKS

#### 1. Fail-Open Tenant Isolation in `TenantGuard`
- **Location**: [`apps/nest-api/src/modules/tenants/tenant.guard.ts`](file:///home/shabir/work/school-os/apps/nest-api/src/modules/tenants/tenant.guard.ts#L34-L37)
- **Code Reference**:
  ```typescript
  const tenantId = request.params.tenantId;
  if (typeof tenantId !== 'string' || !tenantId) {
      return true; // <--- FAILS OPEN
  }
  ```
- **Problem**: `TenantGuard` inspects strictly `request.params.tenantId`. If an endpoint is created that receives `tenantId` via `@Query()`, `@Body()`, or standard route parameter without `:tenantId` in the path, `TenantGuard` returns `true` without verifying the user's active membership or status in that tenant.
- **Risk**: Creates an immediate Broken Access Control / IDOR vulnerability on any future endpoints that do not strictly match the `tenants/:tenantId/` URI pattern.
- **Recommendation**: Refactor `TenantGuard` to resolve `tenantId` from route parameters, query strings, and body payload, or throw an explicit `ForbiddenException` if tenant scope cannot be established on tenant-bound controllers.

#### 2. Passkey / TOTP Registration Challenge Lifecycle & State Cleanup Vulnerability
- **Location**: [`apps/nest-api/src/modules/auth/auth-security.controller.ts`](file:///home/shabir/work/school-os/apps/nest-api/src/modules/auth/auth-security.controller.ts#L64-L79), [`apps/nest-api/src/modules/mfa/mfa.service.ts`](file:///home/shabir/work/school-os/apps/nest-api/src/modules/mfa/mfa.service.ts#L29-L48)
- **Problem**: `@Post('passkeys')` accepts `PasskeyRegistrationBodyDto` containing `challengeId`, `name`, and `response`. Pending MFA setup secrets and Passkey WebAuthn challenge nonces saved during setup flows lack strict single-use locks (`consumedAt`) and automatic cleanup timers.
- **Risk**: Stale TOTP setup attempts remain open if setup is aborted mid-way, introducing setup race conditions or secret re-use risks.
- **Recommendation**: Enforce single-use challenge consumption (`consumedAt`) and strict 5-minute TTL locks on TOTP setup secrets.

---

### 🟠 MEDIUM SEVERITY / AUTHORIZATION & ACCESS CONTROL

#### 3. Missing Permission Guard Checks on Campus Read Endpoints
- **Location**: [`apps/nest-api/src/modules/campuses/campuses.controller.ts`](file:///home/shabir/work/school-os/apps/nest-api/src/modules/campuses/campuses.controller.ts#L40-L54)
- **Problem**: The `@Get()` (`listCampuses`) and `@Get(':campusId')` (`getCampus`) endpoints are covered by controller-level `@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)`, but lack `@RequirePermissions(...)` decorators.
- **Mechanism**: `PermissionsGuard` (`permissions.guard.ts:28-30`) evaluates `if (!required?.length) return true;`. Because no permissions are requested on these routes, `PermissionsGuard` permits access to **any authenticated member** of the tenant (including basic student or guardian roles).
- **Recommendation**: Explicitly add `@RequirePermissions(PermissionCodes.CAMPUS_READ)` to all campus read endpoints.

#### 4. Missing Controller-Level `PermissionsGuard` on Navigation & Timetable Endpoints
- **Location**: [`apps/nest-api/src/modules/navigation/navigation.controller.ts`](file:///home/shabir/work/school-os/apps/nest-api/src/modules/navigation/navigation.controller.ts#L12-L13), [`apps/nest-api/src/modules/timetable/timetable.controller.ts`](file:///home/shabir/work/school-os/apps/nest-api/src/modules/timetable/timetable.controller.ts#L12-L13)
- **Problem**: `NavigationController` and `TimetableController` use `@UseGuards(JwtAuthGuard, TenantGuard)` but omit `PermissionsGuard`. While filtering occurs inside service logic, omitting `PermissionsGuard` bypasses structural guard-level authorization checks.
- **Recommendation**: Include `PermissionsGuard` consistently across all tenant-scoped controllers.

---

### 🟡 LOW SEVERITY / DEFENSIVE HARDENING

#### 5. Inconsistent Zod Schema Attachment Across DTOs
- **Location**: [`apps/nest-api/src/common/pipes/zod-validation.pipe.ts`](file:///home/shabir/work/school-os/apps/nest-api/src/common/pipes/zod-validation.pipe.ts#L40-L44)
- **Problem**: Global `ZodValidationPipe` extracts `metatype?.schema` or `metatype?.zodSchema` from NestJS argument metadata. While DTOs like `CreateGuardianDto` attach `static schema = ...`, several DTOs rely on inline schema validation or manual pipe instantiation (`@Body(new ZodValidationPipe(...))`).
- **Risk**: If a developer creates a DTO class without attaching `static schema`, request body validation will silently be bypassed, allowing unvalidated payloads to reach service logic.
- **Recommendation**: Standardize DTO exports to automatically attach `static schema` or enforce schema-based DTO transformers globally.

#### 6. Rust Cargo SQLx Preparation Issue in Monorepo CI
- **Location**: [`apps/rust/src/modules/auth/auth_service.rs`](file:///home/shabir/work/school-os/apps/rust/src/modules/auth/auth_service.rs#L12)
- **Problem**: Running `bun run lint` invokes `cargo clippy` on `apps/rust`, which fails compile-time SQL check because `DATABASE_URL` is not set and pre-prepared `.sqlx` metadata is missing.
- **Recommendation**: Run `cargo sqlx prepare` to generate offline query metadata files in `apps/rust/.sqlx`.

---

## 2. Frontend (`apps/web`) Issues

### 🟠 MEDIUM SEVERITY / ROUTE PROTECTION & UX

#### 1. Absence of Server-Side Route Guard Middleware
- **Location**: [`apps/web/src/app/admin/layout.tsx`](file:///home/shabir/work/school-os/apps/web/src/app/admin/layout.tsx#L11)
- **Problem**: Next.js App Router in `apps/web` does not use a root `middleware.ts` for SSR/edge route protection. Protection relies entirely on client-side React wrappers (`<RequireAuth>`, `<TenantOnboardingGate>`).
- **Impact**: Unauthenticated users navigating directly to protected URLs (`/admin/...`) receive the initial layout HTML skeleton before client-side hydration triggers `router.replace("/login")`.
- **Recommendation**: Implement Next.js `middleware.ts` to inspect session cookies and perform server-side redirects for `/admin` routes before rendering page shells.

#### 2. Unhandled Page-Level Permission Direct Access
- **Location**: `apps/web/src/app/admin/members/page.tsx`, `apps/web/src/app/admin/organization/page.tsx`
- **Problem**: While sidebar navigation items are hidden dynamically based on user permissions, low-privileged users (e.g. teachers or students) who directly enter restricted URLs like `/admin/members` can load the page UI shell until API requests fail with 403.
- **Recommendation**: Add a central `<RequirePermission code="...">` wrapper around administrative pages.

---

### 🟡 LOW SEVERITY / STATE & PERFORMANCE

#### 3. Potential Race Condition on Rapid Tenant Switching
- **Location**: [`apps/web/src/store/session-provider.tsx`](file:///home/shabir/work/school-os/apps/web/src/store/session-provider.tsx#L136-L174)
- **Problem**: In `SessionProvider`, a `useEffect` detects discrepancies between `activeTenantId` in Zustand state and `tenantContext.tenantId` in session. It fires `authService.switchTenant(token, activeTenantId)`. If a user rapidly toggles between multiple tenants in the sidebar, concurrent asynchronous calls to `switchTenant` execute without canceling prior pending requests.
- **Impact**: The response that resolves last overwrites state, which could lead to an inconsistent active tenant context if requests complete out-of-order.
- **Recommendation**: Abort or ignore out-of-order resolution of `switchTenant` using cancellation flags or an AbortController.

#### 4. Theme Toggle Client Hydration Flash
- **Location**: [`apps/web/src/modules/chat/components/header/theme-toggle.tsx`](file:///home/shabir/work/school-os/apps/web/src/modules/chat/components/header/theme-toggle.tsx#L16)
- **Problem**: The theme toggle component forces the initial SSR state to `"light"` and reads `localStorage`/`matchMedia` inside `useEffect` to avoid hydration mismatches.
- **Impact**: Dark mode users experience a brief visual flash of light theme during initial page load.
- **Recommendation**: Use a script-injected CSS class strategy or hydration boundary to prevent theme flashes.

---

## 3. Comprehensive Summary Matrix

| Component | Issue | Severity | Action Needed |
| :--- | :--- | :--- | :--- |
| `nest-api` | `TenantGuard` fails open if `tenantId` is missing from route params | 🔴 High | Refactor `TenantGuard` parameter extraction & enforce non-null check |
| `nest-api` | Passkey/TOTP registration challenges lack strict TTL auto-invalidation | 🔴 High | Enforce single-use consumption & 5-min TTL locks |
| `nest-api` | Campus read endpoints (`GET /campuses`) missing `@RequirePermissions` | 🟠 Medium | Add `@RequirePermissions(PermissionCodes.CAMPUS_READ)` |
| `nest-api` | `NavigationController` and `TimetableController` omit `PermissionsGuard` | 🟠 Medium | Include `PermissionsGuard` at controller level |
| `nest-api` | Inconsistent `ZodValidationPipe` binding on custom DTOs | 🟡 Low | Enforce static schema convention across all DTO classes |
| `rust` | Cargo Clippy fails without `DATABASE_URL` or `.sqlx` preparation | 🟡 Low | Run `cargo sqlx prepare` |
| `web` | Route protection is client-only (missing Next.js `middleware.ts`) | 🟠 Medium | Add `middleware.ts` for server-side auth redirects |
| `web` | Direct navigation to restricted routes lacks UI fallback | 🟠 Medium | Add `<RequirePermission>` guard wrappers to admin pages |
| `web` | Race condition during rapid tenant switching in `SessionProvider` | 🟡 Low | Add async cancellation check for `switchTenant` |
| `web` | Theme toggle hydration causes brief UI flash for dark mode users | 🟡 Low | Implement zero-FOUC theme script strategy |
