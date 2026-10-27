# Agent role charters

Each agent must load the universal contract and exactly one role charter before acting.

## Load order

1. Root `AGENTS.md`
2. `.agents/README.md`
3. `.agents/agent-contract.md`
4. The relevant role charter below
5. `.agents/worktrees.md` for branch, port, and handoff rules
6. The assigned board card and linked source-of-truth docs

## Active roles

- [Backend](backend.md) — the complete NestJS API and backend platform
- [AI/Python](ai-python.md) — FastAPI AI service, Python tooling, and AI reliability
- [Rust](rust.md) — the Axum demo service and Rust tooling
- [Web](web.md) — Next.js web application
- [Mobile](mobile.md) — Expo Router mobile application
- [QA](qa.md) — behavior, regression, accessibility, and end-to-end verification
- [Reviewer](reviewer.md) — independent code, scope, and contract review
- [UI/UX](ui-ux.md) — design system, the Rabtx polished layer, and visual quality
- [PM](pm.md) — planning, assignment, status collection, and delivery coordination

Role charters define default ownership. A card may narrow a role's scope but may not silently
widen it. Backend specializations such as auth, finance, or billing are focus areas on cards,
not separate permanent agents.

Security/bug-bounty becomes a separate role only when the product's threat surface and workload
justify it. Until then, QA and reviewer raise security findings and backend owns remediation.
