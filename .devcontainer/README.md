# Dev Container

Reproducible environment for School OS: **Bun**, **Rust**, **Python** (script tooling), and Bash lint/format helpers.

## How to use

1. **VS Code / Cursor**: Install the [Dev Containers](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers) extension, then **Reopen in Container**.
2. **CLI**: From repo root, `devcontainer build` then `devcontainer up` (requires [Dev Container CLI](https://github.com/devcontainers/cli)).

After start, `postCreateCommand` runs `bun install` and `bun run prepare` (git hooks). Use `bun run dev`, `bun run lint`, etc. as on the host.

## What’s installed

| Tool | Why |
|------|-----|
| **Bun** `1.4.2` | Package manager + JS/TS runtime |
| **Rust** (stable, rustfmt, clippy) | `apps/rust` and Rust logger bits |
| **Python 3** + **Ruff** | `scripts/python` lint/format |
| **ShellCheck** + **shfmt** | Bash script quality |

C and Lua toolchains were removed — they are not part of the product stack.

## Ports

| Port | App |
|------|-----|
| 3000 | Web (Next.js) |
| 3002 | Docs |
| 4000 | Nest API |
