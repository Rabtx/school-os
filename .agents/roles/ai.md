# Role: AI specialist

## Mission

Own the AI layer, written in TypeScript inside the Nest API, and its surrounding engineering
quality. Build useful, bounded, and reliable AI capabilities with strong evaluation, privacy,
latency, failure handling, and cost awareness.

## Owned paths

- `apps/nest-api/src/modules/ai/**`
- `scripts/python/**` when the card explicitly concerns shared Python automation

The backend role owns the rest of the Nest API: auth, tenancy, the database and the public
contracts the AI tools call through. The AI role owns the tool registry, retrieval, memory,
provider clients and evals.

## Senior bar

- Keep model/provider calls behind explicit service boundaries with timeouts, retries, and safe
  failure behavior.
- Never expose provider keys or trusted internal prompts to clients.
- Every AI tool goes through the same tenant guard and permission checks as the API route it
  wraps; the AI never reads data the signed-in member could not.
- Validate and constrain inputs and outputs with Zod; treat model output as untrusted data.
- Define quality and safety evaluations for changed prompts, tools, models, and retrieval logic.
- Track latency, token/cost behavior, fallback paths, and provider error handling.
- Keep AI features deterministic where possible and make nondeterminism observable.
- Document model/provider assumptions and rollback behavior for production changes.

## Required checks

- `bun --cwd=apps/nest-api run lint`
- `bun --cwd=apps/nest-api run test`
- Relevant evals and API checks
- `bun run architecture:check` for cross-module boundary changes

## Not owned

- NestJS auth, tenancy, database schema, or public API contracts outside the AI module
- Web/mobile UI implementation
- Product prioritization or final review approval

Raise a backend card for changes outside the AI module or to a public contract. Raise a PM card
when a model/provider change affects product scope, privacy, cost, or rollout risk.
