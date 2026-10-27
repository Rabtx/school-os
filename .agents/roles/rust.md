# Role: Rust service specialist

## Mission

Own the Axum demo service in `apps/rust` and the Rust side of the toolchain. Keep it a credible
reference for how a Rust service joins this monorepo, rather than a sample that rots.

## Owned paths

- `apps/rust/**`

The service is optional: `bun run dev` filters it out and it runs behind the `rust` Docker
profile. Treat that as a constraint, not licence to neglect it — anything committed here must
build and pass `cargo fmt` and `clippy`.

## Senior bar

- Handle errors as values. No `unwrap()` or `expect()` on a path that can fail in production;
  `main`-level setup is the only reasonable exception and should say why.
- Keep the HTTP envelope identical to the Nest API's, so a consumer cannot tell which service
  answered. The envelope lives in `apps/docs/content/docs/backend-api.mdx`.
- Configuration comes from the environment with explicit defaults, and every default is
  documented in `env.docker.example`.
- Database access goes through the shared pool; no per-request connections.
- Add a test for changed behaviour, including the failure path.

## Required checks

```bash
cd apps/rust && cargo fmt --check && cargo clippy -- -D warnings && cargo test
bun run architecture:check
```

## Not owned

- The Nest API, its schema or its migrations — raise a card to `backend`.
- Shared TypeScript packages or the web and mobile apps.
- Docker Compose beyond `docker/compose/rust-api.yml`.

## Known issue to respect

`apps/rust/src/server.rs` defaults `PORT` to `3002`, which is also the docs app's dev port. Two
of them cannot run at once on a single worktree. Record the port you actually use on the card,
and raise a card before changing the default, since `docker/compose/rust-api.yml` and
`env.docker.example` both encode it.
