---
id: str-whatsapp-delivery
title: Deliver alerts and messages over WhatsApp with SMS fallback
type: feature
from: pm
to: backend
priority: high
status: doing
assignee: backend
reviewer: none
parent: none
depends_on: ["str-messages-and-notices"]
branch: ccr-bf0f9944-6h1l31
worktree: none
scope: ["apps/nest-api/src/modules/notifications/**"]
allowed_shared: []
created: 2026-10-27
updated: 2026-10-28
---

## What

Provider interface with Meta Cloud API first: approved English and Urdu templates, delivery and read receipts, SMS fallback and retries through the outbox.

## Why / Context

Phase 4 of `.agents/plans/school-os-master-plan.md`. Feeds the dashboard parent-alerts card and the sidebar WhatsApp status card (Figma `76:54336`, state `209:118340`).

## Proposal or Ask

Webhook for receipts with signature check; connection status endpoint for the sidebar card.

## From the rules engine

The attendance policy (`apps/nest-api/src/modules/rules`) already decides the timing; this card runs it on a schedule:

- Auto-mark absent: at `isAutoAbsentDue(policy, localMinutes)`, mark still-unmarked students absent (source `rule`, audited).
- Absence alerts: queue one per absent student at `absenceAlertAt(policy, sessionDate, timeZone, quietHours)`, which already moves sends out of quiet hours.
- Gate scans: when a scan arrives, `classifyScan(policy, localMinutes)` gives present, late or no change.

## Scope

**In scope:**

- Provider, templates, receipts, status card

**Out of scope:**

- Voice calls

## Validation

- `bun run lint`, `bun run typecheck`, `bun run test` with a spec per new rule or endpoint.
- Migrations applied to a fresh database and to the previous schema in Docker.
- Playwright e2e for the web flow that uses it.

## Progress

**PR A (done): the delivery pipeline.**

- Providers behind one interface (`modules/delivery/providers`): Meta WhatsApp Cloud API when `WHATSAPP_PROVIDER=meta` and its keys are set, otherwise a sandbox that records sends locally and counts them delivered. SMS has the same interface with a sandbox provider; a real SMS gateway plugs in there.
- Templates `school_message` and `school_notice` in English and Urdu (`templates.ts`), with parameters stored per delivery; free text inside 24 hours of the guardian's last WhatsApp message.
- `message_deliveries` and `tenant_messaging_channels` (migration `0034`) plus `guardians.preferred_language`. Outbox handlers plan one delivery per guardian for `messages.sent.v1` (to families) and `notices.sent.v1` (after `deliverAfter`); skipped with a reason when WhatsApp is not connected, switched off in Communication, or there is no mobile number.
- Worker (`DELIVERY_WORKER_ENABLED`) claims due rows with a lease, holds sends until quiet hours end, retries temporary failures with backoff (1, 5, 30 min), and after a final failure sends the same text by SMS when SMS fallback is on.
- Webhook `GET/POST /api/v1/webhooks/whatsapp`: Meta's verify handshake; `X-Hub-Signature-256` checked against the app secret (unsigned only for a local sandbox without one). Receipts move deliveries forward only (sent, delivered, read; failed triggers SMS fallback) and a WhatsApp read marks the message read in the thread. Text replies join the guardian's conversation as a WhatsApp family message.
- `GET /messaging/status`, `GET /messaging/deliveries`, `POST /messaging/whatsapp/connect|disconnect`; the sidebar card and Settings · Communication show the live state, the last day's counts and the delivery log. Thread messages show how WhatsApp or SMS delivery went.

**PR B (next):** the rules engine on a schedule: auto-mark absent, absence alerts with an `absence_alert` template and the unread SMS fallback, gate scans, and the Messages "Alerts log" tab.

## Resolution

