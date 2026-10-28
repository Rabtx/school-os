---
id: str-ai-tool-registry
title: AI tool registry over the NestJS API
type: feature
from: ai
to: ai
priority: high
status: open
assignee: none
reviewer: none
parent: none
depends_on: ["str-approvals-engine"]
branch: none
worktree: none
scope: ["apps/nest-api/src/modules/ai/**"]
allowed_shared: []
created: 2026-10-27
updated: 2026-10-27
---

## What

Typed tool registry so the AI calls the same endpoints as the UI with the user's own token, and can never see more than that user can.

## Why / Context

Phase 6 of `.agents/plans/school-os-master-plan.md`, principle 3 (AI native, AI optional).

## Proposal or Ask

Generate tool definitions from the API contracts; every write tool creates an approval instead of acting.

## Scope

**In scope:**

- Registry, read tools, write-as-draft tools

**Out of scope:**

- RAG (see `str-ai-rag-pgvector`)

## Validation

- nest-api tests; an eval proving a teacher cannot read another section through the AI.

## Resolution

