---
id: str-messages-and-notices
title: Build messages, notices and announcements
type: feature
from: pm
to: backend
priority: high
status: doing
assignee: backend
reviewer: none
parent: none
depends_on: ["str-approvals-engine"]
branch: ccr-bf0f9944-6h1l31
worktree: none
scope: ["apps/nest-api/src/modules/messages/**", "apps/nest-api/src/modules/notices/**", "apps/web/src/modules/messages/**"]
allowed_shared: []
created: 2026-10-27
updated: 2026-10-29
---

## What

Threads between school and families, notices and announcements with audiences and templates, and delivery and read state.

## Why / Context

Phase 4 of `.agents/plans/school-os-master-plan.md`. Figma: Messages `77:66449` and `141:27004`, Admin · Notices `185:56501`, Announcements `295:158046`.

## Proposal or Ask

Notices go through approvals; delivery goes through the outbox; parents only see threads for their linked children.

## Scope

**In scope:**

- Model, API, web screens

**Out of scope:**

- WhatsApp provider (see `str-whatsapp-delivery`)

## Validation

- `bun run lint`, `bun run typecheck`, `bun run test` with a spec per new rule or endpoint.
- Migrations applied to a fresh database and to the previous schema in Docker.
- Playwright e2e for the web flow that uses it.

## Progress

**PR A (done): messages.**

- `message_threads` and `messages` (migration `0032`): one thread per guardian and child, with `needs_reply`, the last line, and per-message direction, channel, status and read time.
- Who sees what: leadership all threads, teachers threads about students in their sections (`AccessScopeService`), a parent only their own threads about children still linked to them. Out-of-scope threads read as not found.
- API: list (all or needs reply, search), open (marks the other side read), start (staff pick a linked guardian of a child they can see; a parent writes about their child), reply, recipients. Every message queues `messages.sent.v1` in the outbox for WhatsApp delivery later.
- Web `/admin/messages` (Figma `77:66449`): conversations with need-reply chip, search and New; the thread with day headings, bubbles, sender, channel and read state; reply with Enter. Parents get the same screen from their side. Polls every 15 seconds.
- Sidebar Messages for staff and parents, with the needs-reply count as a red pill for leadership.

**PR B (done): notices.**

- `notices` and `notice_recipients` (migration `0033`): title, message, audience (all parents, some classes, staff, everyone), status (draft, waiting for approval, sent), and one recipient row per guardian or staff member with its read time.
- Leadership writes to anyone and sends directly; a teacher writes to the parents of their own classes and sends through approvals (`notice` type). Approving sends to the audience as it is then; undo takes it back (delivery waits out the window via `deliverAfter`); declining or withdrawing returns it to a draft.
- Sending queues `notices.sent.v1` for WhatsApp; recipients read in the app and the author sees how many read it.
- Web `/admin/notices` (Figma `185:56501`): Notices and Drafts tables with audience, sent, sent to and read; side panel with status, actions, message, reach and timing; composer with audience chips, class picker by campus and a live count; "For you" inbox, and the parent's notices.

**Left:** announcement banners (`295:158046`), templates and scheduled notices; delivery by WhatsApp (see `str-whatsapp-delivery`).

## Resolution

