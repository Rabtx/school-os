# School OS - Project overview

This document is the deeper technical reference for the School OS monorepo.
For product vision and positioning, see `README.md` and `/docs/product-vision`.
For quick setup/use, start with `README.md`.

## What this repository includes

Monorepo school-os managed by **Bun + Turborepo**, with:

- Multiple app templates (web, mobile, API, docs, Rust)
- Shared workspace packages (`@school-os/*`)
- Polyglot scripts and quality tooling
- Architecture boundary checks
- Git hooks and CI/CD/security pipelines
- Optional Docker and Dev Container workflows

## Repository layout

```text
school-os/
├── apps/                     # Runnable applications
│   ├── web/                  # Next.js app
│   ├── mobile/               # Expo Router + NativeWind app
│   ├── nest-api/             # NestJS production API
│   ├── docs/                 # Documentation app (Next.js + Fumadocs)
│   └── rust/                 # Rust binary app (Cargo)
├── packages/
│   ├── logger/               # Shared logger (TypeScript + Rust)
│   ├── typescript-config/    # Shared TS config bases
│   └── ui/                   # Shared web UI primitives + design tokens
├── scripts/                  # Bash, Python scripts and tests
├── docker/                   # Docker Compose fragments
├── .github/workflows/        # CI/CD/security workflows
├── .devcontainer/            # Reproducible development environment
├── .oxlintrc.json            # Linter config (TS/JS)
├── .oxfmtrc.json             # Formatter config (TS/JS)
├── lefthook.yml              # Git hooks
├── turbo.json                # Turborepo pipeline
├── package.json              # Root scripts + workspaces
├── CHANGELOG.md              # Keep a Changelog history
└── AGENTS.md                 # Universal AI agent guidance
```

