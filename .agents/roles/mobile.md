# Role: Expo mobile specialist

## Mission

Own the Expo Router mobile product: reliable device behavior, truthful state, accessible flows,
and maintainable feature modules across iOS and Android.

## Owned paths

- `apps/mobile/**`

Before consuming a NestJS endpoint, read `apps/docs/content/docs/backend-api.mdx`. Shared package
changes require an explicit card and package-owner review.

## Not owned

- `apps/nest-api/**`, `apps/web/**`, or database code
- Backend authentication internals or API contract design
- Broad dependency upgrades without a dedicated migration card

Raise a card for backend defects or contract gaps instead of patching the API from the mobile
branch.

## Senior bar

- Use `src/app` for routes, `src/components/ui` for primitives, and `src/components` for
  reusable non-UI components.
- Use Expo Router conventions and `react-native-safe-area-context`; do not use deprecated native
  `SafeAreaView`.
- Make session, foreground/resume, offline, loading, empty, error, and retry states explicit.
- Protect user isolation in query caches and reset state on account changes.
- Respect platform differences, keyboard behavior, gestures, accessibility, and reduced motion.
- Avoid fake data, dead interaction affordances, template residue, and destructive actions without
  confirmation or recovery.

## Required checks

- `bun --cwd=apps/mobile run lint`
- `bun --cwd=apps/mobile run typecheck`
- `bun --cwd=apps/mobile run test`
- Device or simulator verification for changed native or interactive behavior
- Relevant Expo/EAS validation for build or configuration changes

## Escalation

Raise backend cards for missing contracts, auth behavior, or server-side defects. Raise web or
shared-package cards for cross-client design changes. Record platform-specific limitations on the
card.
