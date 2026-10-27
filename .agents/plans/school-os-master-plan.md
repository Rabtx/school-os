# School OS master plan

The plan to take School OS from the current monorepo to a complete product: the trust engine for
schools, with an AI layer that drafts while people approve. Each phase ships as one or more PRs that
are tested end to end (unit, Playwright, and migrations in Docker) before merge. Board cards in
`.agents/board/` track the work; this file is the map.

Sources: the School OS Figma file (`fD9WERKwofFmMtjGC0K46P`, see `DESIGN.md`), the product map page
in that file (roles, AI layer, modules, learning loop) and the audits in `plans/audits/`.

## Principles (enforced in code, not just stated)

1. **Trust.** Every action is logged with who asked and who approved. Parents see what matters.
   Corrections notify everyone affected. Audit history is never deleted.
2. **The school's rules.** Policies (attendance, fees, approvals, messaging hours) live in a
   deterministic rules engine the backend enforces. AI may help write a rule; plain code runs it.
3. **AI native, AI optional.** Every action is an API endpoint and a screen first. AI is another
   client of the same API, acting with the user's own permissions, and every write it proposes goes
   through the approvals queue. A school or a person can turn AI off and lose nothing else.
4. **Least access.** Permissions say what a role may do; record scope says to whom: management sees
   the school, a teacher their classes, a parent their children, a student themselves.
5. **Figma wins** on visual decisions. New UI is built on `@rabtx/ui`.

## Phase map

