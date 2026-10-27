# Agent coordination hub

Cross-team communication for the agents building this monorepo:
**backend** (NestJS), **web** (Next.js), **mobile** (Expo), **rust** (Axum),
**ai-python** (FastAPI), **ui-ux** (the design system), and the human.

```
.agents/
├── agent-contract.md ← universal behavior, evidence, and violation policy
├── ownership.yaml    ← role-to-path ownership map for CI and future PM tooling
├── roles/            ← role charters loaded before each agent session
├── worktrees.md      ← branch, port, and worktree lifecycle
├── README.md         ← you are here (protocol)
├── board/            ← kanban-style cards anyone can raise
│   ├── README.md     ← board conventions (raise, claim, close)
│   ├── template.md   ← copy this to raise a card
│   ├── open/         raised, waiting for an owner
│   ├── doing/        claimed and in progress
│   └── done/         resolved (kept for history)
├── notes/            ← scratchpad, one file per team
│   ├── backend.md    owned by backend agent
│   ├── frontend.md   owned by web agent
│   ├── mobile.md     owned by mobile agent
│   ├── rust.md       owned by rust agent
│   └── design.md     owned by ui-ux agent
├── plans/            ← long-form implementation plans
├── rules/            ← always-apply editor rules (`.mdc`)
├── skills/           ← vendored agent skills (see below)
└── uniwind.txt       ← vendored Uniwind/Tailwind docs for mobile styling
```

Everything above `rules/` is project policy and is owned by the human. `rules/` mirrors the
editor rules, and `skills/` plus `uniwind.txt` are vendored reference material copied from
upstream projects — read them for guidance, but they are not project policy, are not covered by
`ownership.yaml`, and may carry upstream files (including their own `.github/`) that do not
apply here.

## Rules of engagement

1. **Load your role contract.** Before acting, read `agent-contract.md` and exactly one relevant
   charter from `roles/`. The charter tells you who you are, what you own, what you must not
   touch, and which checks prove the work.
2. **Own your notes file.** `notes/backend.md` belongs to the backend agent, etc.
   Everyone can read them; only the owner writes them. To reach another team,
   raise a **card** addressed to them — do not edit their file.
3. **API contracts have one home**: `apps/docs/content/docs/backend-api.mdx`.
   Cards and notes link to it; they never duplicate full endpoint contracts.
4. **Cards are cheap and public.** Raise one whenever you need something from
   another team, found a bug outside your area, or must announce a breaking change.
5. **Declare scope before working.** Every implementation card records its type, scope, owner,
   reviewer, dependencies, branch, and worktree. The card may narrow the role's ownership but may
   not silently widen it.
6. **Use an isolated worktree.** For new implementation work, use
   `wtp add -b agent/<role>/<card-slug> main` and record the branch and path on the card. `main`
   is integration-only.
7. **Claim before working.** Move `open/ → doing/`, fill `assignee` in the card.
8. **Escalate cross-scope work.** Read broadly, write narrowly. If another area must change, raise
   a card or obtain explicit owner approval and list the shared path on the current card.
9. **Close the loop.** When done, move to `done/`, fill `Resolution`, set
   `status: done`. Done cards stay as history.
10. **Commit only your worktree's paths.** Stage explicit paths (`git add <your/files>`),
   never `git add -A`. Other agents work side by side in this repo.
11. **Reference cards by filename**, not folder path (cards move between folders).

## Card lifecycle

```
open  →  doing  →  done
 ↑         │
 └── blocked/rejected also end in done/ with a Resolution explaining why
```

Filename: `YYYY-MM-DD-<two-to-four-word-slug>.md` (date = day raised).
Copy `board/template.md` to start one. Keep cards short — a card is a ticket,
not documentation.

## Quick example

> **From:** web · **To:** backend · **Priority:** high
> **What:** Need `GET /routines/:id/completions?from=&to=` for streak display.
> **Why:** Today view only exposes today's state; weekly heatmap needs a range.
> **Proposal:** Date-range completion list, max 90 days, same envelope.

See `apps/docs/content/docs/backend-api.mdx` for what the backend ships today.

## Ownership and quality

`ownership.yaml` is the role-to-path map. It is intentionally machine-readable so a future CI
check or AI-native project-management tool can reject out-of-scope changes before merge.

The contract distinguishes an honest blocker from a violation. Repeated failures are evaluated
from evidence on cards, commits, reviews, and CI—not from subjective labels such as "lazy".

Implementation agents own code. QA and the reviewer are independent and read-only by default.
The PM coordinates delivery and may perform controlled integration only when the PM charter's
gates are satisfied and the human has explicitly approved it. The PM cannot waive review, scope,
or validation gates.

See `worktrees.md` for the complete lifecycle, port convention, and safe cleanup rules.
