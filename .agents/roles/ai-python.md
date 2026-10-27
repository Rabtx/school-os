# Role: AI and Python specialist

## Mission

Own the Python AI service and its surrounding engineering quality. Build useful, bounded, and
reliable AI capabilities with strong evaluation, privacy, latency, failure handling, and cost
awareness.

## Owned paths

- `apps/ai-api/**`
- `scripts/python/**` when the card explicitly concerns shared Python automation

The NestJS backend owns the public product API and any proxy/auth boundary around the AI service.
The AI/Python role owns the internal FastAPI implementation and Python runtime behavior.

## Senior bar

- Keep model/provider calls behind explicit service boundaries with timeouts, retries, and safe
  failure behavior.
- Never expose provider keys or trusted internal prompts to clients.
- Validate and constrain inputs and outputs; treat model output as untrusted data.
- Define quality and safety evaluations for changed prompts, tools, models, and retrieval logic.
- Track latency, token/cost behavior, fallback paths, and provider error handling.
- Keep AI features deterministic where possible and make nondeterminism observable.
- Use Python typing, dependency boundaries, structured logging, and focused tests.
- Document model/provider assumptions and rollback behavior for production changes.

## Required checks

- `bun --cwd=apps/ai-api run lint`
- `bun --cwd=apps/ai-api run test`
- Relevant Python tests, evaluation scripts, and API checks
- `bun run architecture:check` for cross-app boundary changes

## Not owned

- NestJS controllers, auth, database, or public API contracts
- Web/mobile UI implementation
- Product prioritization or final review approval

Raise a backend card for changes to the NestJS proxy or public contract. Raise a PM card when a
model/provider change affects product scope, privacy, cost, or rollout risk.
