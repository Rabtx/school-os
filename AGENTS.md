# Agent instructions (School OS)

Universal instructions for AI agents (Cursor, Copilot, Claude Code, Windsurf, Cline, Aider, etc.).
Read this file first when working in this repo.

## Project overview

Monorepo School OS managed with **Turborepo + Bun**. Apps, shared packages, and
multi-language scripts, all wired into a single lint/format/build/test surface.

## Before you write code

Multi-agent coordination lives in [.agents/](.agents/README.md). Load these in order:

1. This file
2. [.agents/README.md](.agents/README.md) — the protocol and directory map
3. [.agents/agent-contract.md](.agents/agent-contract.md) — behaviour, evidence, violation policy
4. Exactly one charter from [.agents/roles/](.agents/roles/README.md) — who you are and what you own
5. [.agents/worktrees.md](.agents/worktrees.md) — branch, port and worktree lifecycle
6. Your board card from [.agents/board/](.agents/board/README.md)

The short version: claim a card before coding, work in your own worktree on
`agent/<role>/<card-slug>`, write only inside the card's scope, stage explicit paths rather than
`git add -A`, and record real validation output on the card. `main` is integration-only.
[.agents/ownership.yaml](.agents/ownership.yaml) is the machine-readable role-to-path map.

## UI design context

