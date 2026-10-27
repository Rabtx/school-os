#!/usr/bin/env bun
/**
 * Resolve `uv` across machines (PATH, ~/.local/bin, ~/.cargo/bin) and forward args.
 */
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const home = homedir();
const candidates = [
	process.env.UV_BIN,
	"uv",
	join(home, ".local", "bin", "uv.exe"),
	join(home, ".local", "bin", "uv"),
	join(home, ".cargo", "bin", "uv.exe"),
	join(home, ".cargo", "bin", "uv"),
].filter((value) => typeof value === "string" && value.length > 0);

function resolveUv() {
	for (const candidate of candidates) {
		if (candidate === "uv") {
			const probe = spawnSync(candidate, ["--version"], {
				encoding: "utf8",
				shell: process.platform === "win32",
			});
			if (probe.status === 0) {
				return candidate;
			}
			continue;
		}
		if (existsSync(candidate)) {
			return candidate;
		}
	}
	return null;
}

const uv = resolveUv();
if (!uv) {
	console.error(
		[
			"[ai-api] uv not found.",
			"Install: https://docs.astral.sh/uv/getting-started/installation/",
			'Windows: powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"',
			"Then add %USERPROFILE%\\.local\\bin to PATH, or set UV_BIN to the uv executable.",
		].join("\n"),
	);
	process.exit(1);
}

const args = process.argv.slice(2);
const result = spawnSync(uv, args, {
	stdio: "inherit",
	shell: process.platform === "win32" && uv === "uv",
	env: process.env,
});

process.exit(result.status ?? 1);
