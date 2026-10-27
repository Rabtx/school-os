# AI API (`apps/ai-api`)

Python **FastAPI** service for in-app AI assistance. Managed with **[uv](https://docs.astral.sh/uv/)**.

## Architecture

```txt
Web / Mobile  →  NestJS (auth, tenancy, audit)  →  ai-api (prompts + models)
```

- FastAPI does **not** own auth sessions, billing, or school CRUD.
- Nest authenticates the user, then calls ai-api with a shared service token.
- Model providers are behind a port (`LlmProvider`) so mock and OpenAI-compatible backends swap cleanly.

## Layout

```txt
src/ai_api/
  api/                 # HTTP routers + deps
  application/         # use-cases
  domain/              # ports + errors
  infrastructure/      # providers, security
  schemas/             # Pydantic contracts
  config/              # settings
  main.py              # app factory
```

## Commands

`package.json` scripts resolve `uv` via `scripts/uv.mjs` (PATH or `%USERPROFILE%\\.local\\bin`), so Turbo works even when `uv` is not on PATH.

From repo root or `apps/ai-api`:

```bash
bun run uv -- sync
bun run dev:ai
# or: bun --cwd=apps/ai-api run dev
bun --cwd=apps/ai-api run lint
bun --cwd=apps/ai-api run test
```

Health: `GET http://localhost:8000/api/v1/health`
Assist (service token required): `POST http://localhost:8000/api/v1/assist`
