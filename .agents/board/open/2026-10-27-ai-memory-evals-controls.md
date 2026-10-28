---
id: str-ai-memory-evals-controls
title: School memory, evals, confidence and AI on/off controls
type: feature
from: ai
to: ai
priority: normal
status: open
assignee: none
reviewer: none
parent: none
depends_on: ["str-ai-tool-registry"]
branch: none
worktree: none
scope: ["apps/nest-api/src/modules/ai/**", "apps/web/src/modules/ai/**"]
allowed_shared: []
created: 2026-10-27
updated: 2026-10-27
---

## What

Store each draft and its approved edit per school as examples and as an eval set; route low-confidence drafts to a person ("AI is not sure"); AI on or off per school and per person with usage limits.

## Why / Context

Phase 6 of `.agents/plans/school-os-master-plan.md`. Figma state `209:114804`.

## Proposal or Ask

Turning AI off hides AI entry points and leaves every manual flow working.

## Scope

**In scope:**

- Memory, evals, confidence routing, controls

**Out of scope:**

- Voice (separate card when started)

## Validation

- Eval run in CI; e2e with AI off covering the main flows.

## Resolution

