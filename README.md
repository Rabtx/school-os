# School OS

> **The trust engine for schools. Peace of mind for parents.**

School OS is a **mobile-first, Apple-polished** school management platform built on one premise: **parents want to know their child is safe, and schools want to prove it.**

It is **not a generic ERP**. It is a **trust and communication engine** for affordable private schools (roughly 200–2,000 students) — starting with **Smart Attendance** and WhatsApp alerts, then expanding into communication, academics, finance, and AI-assisted teaching tools.

This repository is the **production monorepo** for that product: Bun, Turborepo, Next.js, Expo, NestJS, optional FastAPI AI assist, shared packages, Docker, and CI.

---

## The killer demo

```text
Teacher scans a student's QR code at the school gate.
→ Within seconds, the parent's phone buzzes on WhatsApp:
  "Rohan has arrived safely at school. 8:17 AM."

Principal's dashboard updates in real time:
  247 students in · 3 absent · 1 late
```

That loop — **scan → parent alert → live dashboard** — is Phase 1. Everything else builds on that trust signal.

---

## Core philosophy

| Principle | What it means in practice |
| --- | --- |
| **Trust first, ERP second** | Every feature answers: *How does this build trust between school and parent?* |
| **Mobile-first** | Teachers and parents live on their phones. Design for **WhatsApp**, not email. |
| **Apple-level polish** | Zero training required. Smooth, intentional, beautiful interactions. |
| **Privacy by default** | Encrypted data, consent tracking, audit logs — especially for minors. |
| **AI assists, humans decide** | AI drafts and flags; policy checks and approvals gate high-impact actions. |
| **Built for the exit** | Clean modules, tenant-safe APIs, documentation — ready for acquisition or white-label. |

**Research-informed messaging (2026):** Use the official **WhatsApp Business Cloud API** (not personal WhatsApp or unofficial gateways). Collect explicit parent opt-in, route all minor communication through guardians, prefer **utility templates** for transactional alerts, respect quiet hours, and let schools tune frequency (exception alerts vs. weekly digests) to avoid notification fatigue.

---

## Who it's for

| Persona | Primary device | Core pain |
| --- | --- | --- |
| **School owner / principal** | Laptop + phone | *Are parents happy? Are admissions up? Is staff accountable?* |
| **Teacher** | Phone (often Android) | *Attendance takes forever. Parents keep calling. Reports are manual.* |
| **Parent / guardian** | Phone (WhatsApp) | *Is my child safe? Did they reach school? What's the homework?* |
| **Student** | Phone | *What's due tomorrow? Did I miss anything?* |

---

## Product modules (roadmap)

