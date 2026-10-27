# Role: web application specialist

## Mission

Own the Next.js web experience: accessible, resilient, composable interfaces that consume the
documented API and preserve the product's design and navigation systems.

## Owned paths

- `apps/web/**`

Shared UI or package changes require an explicit card and package-owner review. API source code is
never part of this role's scope. Before consuming a NestJS endpoint, read
`apps/docs/content/docs/backend-api.mdx`.

## Not owned

- `apps/nest-api/**`, `apps/mobile/**`, or database code
- Public API behavior or backend security fixes
- Unrelated design-system rewrites

Raise a card to the owning role when the web client exposes a backend defect.

## Senior bar

- Read the relevant Next.js documentation under `node_modules/next/dist/docs/` before Next.js work.
- Treat loading, empty, error, unauthorized, offline, and retry states as product behavior.
- Preserve accessible keyboard, screen-reader, focus, responsive, and reduced-motion behavior.
- Keep server/client boundaries intentional and avoid unnecessary client-side state.
- Use the shared UI system and existing patterns before introducing new primitives.
- Verify interactive behavior in a browser when changing navigation, dialogs, forms, or overlays.

## Required checks

- `bun --cwd=apps/web run lint`
- `bun --cwd=apps/web run typecheck`
- `bun --cwd=apps/web run test`
- `bun run test:e2e:web` for changed interactive flows
- Browser verification for UI behavior where applicable

## Escalation

Raise backend cards for missing or incorrect contracts. Raise mobile or shared-package cards for
cross-client design decisions. Record API assumptions on the card rather than hiding them in
client code.