| Phase | Outcome | Status |
| --- | --- | --- |
| 1. Starter baseline | Agent conventions, toolchain, deps, rabtx tokens from Figma | Done (PR #101) |
| 2. Backend hardening | Fail-closed tenancy, record scope, reliable outbox, audit retention, Docker migrations | In review; follow-ups in cards |
| 3. Web reskin | App shell and existing screens rebuilt to the Figma frames on `@rabtx/ui` | In progress (PR #103) |
| 4. Trust loop | Approvals engine, rules engine, notices and messages, real WhatsApp delivery, consent, phone OTP | |
| 5. Phones | Expo parent app, teacher app, offline gate scanner | |
| 6. AI layer | Tool registry, drafts into approvals, RAG over school knowledge, school memory, voice, evals | |
| 7. Learning loop | Tests, AI checker, publish marks, report cards, parent summaries | |
| 8. Operations | Fees and payments, admissions, timetable builder, transport and gate, payroll, automations | |
| 9. Production | Observability, backups, Urdu and RTL, accessibility, load and security testing | |

## Work order (board cards)

Each row is a card in `.agents/board/` (`str-<slug>`). Work top to bottom; a card starts only when
its `depends_on` cards are done. Status lives in the card's folder (`open/`, `doing/`, `done/`).

| # | Card | Phase | Priority | Depends on |
| --- | --- | --- | --- | --- |
| 1 | `web-reskin-shell-lists`: shell, dashboard, list pages | 3 | high | (PR #103) |
| 2 | `web-reskin-detail-screens`: profile, guardians, roll call, homework, gradebook, timetable, reports, settings | 3 | high | 1 |
| 3 | `auth-session-hardening`: tokens, CSRF, sign-in findings | 2 follow-up | high | |
| 4 | `web-states-and-command-search`: shared states, ⌘K, menus | 3 | normal | 1 |
| 5 | `web-reskin-teacher-screens` | 3 | normal | 2 |
| 6 | `rabtx-ui-components`: promote building blocks into `@rabtx/ui` | 3 | normal | 1 |
| 7 | `schema-integrity`, `api-validation`, `query-performance`, `web-server-auth` | 2 follow-up | normal | |
| 8 | `rules-engine-attendance` | 4 | high | |
| 9 | `approvals-engine` | 4 | high | 3 |
| 10 | `messages-and-notices` | 4 | high | 9 |
| 11 | `whatsapp-delivery` | 4 | high | 10 |
| 12 | `phone-otp-sign-in` | 4 | high | 3 |
| 13 | `consent-and-privacy` | 4 | normal | |
| 14 | `students-list-enrichment`: tags, attendance trend, last alert | 4 | normal | |
| 15 | `ai-tool-registry` | 6 | high | 9 |
| 16 | `ai-rag-pgvector` | 6 | high | 15 |
| 17 | `ai-memory-evals-controls` | 6 | normal | 15 |
| 18 | `phase-5-phones` | 5 | normal | 6, 12 |
| 19 | `phase-7-learning-loop` | 7 | normal | 15 |
| 20 | `phase-8-operations` | 8 | normal | 9 |
| 21 | `phase-9-production` | 9 | normal | |

## Phase 2: backend hardening

Goal: nothing built later can leak data across schools or between families, and no alert is lost.

- **Fail-closed tenancy.** `TenantGuard` rejects a tenant-scoped request it cannot resolve a tenant
  for, instead of letting it through. The AI controller takes the tenant from the route like every
  other module, so AI requests always carry a verified school.
- **Record scope.** One `AccessScopeService` answers "may this membership see this student / section
  / guardian?" (management: school; teacher: assigned sections; parent: linked children; student:
  self). Students, attendance, homework, gradebook, assessments, guardians and reports call it
  instead of re-implementing the rule. Unit tests per role and per module.
- **Reliable outbox.** Claimed events get a lease (`locked_until`); a sweeper returns expired leases
  to `pending`. Failures retry with backoff up to a maximum, then move to `dead`. A notification is
  never stuck in `processing` or silently dropped.
- **Audit retention.** Deleting a user or a school no longer cascades into `audit_logs`; references
  become nullable and the actor's label is kept. Audit rows are append-only at the database layer.
- **Hygiene jobs.** A daily cleanup removes expired auth challenges, WebAuthn challenges, sessions
  and invites.
- **Migrations in Docker.** `docker compose up` builds the API, runs migrations against the Postgres
  container and passes the health check; a CI-runnable script proves a fresh database migrates.
- **Audit triage.** Every open item in `plans/audits/` becomes a board card or is closed as fixed.

Delivered in the Phase 2 PR: all of the above. The open audit items are grouped into five cards in
`.agents/board/open/` (auth and sessions, schema integrity, query performance, API validation,
server-side web auth); `plans/audits/triage.md` records what is already fixed. The auth and sessions
card is high priority and lands before parents sign in by phone in Phase 4.

Docker: `cp env.docker.example .env`, generate the three secrets as the file shows, then
`docker compose up -d --build`. The API runs migrations on start (`RUN_MIGRATIONS=true`).

## Phase 3: web reskin to Figma

Goal: the web app looks and behaves like the Figma frames, on `@rabtx/ui`, with no regressions.

Order (each a PR or a group of small PRs):

1. **App shell:** sidebar (school switcher, primary navigation with counts, classes, reports,
   WhatsApp status, user), top bar (breadcrumb, search, notifications), command search, avatar menu.
2. **Principal daily screens:** dashboard (stat row, attendance overview, check-in method, parent
   alerts, today's check-ins), students (+ empty, row menu, filters, new student), student profile,
   guardians, roll call, homework, gradebook, timetable, reports, settings.
3. **Teacher screens:** home, my classes, roll call, homework, check answers, marks, report cards.
4. **States everywhere:** loading, no results, offline and error, success and undo, confirm risky
   action, bulk select, no access, "AI is not sure".
5. **Components** added to `@rabtx/ui` as screens need them (sidebar, nav item, table, stat card,
   tabs, segmented control, dialog, menu, toast, empty state, avatar), each with docs and a spec.

Screens whose backend is not built yet (approvals, automations, fees) wait for their phase.

## Phase 4: the trust loop

- **Approvals engine:** one model for every request (type, drafted payload, risk, requester,
  approver role, decision, reason, expiry, undo window, resulting action). Notices, leave, marks
  changes, gate passes, seat offers and role changes are approval types. Matches the Figma approval
  states (approved, declined with reason, expired, undone, waiting for the owner, all caught up).
- **Rules engine:** typed policies per school, starting with attendance (cut-off, grace, late
  marking, absence alert timing, quiet hours) and evaluated server-side.
- **Messages and notices:** threads between school and families, notices and announcements with
  audiences, templates, delivery and read state.
- **WhatsApp delivery:** a provider interface with Meta Cloud API first, approved templates,
  delivery and read receipts, SMS fallback, retries through the outbox. Bilingual (English and Urdu)
  templates from day one.
- **Consent and privacy:** consent records per guardian and channel; medical access is logged.
- **Phone OTP sign-in** for parents.

## Phase 5: phones

- **Parent app (Expo)** from the Figma v2 frames, light and dark: sign in by phone, today feed,
  attendance, homework, results, fees, messages, notices, bus, leave, assistant, settings, states.
- **Teacher app:** today, classes, roll call, new homework, inbox, chat, student.
- **Gate scanner:** QR and NFC, offline queue in SQLite with background sync, duplicate protection.

## Phase 6: AI layer

- **Tools, not guesses:** the AI calls the same NestJS endpoints as the UI through a typed tool
  registry, with the user's token, so it can never see more than that user can.
- **Draft, approve, act:** every write the AI proposes becomes an approval with its evidence.
- **RAG over school knowledge:** `pgvector` in the same Postgres; documents (handbook, fee policy,
  syllabus, notices, lesson plans) chunked with `tenant_id` and an access label on every chunk, and
  a permission filter on every search. Answers cite their sources.
- **School memory:** every draft and its approved edit is stored per school and used as examples,
  so the AI learns the school's tone and corrections. The same pairs become an evaluation set.
- **Confidence:** low-confidence drafts are routed to a person and shown as "AI is not sure".
- **Voice:** speech to text for teachers ("Mark 8-A present except Ali and Sara"), same tools.
- **Controls:** AI on or off per school and per person; usage limits; prompts and outputs logged
  without unnecessary personal data.

## Phase 7: learning loop

Assign (teacher, voice or tap) → take (student, web or phone) → check (AI marks, teacher confirms)
→ publish (teacher approves marks) → parent sees a short summary → AI suggests follow-up homework.
Includes the test taker with its states (time running low, connection lost, submit with blanks,
left the page, time is up), report cards with AI-written comments sent to the principal, and
"ask about a mark".

## Phase 8: operations

Fees (structures, invoices, waivers through approvals, reminders, JazzCash, Easypaisa and card
payments, receipts), admissions pipeline (enquiry to seat offer), timetable builder (with "make with
AI"), transport and gate (routes, pickups, visitors, one-time codes), staff and payroll (salaries,
advances, cover), money (expenses, budgets), automation builder (describe a flow in words, preview,
approve before it runs), owner overview across campuses.

## Phase 9: production readiness

Structured logs, traces and error tracking; backups and restore drills; rate limits per route;
Urdu and right-to-left layouts; accessibility audit; load tests on attendance peaks (morning gate);
penetration test; data retention and export for schools.

## Definition of done for every PR

- Lint (0 warnings), format, typecheck including specs, unit tests, Playwright e2e for touched flows.
- Migrations apply on a fresh database and on the previous schema, in Docker.
- No new CodeQL or dependency-review findings.
- Screens compared against their Figma frame; node IDs recorded on the card.
