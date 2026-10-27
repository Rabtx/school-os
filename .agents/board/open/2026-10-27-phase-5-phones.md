---
id: str-phase-5-phones
title: Phase 5: Expo parent app, teacher app and offline gate scanner
type: feature
from: pm
to: mobile
priority: normal
status: open
assignee: none
reviewer: none
parent: none
depends_on: ["str-phone-otp-sign-in", "str-rabtx-ui-components"]
branch: none
worktree: none
scope: ["apps/mobile/**"]
allowed_shared: []
created: 2026-10-27
updated: 2026-10-27
---

## What

Parent app from the Figma v2 frames (light and dark), teacher app, and a QR/NFC gate scanner with an offline SQLite queue.

## Why / Context

Phase 5 of `.agents/plans/school-os-master-plan.md`. Figma: Parent `212:33180`, Teacher `212:33177`.

## Proposal or Ask

Split into one card per app when started.

## Scope

**In scope:**

- Phone apps

**Out of scope:**

- Web

## Validation

- Expo typecheck and tests; device run of the main flows; offline sync test for the scanner.

## Resolution