Documentation is served by `apps/docs` (`bun --cwd=apps/docs run dev` → http://localhost:3002/docs).
There is no root `docs/` directory.
## Apps and stacks

| App | Stack | Notes |
| --- | --- | --- |
| `apps/web` | Next.js 16, React 19, Tailwind 4 | Includes unit/integration and Playwright e2e flow |
| `apps/mobile` | Expo SDK 57, Expo Router, React Native, NativeWind | Mobile-first file-based routing |
| `apps/nest-api` | NestJS 11, Zod, Jest | Production API spine |
| `apps/docs` | Next.js + Fumadocs + MDX | Project docs site |
| `apps/rust` | Cargo, clippy, rustfmt | Rust application template |

## Shared packages

| Package | Workspace import | Purpose |
| --- | --- | --- |
| `packages/ui` | `@school-os/ui` | Shared web UI primitives + design tokens |
| `packages/logger` | `@school-os/logger` | Shared structured logger for TypeScript and Rust |
| `packages/typescript-config` | `@school-os/typescript-config` | Reusable TypeScript config presets |

## Root command surface

Run commands from repo root:

| Command | Purpose |
| --- | --- |
| `bun run dev` | Start `dev` tasks via Turborepo |
| `bun run build` | Build workspace targets |
| `bun run start` | Start runtime targets |
| `bun run lint` | Lint workspace + scripts |
| `bun run lint:fix` | Apply lint autofixes |
| `bun run format` | Format TS/JS + shell/Python + Rust |
| `bun run typecheck` | TypeScript type checking |
| `bun run test` | Run tests in workspace + scripts |
| `bun run test:coverage` | Run full coverage-oriented pass |
| `bun run test:e2e:web` | Web Playwright e2e |
| `bun run architecture:check` | Enforce architecture boundaries + kebab-case naming |
| `bun run preflight` | Lint + typecheck + test |
| `bun run prepare` | Install git hooks (Lefthook) |

### Running one app directly

Use:

```bash
bun --cwd <app-path> run <script>
```

Examples:

- `bun --cwd=apps/web run dev`
- `bun --cwd=apps/mobile run start`
- `bun --cwd=apps/nest-api run dev`
- `bun --cwd=apps/docs run dev`
- `bun --cwd=apps/rust run dev`

## Tooling and quality system

### Monorepo and package management

- **Bun** is the only package manager (`bun@1.3.11`)
- Workspaces: `apps/*` and `packages/*`
- **Turborepo** orchestrates shared tasks (`turbo.json`)

### Linting and formatting

- **oxlint** and **oxfmt** are the TS/JS linter and formatter (`.oxlintrc.json`, `.oxfmtrc.json`)
- Formatting style: tabs, line width 100
- Root `format` and `lint` scripts also run language-specific tools

### Language-specific tools

- **Bash:** `shellcheck`, `shfmt`
- **Python:** `ruff`, `pytest`
- **Rust:** `cargo fmt`, `cargo clippy`, `cargo test`

### Git hooks

Configured in `lefthook.yml`:

- Pre-commit: trailing whitespace fix, format, lint:fix, typecheck, architecture check
- Safety checks: large file guard, secret scan
- Commit-msg hook: message quality rules

Install hooks with:

```bash
bun run prepare
```

### Architecture enforcement

- Rule checks run via `bun run architecture:check`
- Script location: `scripts/architecture/check-boundaries.sh`
- See docs app `/docs/architecture` for boundaries and allowed dependency flow

## CI/CD and security

- **CI:** `.github/workflows/ci.yml` runs lint/typecheck/test/e2e jobs
- **CD:** `.github/workflows/cd.yml` is a staged deploy template (`main` and version tags)
- **Security:** `.github/workflows/security.yml` + Dependabot + CodeQL

## Docker workflow

Postgres, Nest API, and Next.js are composed through root `docker-compose.yml` with fragment
files under `docker/compose/` (Compose Spec — no top-level `version` key).

```bash
cp env.docker.example .env
docker compose up -d --build
```

Defaults: web `3000`, Nest `4000`, Postgres host `5433`. Optional Rust profile:
`docker compose --profile rust up -d --build`.

More details: docs app `/docs/docker` and `docker/README.md`.

## Dev Container workflow

`.devcontainer/` provides a reproducible setup with Bun, Rust, C, Python, Lua, and related tools.

- Open in VS Code/Cursor and choose **Reopen in Container**
- See `.devcontainer/README.md` for exact toolchain and post-create steps

## Conventions and development rules

- Primary repository guidance: `AGENTS.md`
- Cursor-specific rules: `.cursor/rules/`
- Architecture baseline: docs app `/docs/architecture`
- Override process: docs app `/docs/overrides`
- Use workspace imports as `@school-os/<package>`

## Product modules (Nest + web admin)

Recent admin and teacher surfaces wired to the Nest API:

| Module | Web routes | Notes |
| --- | --- | --- |
| Students | `/admin/students` | Table + **ID card** roster view, admit/enroll, profile drawer |
| My classes (teacher) | `/admin/my-classes`, `/admin/my-classes/[sectionId]` | Same table + **ID cards**, search/filter, profile drawer, classroom shortcuts |
| Homework | `/admin/homework`, detail by id | Whole-class or selected students, AI draft assist |
| Assessments | `/admin/assessments` | Scheduling, targeting, links to planner |
| Test planner | `/admin/test-planner` | Week view of scheduled assessments |
| Teacher home | `/admin` (teacher role) | **Command center** — digest, instant actions, prefs, student insights in roster drawer |

Migrations `0017_homework_assessments` and `0018_homework_assessments_v2` add homework/assessment tables,
recipients, planner fields, and role permissions. Apply with `bun --cwd=apps/nest-api run db:migrate`.

## Related docs

- `README.md` - quick start and high-level navigation
- Docs app (`apps/docs`): `/docs/product-vision`, `/docs/teacher-experience`, `/docs/academics-homework-assessments`, `/docs/production-roadmap`
- `scripts/README.md` - script usage and structure
- `apps/*/README.md` - per-app setup and workflows