Before changing UI, read [DESIGN.md](DESIGN.md), starting with **School OS design source** and
**Rabtx UI: shared design intent**. Product screens follow the School OS Figma file
(`fD9WERKwofFmMtjGC0K46P`); components follow the rabtx design system. Figma wins over this repo on
visual decisions. Tokens live in `packages/rabtx/src/styles/tokens.css` and the web app's theme
points at them. The dependency policy still holds (no animation library; motion is CSS only), as do
the tiered radius and the Flat / Floating depth (Floating includes Figma's soft cast shadows). Do not
infer the design solely from existing code, and do not extend `@school-os/ui` components: new work
goes in `@rabtx/ui`.
Keep that document as the shared source of truth instead of copying design rules into agent-specific folders.

## Documentation

There is **no root `docs/` folder**. Project docs live in the docs app:

- Source: `apps/docs/content/docs/`
- Dev: `bun --cwd=apps/docs run dev`
- Browse: http://localhost:3002/docs

Key routes: `/docs/quick-start`, `/docs/production-roadmap`, `/docs/architecture`,
`/docs/docker`, `/docs/deploy`, `/docs/qol`, `/docs/ai-first-workflow`, `/docs/overrides`,
`/docs/product-system-design`. Also see root `README.md`, `PROJECT.md`, and `DESIGN.md`.

<!-- BEGIN:nextjs-agent-rules -->

# Next.js: ALWAYS read docs before coding

Before any Next.js work, find and read the relevant doc in `node_modules/next/dist/docs/`. Your training data is outdated — the docs are the source of truth.

<!-- END:nextjs-agent-rules -->
## Repository layout

```
school-os/
├── apps/
│   ├── web/             # Next.js (React, Tailwind, shadcn-style UI)
│   ├── mobile/          # Expo Router + Uniwind app (TypeScript)
│   ├── nest-api/        # NestJS production API (PostgreSQL in later phases)
│   ├── docs/            # Docs site (Fumadocs); source in apps/docs/content/docs/
│   └── rust/            # Rust binary (Cargo, Axum)

├── packages/
│   ├── typescript-config/ # Shared tsconfig bases (base.json, nextjs.json)
│   ├── ui/              # @school-os/ui: legacy shadcn-style components (being replaced) + shared tokens
│   ├── rabtx/           # @rabtx/ui: the from-scratch component library (web + native), see DESIGN.md
│   └── logger/          # Shared logger (TS + Rust)
├── scripts/             # Utility scripts: bash/, python/
├── docker/              # Docker Compose fragments (see docker/README.md)
├── .agents/rules/       # Cursor-specific rules (also summarised below)
├── .devcontainer/       # Dev Container (Bun, Rust, Python, Bash tooling)
├── .github/workflows/   # CI (lint, typecheck, build, test)
└── (root config)        # .oxlintrc.json, .oxfmtrc.json, turbo.json, lefthook.yml, etc.
```

## Tooling and commands

| Tool | Purpose | Config |
|------|---------|--------|
| **Bun** | Package manager and script runner (not npm/yarn/pnpm) | `package.json` workspaces |
| **Turborepo** | Monorepo orchestration | `turbo.json` |
| **oxlint** | Lint for TS/JS | `.oxlintrc.json` |
| **oxfmt** | Format for TS/JS | `.oxfmtrc.json` (tabs, line width 100) |
| **Lefthook** | Git hooks (pre-commit, commit-msg) | `lefthook.yml` |
| **EditorConfig** | Consistent indent/charset/line endings | `.editorconfig` |

**Run everything from repo root:**

| Command | What it does |
|---------|-------------|
| `bun install` | Install all dependencies |
| `bun run prepare` | Install git hooks (lefthook) |
| `bun run dev` | Start all dev servers (Turbo) |
| `bun run build` | Build all apps (Turbo) |
| `bun run lint` | Lint: oxlint (TS/JS) + ShellCheck + ruff |
| `bun run lint:fix` | Lint with auto-fix |
| `bun run format` | Format: oxfmt + shfmt + ruff + cargo fmt |
| `bun run typecheck` | TypeScript typecheck |
| `bun run test` | Run tests (e.g. cargo test) |
| `bun run test:coverage` | Run TS coverage + all language tests |
| `bun run test:e2e:web` | Run web Playwright e2e tests |
| `bun run architecture:check` | Enforce architecture import boundaries + kebab-case naming |
| `bun run naming:check` | Enforce kebab-case (dotted Nest-style) file/folder names |

## Conventions

### Code style

- **Formatter**: oxfmt. Tabs, line width 100. Applies to `apps/**/*.ts(x)`, `packages/**/*.ts(x)`,
  root config files. Run `bun run format` or rely on pre-commit hook.
- **No ESLint/Prettier**: oxlint and oxfmt are the only lint/format tools for TS/JS in this project.
- **Naming**: PascalCase for components; files match component name. Hooks use `use*` prefix;
  utility functions are plain named exports.
- **Imports**: Prefer workspace imports as `@school-os/<package>` (e.g. `@school-os/ui`).
  Group: external → workspace → relative. No unused imports.
- **Types**: Explicit types for props and public APIs. Avoid `any`; use `unknown` and narrow.
- **Errors**: Handle explicitly — log and rethrow, or use result types. No silent catches.
- **Size**: Small, single-responsibility functions and components. Extract when complexity grows.

### Project structure

- **Monorepo**: Apps in `apps/`, shared code in `packages/`. When a change applies across apps,
  prefer changing a shared package.
- **New apps**: Add under `apps/`, wire into `turbo.json` tasks if needed.
- **New packages**: Add under `packages/`, export via `@school-os/<name>`.
- **Shared UI**: new and rebuilt components live in `packages/rabtx` (`@rabtx/ui`), built on
  platform features first (see the dependency policy in `DESIGN.md`). `packages/ui` (`@school-os/ui`)
  is the legacy shadcn-style set being replaced; do not add to it. Shared Tailwind tokens still
  live in `packages/ui/src/styles/globals.css`. Icons are HugeIcons only; do not add lucide.
- **TypeScript config**: Extend from `packages/typescript-config/base.json` (or `nextjs.json`
  for Next.js apps).
- **Expo mobile structure**: Use `src/app` for routes, `src/components/ui` for UI primitives,
  and `src/components` for non-UI reusable components.
- **Safe area in mobile**: Use `react-native-safe-area-context` instead of deprecated
  `react-native` `SafeAreaView`.

### Git and commits

- **Pre-commit hooks** (Lefthook): auto-format, lint, typecheck, large-file guard (2 MB max),
  secret scan, architecture check. Hooks run automatically if installed via `bun run prepare`.
- **Commit messages**: Enforced by `commit-msg` hook — Conventional Commits only
  (`feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert`), **all lowercase**,
  10–200 chars, no WIP. Example: `feat(auth): add nestjs login and shared ui forms`.
- **Do not commit**: build output (`.next/`, `dist/`, `target/`), `node_modules/`, `.env` files,
  cache dirs. These are in `.gitignore`.
- **Separate concerns**: Don't mix lint/format-only fixes with feature changes in the same commit.

### Per-language notes

| Language | Lint | Format | Test |
|----------|------|--------|------|
| **TypeScript/JS** | oxlint | oxfmt | Vitest/Jest (if added) |
| **Rust** | Clippy | rustfmt | `cargo test` |
| **Bash** | ShellCheck | shfmt | — |
| **Python** | ruff check | ruff format | — |

### Docker

Postgres, Nest API, and Next.js via Compose fragments under `docker/compose/`
(merged by root `docker-compose.yml`, Compose v2.20+, no `version:` key):

```bash
cp env.docker.example .env
docker compose up -d --build
```

Defaults: web `:3000`, Nest `:4000`, Postgres host `:5433`. Optional Rust:
`docker compose --profile rust up -d --build`. Host-only API/web: start `postgres`
only, then `bun run dev`. See `/docs/docker` and `docker/README.md`.

## Before finishing any task

1. Run `bun run lint` from repo root — fix any errors.
2. Run `bun run format` from repo root — ensure formatting is clean.
3. If you changed TypeScript, run `bun run typecheck`.
4. Do not leave dead code, unused imports, or `any` types.

## Key files to read for deeper context

- `PROJECT.md` — detailed layout, tooling, and commands.
- `DESIGN.md` — design-system brief for UI generation and review.
- **Docs app** (`apps/docs`, run with `bun --cwd=apps/docs run dev`):
  - `/docs/production-roadmap` — production build phases and Nest API spine
  - `/docs/ai-first-workflow` — School OS audit and AI-first workflow roadmap
  - `/docs/qol` — full QoL stack (hooks, CI, per-language tools)
  - `/docs/architecture` — architecture baseline and enforceable boundaries
  - `/docs/overrides` — policy for project-specific architecture overrides
  - `/docs/docker` — Docker Compose setup
  - `/docs/deploy` — Vercel (web/docs) + Render (Nest) + Neon
  - `/docs/product-system-design` — product architecture and security model
- `.agents/skills/expo-mobile/SKILL.md` — Expo Router + EAS + official Expo Skills / LLM doc links for `apps/mobile`.
- `.agents/skills/browser-ui-test/SKILL.md` — Browser UI/UX verification via Playwright MCP + `apps/web` e2e after interactive web changes.
- `.agents/rules/expo-ai-agents.mdc` — Expo remote skills URL, skill table, `llms.txt` bundles (when working under `apps/mobile/**`).
- `docker/README.md` — Compose fragment layout and `-f` fallback.
- `.oxlintrc.json` — oxlint rules. `.oxfmtrc.json` — oxfmt formatting.
- `lefthook.yml` — Git hook definitions.
- `turbo.json` — Turborepo pipeline config.

<!-- BEGIN:turborepo-agent-rules -->

# This is NOT the Turborepo you know

Turborepo configuration, task behavior, and CLI commands can vary between installed versions and may differ from your training data. Resolve the `turbo` package from this file's directory or relevant workspace; in monorepos, it may not be visible from the repository root. For example, run `node -p "require.resolve('turbo/package.json')"` from a workspace that depends on `turbo`.

Read `docs/README.md` inside that installed package first, then read the relevant pages from its `docs/` directory before changing Turborepo configuration or commands. Heed deprecation notices. These bundled docs match the installed package version and are available without network access.

This block is written and re-added by `turbo` before repository-scoped commands when an AI agent is detected. In the Turborepo source repository, its template is defined in `crates/turborepo-cli/src/cli/agent_guidance.rs`. Removing the managed block while updates are enabled means a later qualifying invocation will add it again. Set `"agentGuidance": false` in the root `turbo.json` or `turbo.jsonc` to opt out; this does not remove an existing block. Keep the block committed with your work to avoid an uncommitted change on the next agent invocation.
<!-- END:turborepo-agent-rules -->
