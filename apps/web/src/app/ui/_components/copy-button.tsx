"use client";

import { useState } from "react";

export function CopyButton({ code }: { code: string }) {
	const [copied, setCopied] = useState(false);
	return (
		<button
			type="button"
			onClick={async () => {
				await navigator.clipboard.writeText(code);
				setCopied(true);
				setTimeout(() => setCopied(false), 1500);
			}}
			className="absolute top-2 right-3 rounded px-1.5 py-0.5 text-xs text-(--rx-text-secondary) hover:text-(--rx-text)"
		>
			{copied ? "Copied" : "Copy"}
		</button>
	);
}