| Phase | Focus | Highlights |
| --- | --- | --- |
| **0 — Foundation** | Monorepo, auth, design system | ✅ In progress — see [Built today](#built-today) |
| **1 — Smart Attendance MVP** | The hook | QR check-in, scan UI, WhatsApp/SMS/email alerts, principal dashboard, parent feed |
| **2 — Communication & academics** | Retention | Announcements, teacher–parent chat, homework, timetable, report cards |
| **3 — Finance & AI** | Revenue + moat | Fees, Razorpay/Stripe, AI report comments, early warnings, bus GPS, admissions CRM |
| **4 — Polish & scale** | Exit-ready | UX audit, white-label, performance, demo videos, enterprise isolation |

Detailed backend phases: [production-roadmap](http://localhost:3002/docs/production-roadmap) · Full architecture: [product-system-design](http://localhost:3002/docs/product-system-design) · Vision brief: [product-vision](http://localhost:3002/docs/product-vision)

### Smart Attendance (Phase 1 detail)

| Feature | Why it matters |
| --- | --- |
| QR check-in (phone or card) | Fast gate flow — no special hardware |
| Multi-channel alerts (WhatsApp, SMS, email, push) | Parents get peace of mind on the channel they use |
| Departure + absentee auto-notify | Closes the safety loop; cuts truancy |
| Late arrival log | Discipline with data, not guesswork |
| Bus attendance + GPS (later) | Premium safety and upsell |
| Exportable reports | Saves teachers hours vs. paper registers |

Face recognition stays **optional and off by default** until consent, legal review, and a pilot require it.

---

## Built today

The monorepo is a **production-shaped foundation**. Core school ops (students, attendance, homework, assessments) are **in progress** on web + Nest; parent mobile and WhatsApp remain on the roadmap.

| Area | Status |
| --- | --- |
| Monorepo (Bun, Turbo, Biome, Lefthook, CI) | ✅ |
| Web admin shell + marketing (`apps/web`) | ✅ |
| Expo mobile scaffold (`apps/mobile`) | ✅ |
| NestJS API spine — auth, sessions, MFA, passkeys, profiles (`apps/nest-api`) | ✅ |
| Billing hooks — Stripe / Razorpay (`apps/nest-api`) | ✅ |
| AI assist proxy — FastAPI (`apps/ai-api`) | ✅ |
| Docs site (`apps/docs`) | ✅ |
| Tenants, academic structure, students (table + **ID cards**), guardians, staff | ✅ |
| Attendance (homeroom), teacher dashboard + **my classes** roster (table + **ID cards**) | ✅ |
| Homework, assessments, test planner (teacher/admin) | ✅ |
| Parent/student homework & test views, WhatsApp pipeline | 🔜 Phase 1–2 per roadmap (parent **My children** ID cards + homework live) |

---

## What's in the box (technical)

| Surface | Stack | Role |
| --- | --- | --- |
| **Web** | Next.js 16, React 19, Tailwind 4 | Admin dashboard, marketing, auth, billing |
| **Mobile** | Expo SDK 57, Expo Router, NativeWind | Parent, teacher, guard, bus workflows |
| **API** | NestJS 11, Drizzle, PostgreSQL / Neon | Production backend spine |
| **Docs** | Fumadocs + MDX | Product and engineering documentation |
| **AI assist** | FastAPI (optional) | Proxied by Nest — never public-facing LLM keys |
| **Rust demo** | Axum (optional) | Reference binary / experiments |

Shared packages (`@school-os/ui`, `@school-os/logger`, TypeScript configs), Docker Compose, Dev Container, Lefthook hooks, and CI/CD pipelines are included out of the box.

### Positioning vs. the detailed spec

| Topic | Portfolio spec | This repo (source of truth) |
| --- | --- | --- |
| Backend | FastAPI or Hono / Express | **NestJS** — modules, guards, queues, WebSockets |
| Database | PostgreSQL + SQLite cache | **PostgreSQL** (Neon in prod); Redis planned for cache/queues |
| AI | OpenAI / Ollama | **FastAPI** behind Nest proxy; human approval for high-risk actions |
| Messaging | Twilio / WhatsApp Cloud API | Planned via notification engine + outbox worker |
| Payments | Stripe / Razorpay | **Stripe + Razorpay** providers in `nest-api` billing module |

---

## Quick start

**Prerequisites:** [Bun](https://bun.sh) `1.3.13` · Git · optional Docker Compose `v2.20+` and Rust (for `apps/rust`)

```bash
git clone https://github.com/rabtx/school-os.git
cd school-os
bun install
bun run prepare   # install git hooks (recommended)
bun run dev
```

| App | Dev URL |
| --- | --- |
| Web | http://localhost:3000 |
| Nest API | http://localhost:4000 — `/api/v1/health`, `/api/docs` |
| Docs | http://localhost:3002/docs |

Run a single app:

```bash
bun --cwd apps/web run dev
bun --cwd apps/nest-api run dev
bun --cwd apps/mobile run dev
bun --cwd apps/docs run dev
```

Before pushing changes:

```bash
bun run lint && bun run format && bun run typecheck
```

---

## Architecture

```text
┌─────────────┐   ┌─────────────┐
│  apps/web   │   │ apps/mobile │
│  (Next.js)  │   │   (Expo)    │
└──────┬──────┘   └──────┬──────┘
       │                 │
       └────────┬────────┘
                ▼
       ┌─────────────────┐
       │  apps/nest-api  │◄── optional ── apps/ai-api (FastAPI)
       │    (NestJS)     │
       └────────┬────────┘
                ▼
       ┌─────────────────┐     ┌──────────────────┐
       │ Postgres / Neon │     │ WhatsApp / SMS /   │
       └─────────────────┘     │ email (Phase 1+)   │
                               └──────────────────┘

packages/ui · packages/logger · packages/typescript-config
```

**Core product loop (target):**

```text
Student arrives → attendance event → parent alert → live dashboard → AI risk signal
```

**Engineering loop (target):**

```text
Write to Postgres + outbox in one transaction → worker delivers notifications & realtime → idempotent, auditable side effects
```

Import boundaries and naming rules: `bun run architecture:check`.

---

## Monorepo layout

```text
school-os/
├── apps/
│   ├── web/          Next.js admin + marketing + auth
│   ├── mobile/       Expo Router mobile app
│   ├── nest-api/     NestJS production API
│   ├── docs/         Fumadocs documentation site
│   ├── ai-api/       Optional FastAPI AI assist
│   └── rust/         Optional Rust/Axum demo
├── packages/
│   ├── ui/           Shared shadcn-style components + tokens
│   ├── logger/       Structured logger (TS + Rust)
│   └── typescript-config/
├── docker/           Compose fragments (Postgres, Nest, web)
├── scripts/          Bash + Python utilities
├── .github/workflows CI, CD, security
└── .devcontainer/    Reproducible dev environment
```

---

## Commands

| Command | Purpose |
| --- | --- |
| `bun run dev` | Start dev servers (Turbo; excludes Rust by default) |
| `bun run dev:all` | Start all apps including Rust |
| `bun run dev:ai` | Start FastAPI AI assist only |
| `bun run build` | Build all apps |
| `bun run lint` / `lint:fix` | Biome + ShellCheck + Ruff |
| `bun run format` | Format TS/JS, shell, Python, Rust |
| `bun run typecheck` | TypeScript across workspaces |
| `bun run test` / `test:coverage` | Unit tests + coverage gates |
| `bun run test:e2e:web` | Playwright e2e for web |
| `bun run architecture:check` | Import boundary enforcement |
| `bun run preflight` | Lint + typecheck + test (CI parity) |

---

## Tooling

- **Bun** workspaces + **Turborepo** orchestration
- **Biome** for TS/JS lint and format (tabs, line width 100)
- **Lefthook** pre-commit and commit-msg hooks (Conventional Commits, lowercase)
- Bash: ShellCheck + shfmt · Python: Ruff · Rust: rustfmt + clippy

---

## Docker

```bash
cp env.docker.example .env
docker compose up -d --build
```

| Service | Port |
| --- | --- |
| Web | `:3000` |
| Nest API | `:4000` |
| Postgres (host) | `:5433` |

Optional profiles: `docker compose --profile rust up -d --build` · `--profile ai` for FastAPI.

See [docker/README.md](docker/README.md) and `/docs/docker`.

---

## Deploy

| Piece | Host |
| --- | --- |
| Web + docs | [Vercel](https://vercel.com) (`apps/*/vercel.json`) |
| Nest API | [Render](https://render.com) (`render.yaml`) |
| Database | [Neon](https://neon.tech) (`DATABASE_URL`) |

Guide: `/docs/deploy` ([apps/docs/content/docs/deploy.mdx](apps/docs/content/docs/deploy.mdx)).

---

## Dev Container

Reopen in Container for Bun, Rust, Python/Ruff, and Bash lint tools pre-installed.

```text
Reopen in Container → bun run prepare → bun run dev
```

See [.devcontainer/README.md](.devcontainer/README.md).

---

## Documentation

```bash
bun --cwd apps/docs run dev
```

Key routes (http://localhost:3002/docs/…):

- [product-vision](http://localhost:3002/docs/product-vision) — trust engine positioning and feature spec
- [quick-start](http://localhost:3002/docs/quick-start) — setup and first run
- [production-roadmap](http://localhost:3002/docs/production-roadmap) — phased NestJS build plan
- [product-system-design](http://localhost:3002/docs/product-system-design) — data model, security, APIs
- [architecture](http://localhost:3002/docs/architecture) — boundaries and conventions
- [docker](http://localhost:3002/docs/docker) · [deploy](http://localhost:3002/docs/deploy)

Also see [PROJECT.md](PROJECT.md), [DESIGN.md](DESIGN.md), [AGENTS.md](AGENTS.md), [CHANGELOG.md](CHANGELOG.md).

---

## Monetization (if operated as SaaS)

| Tier | Monthly (indicative) | Includes |
| --- | --- | --- |
| **Pilot** | $0 | Up to ~100 students · attendance + alerts · 1 school |
| **Standard** | $50–$100 | Up to ~500 students · attendance, communication, homework |
| **Premium** | $200–$500 | Unlimited · all modules including AI |
| **Enterprise** | Custom | Multi-school chains · white-label · SLA |

---

## Contributing

1. Fork and clone the repo.
2. `bun install && bun run prepare`
3. Create a branch and make changes.
4. Run `bun run preflight` before opening a PR.
5. Use [Conventional Commits](https://www.conventionalcommits.org/) — lowercase subjects, e.g. `feat(attendance): add qr scan endpoint`.

---

## License

Dual-licensed under **MIT** or **Apache-2.0**:
[LICENSE-MIT](LICENSE-MIT), [LICENSE-Apache-2.0](LICENSE-Apache-2.0).

Thanks ❤️ 
