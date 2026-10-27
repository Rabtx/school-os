# School OS Architecture & Modern Stack Audit Report (`arch_issues.md`)

This report evaluates `apps/web` and `apps/nest-api` against modern best practices for **React 19**, **Next.js 16 (App Router)**, **NestJS 11**, **Zod**, and **Authentication Architecture**.

---

## Executive Overview of Stack Versions
- **Frontend (`apps/web`)**: React `19.2.6`, Next.js `16.2.10`, Zustand `5.0.14`, TanStack Query `5.100.10`, Zod `4.4.3`.
- **Backend (`apps/nest-api`)**: NestJS `11.1.28`, Drizzle ORM `0.45.2`, Zod `4.4.3`.

While both applications utilize latest framework versions, several architectural antipatterns and integration gaps exist regarding React 19 concurrency, Next.js App Router SSR capabilities, NestJS DTO validation, and authentication token caching.

---

## 1. React 19 & Next.js App Router Architecture Issues

### 🟠 1. Pure Client-Side Auth Hydration & Initial Page Flash
- **Location**: [`apps/web/src/store/session-provider.tsx`](file:///home/shabir/work/school-os/apps/web/src/store/session-provider.tsx#L49-L55), [`apps/web/src/modules/auth/components/require-auth.tsx`](file:///home/shabir/work/school-os/apps/web/src/modules/auth/components/require-auth.tsx#L18-L28)
- **Problem**:
  - On page load / full refresh, Zustand in-memory state starts with `token: null` and `authLoading: true`.
  - `SessionProvider` triggers an async `authService.refresh()` call inside a client `useEffect`.
  - During this period, `<RequireAuth>` displays a full-page centered `<Spinner />` until the HTTP roundtrip to `/auth/refresh` completes.
- **React 19 / Next.js Best Practice**:
  - In Next.js App Router, authentication state should be verified on the server side (via Cookies in Server Components or `middleware.ts`).
  - Passing initial session data from a Server Component root down to `<SessionProvider initialSession={session}>` eliminates initial loading spinners and zero-content UI flashes for authenticated users.

### 🟠 2. Over-reliance on Client-Side Data Fetching vs Server Components
- **Location**: `apps/web/src/app/admin/**/page.tsx`
- **Problem**:
  - Every page under `/admin` is rendered as a Client Component (`"use client"`) or delegates rendering to client-side components that fetch data via TanStack Query hooks (e.g., `useStudentsQuery`, `useAcademicYearsQuery`).
  - Next.js App Router's primary strength is Server Component data fetching (zero client JS payload for static HTML, streaming with React Suspense).
- **React 19 / Next.js Best Practice**:
  - Fetch static/initial data in Server Components or pre-fetch query caches using `@tanstack/react-query` `dehydrate` / `HydrationBoundary`.
  - Reserve `"use client"` for interactive leaf components (forms, dialogs, dropdowns) rather than entire page trees.

### 🟡 3. Non-Utilization of React 19 Native Form Actions & `useActionState`
- **Location**: `apps/web/src/modules/auth/components/login-form.tsx`, `apps/web/src/modules/students/components/student-form.tsx`
- **Problem**:
  - Forms use traditional React 18 event handlers (`onSubmit={(e) => { e.preventDefault(); ... }}`) with manual `loading`/`saving` state tracking.
- **React 19 Best Practice**:
  - React 19 introduces native Form Actions, `useActionState`, and `useFormStatus` hooks.
  - Native Form Actions handle pending transitions automatically without requiring manual `isPending` state tracking or custom button disabled flags.

---

## 2. NestJS 11 & Zod Best Practices & Validation Gaps

### 🟠 4. Manual Query Coercion vs Zod Coerced Schemas
- **Location**: [`apps/nest-api/src/modules/attendance/attendance.controller.ts`](file:///home/shabir/work/school-os/apps/nest-api/src/modules/attendance/attendance.controller.ts#L113-L119)
- **Code Reference**:
  ```typescript
  let parsedLimit = 50;
  if (limit) {
      const n = Number.parseInt(limit, 10);
      if (!Number.isNaN(n) && n >= 1 && n <= 200) {
          parsedLimit = n;
      }
  }
  ```
- **Problem**:
  - Query parameters (which arrive as strings from Express HTTP queries) are manually parsed with `parseInt()` inside controller methods instead of leveraging Zod query validation.
- **NestJS & Zod Best Practice**:
  - Define Zod query DTO schemas using `z.coerce.number().min(1).max(200).default(50)`.
  - Pass `@Query(new ZodValidationPipe(historyQuerySchema))` to validate and coerce query parameters automatically at the pipe level.

### 🟡 5. Dual Validation Pipeline Risk (Global Zod Pipe vs Method-Level Pipes)
- **Location**: [`apps/nest-api/src/app.setup.ts`](file:///home/shabir/work/school-os/apps/nest-api/src/app.setup.ts#L48), [`apps/nest-api/src/modules/guardians/guardians.controller.ts`](file:///home/shabir/work/school-os/apps/nest-api/src/modules/guardians/guardians.controller.ts#L48)
- **Problem**:
  - `app.setup.ts` registers a global pipe: `app.useGlobalPipes(new ZodValidationPipe())`.
  - Meanwhile, controllers like `GuardiansController` explicitly instantiate local pipes: `@Body(new ZodValidationPipe(CreateGuardianDto.schema))`.
  - In NestJS, when both global and local pipes exist, Nest runs both. If the DTO class does not have `static schema` attached, the global pipe skips parsing, while the local pipe parses.
- **Recommendation**:
  - Standardize either global schema extraction from DTO metatypes or use explicit `@UsePipes()` decorators consistently across all modules to avoid redundant pipe execution.

---

## 3. Authentication & Session Architecture Gaps

### 🟠 6. In-Memory Access Token Storage vs Page Refresh Latency
- **Location**: [`apps/web/src/store/session-store.ts`](file:///home/shabir/work/school-os/apps/web/src/store/session-store.ts#L14-L18)
- **Problem**:
  - The JWT Access Token is held purely in Zustand memory (`token: string | null`) for security (preventing XSS access to tokens in `localStorage`).
  - However, because in-memory state is wiped whenever a user reloads the browser, every page navigation or hard refresh forces a network call to `POST /api/v1/auth/refresh`.
  - If network latency is high or backend is temporarily slow, the frontend remains stuck on `<Spinner />`.
- **Recommendation**:
  - Consider using HttpOnly session cookies for access tokens or implement Next.js route handler proxying so server-side renders can inject access tokens into initial page props without exposing them to client JavaScript storage.

---

## 4. Summary Matrix of Architectural Issues

| Category | Issue | Severity | Target File / Area | Recommended Action |
| :--- | :--- | :--- | :--- | :--- |
| **Next.js SSR** | Client-side auth refresh causes initial spinner flash | 🟠 Medium | `apps/web/src/store/session-provider.tsx` | Pass initial session from Server Component / Middleware |
| **Next.js SSR** | Complete app reliance on `"use client"` page trees | 🟠 Medium | `apps/web/src/app/admin/*` | Pre-fetch Query hydration on server & restrict `"use client"` to UI components |
| **React 19** | Forms use legacy `onSubmit` handlers instead of Form Actions | 🟡 Low | `login-form.tsx`, `student-form.tsx` | Adopt React 19 `useActionState` and `useFormStatus` |
| **NestJS / Zod** | Manual `parseInt()` query parsing instead of Zod coercion | 🟠 Medium | `attendance.controller.ts:113` | Use `z.coerce.number()` in query DTO schemas |
| **NestJS / Zod** | Redundant global vs local `ZodValidationPipe` execution | 🟡 Low | `app.setup.ts`, `guardians.controller.ts` | Consolidate Zod pipe execution pattern |
| **Auth Arch** | In-memory token wipe forces network refresh on every page load | 🟠 Medium | `session-store.ts`, `session-provider.tsx` | Next.js proxy / Cookie session strategy |
