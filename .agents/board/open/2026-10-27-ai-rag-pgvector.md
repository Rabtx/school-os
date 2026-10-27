---
id: str-ai-rag-pgvector
title: RAG over school knowledge with pgvector
type: feature
from: ai-python
to: ai-python
priority: high
status: open
assignee: none
reviewer: none
parent: none
depends_on: ["str-ai-tool-registry"]
branch: none
worktree: none
scope: ["apps/ai-api/**", "apps/nest-api/src/database/**"]
allowed_shared: []
created: 2026-10-27
updated: 2026-10-27
---

## What

Handbook, fee policy, syllabus, notices and lesson plans chunked into pgvector with `tenant_id` and an access label on every chunk, a permission filter on every search, and cited answers.

## Why / Context

Phase 6 of `.agents/plans/school-os-master-plan.md`.

## Proposal or Ask

Same Postgres; ingestion through the outbox; answers without a source say so.

## Scope

**In scope:**

- Ingestion, search, cited answers

**Out of scope:**

- Voice

## Validation

- Migration tested in Docker; retrieval eval set with cross-tenant leak tests.

## Resolution

