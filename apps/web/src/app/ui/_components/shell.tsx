"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { type ReactNode, useState } from "react";
import { NAV } from "./nav";

const MODES = {
	theme: ["light", "dark"],
	depth: ["flat", "floating"],
	radius: ["sharp", "default", "round"],
	motion: ["on", "off"],
};
type Modes = Record<keyof typeof MODES, string>;

/** Sets the four modes on one wrapper, exactly how an app switches them. */
export function Shell({ children }: { children: ReactNode }) {
	const pathname = usePathname();
	const [modes, setModes] = useState<Modes>({
		theme: "light",
		depth: "floating",
		radius: "default",
		motion: "on",
	});

	return (
		<div
			data-theme={modes.theme}
			data-depth={modes.depth}
			data-radius={modes.radius}
			data-motion={modes.motion}
			className="min-h-dvh bg-(--rx-app) font-(--rx-font-sans) text-(--rx-text)"
		>
			<header className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 border-b border-(--rx-border-strong) bg-(--rx-app) px-5 py-3">
				<Link href="/ui" className="text-sm font-medium">
					Rabtx UI
				</Link>
				<div className="flex flex-wrap gap-2">
					{Object.entries(MODES).map(([mode, values]) => (
						<fieldset key={mode} className="flex gap-0.5 rounded-lg bg-(--rx-pressed) p-0.5">
							<legend className="sr-only">{mode}</legend>
							{values.map((value) => (
								<label
									key={value}
									className="cursor-pointer rounded-md px-2.5 py-1 text-[13px] text-(--rx-text-secondary) capitalize has-checked:bg-(--rx-surface) has-checked:text-(--rx-text) has-checked:shadow-[0_0_0_1px_var(--rx-border-strong)] has-focus-visible:outline-2 has-focus-visible:outline-(--rx-focus)"
								>
									<input
										type="radio"
										name={mode}
										value={value}
										checked={modes[mode as keyof Modes] === value}
										onChange={() => setModes((current) => ({ ...current, [mode]: value }))}
										className="sr-only"
									/>
									{value}
								</label>
							))}
						</fieldset>
					))}
				</div>
			</header>
			<div className="mx-auto flex max-w-6xl flex-col md:flex-row">
				<nav aria-label="Docs" className="p-5 md:w-56 md:flex-none md:py-8">
					{NAV.map(({ title, links }) => (
						<div key={title} className="mb-4">
							<p className="mb-1 text-xs font-medium text-(--rx-text-tertiary)">{title}</p>
							{links.map(({ href, label }) => (
								<Link
									key={href}
									href={href}
									aria-current={pathname === href ? "page" : undefined}
									className="block rounded-md px-2 py-1 text-[13px] text-(--rx-text-secondary) hover:text-(--rx-text) aria-[current=page]:bg-(--rx-selected) aria-[current=page]:text-(--rx-text)"
								>
									{label}
								</Link>
							))}
						</div>
					))}
				</nav>
				<main className="min-w-0 flex-1 px-5 pt-2 pb-24 md:py-8 md:pr-10">{children}</main>
			</div>
		</div>
	);
}
