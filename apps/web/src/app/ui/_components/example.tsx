import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { ReactNode } from "react";
import { CopyButton } from "./copy-button";

/** A live example above its own source. The source is read from the file, so it cannot drift. */
export async function Example({
	file,
	muted,
	children,
}: {
	file: string;
	/** A tinted stage, for things that sit on a gray page such as cards. */
	muted?: boolean;
	children: ReactNode;
}) {
	const code = (await readFile(join(process.cwd(), "src/app/ui", file), "utf8")).trim();
	return (
		<figure className="my-4 overflow-hidden rounded-xl border border-(--rx-border-strong)">
			<div
				className={`flex min-h-32 flex-wrap items-center justify-center gap-3 p-6 ${muted ? "bg-(--rx-pressed)" : ""}`}
			>
				{children}
			</div>
			<details className="border-t border-(--rx-border-strong) bg-(--rx-pressed)">
				<summary className="cursor-pointer px-4 py-2 text-xs text-(--rx-text-secondary)">
					Code
				</summary>
				<div className="relative">
					<pre className="overflow-x-auto p-4 font-mono text-xs/5">{code}</pre>
					<CopyButton code={code} />
				</div>
			</details>
		</figure>
	);
}
