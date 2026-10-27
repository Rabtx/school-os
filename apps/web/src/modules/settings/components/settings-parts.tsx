"use client";

import { Switch } from "@school-os/ui/components/switch";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Page heading inside the settings area (Figma "Settings" frames `77:89099`, `232:138695`). */
export function SettingsHeader({ title, description }: { title: string; description: string }) {
	return (
		<header className="mb-6">
			<h1 className="font-medium text-[24px] text-dashboard-text-primary leading-8">{title}</h1>
			<p className="mt-1 text-[14px] text-dashboard-text-dim leading-5">{description}</p>
		</header>
	);
}

/** A titled group of rows in one bordered card. */
export function SettingsSection({
	title,
	description,
	children,
	id,
	className,
}: {
	title?: string;
	description?: string;
	children: ReactNode;
	id?: string;
	className?: string;
}) {
	return (
		<section id={id} className={cn("mb-8 scroll-mt-4", className)}>
			{title ? (
				<div className="mb-3">
					<h2 className="font-medium text-[14px] text-dashboard-text-primary leading-5">{title}</h2>
					{description ? (
						<p className="text-[12px] text-dashboard-text-dim leading-4">{description}</p>
					) : null}
				</div>
			) : null}
			<div className="rounded-[12px] border border-dashboard-border bg-dashboard-surface px-4">
				{children}
			</div>
		</section>
	);
}

/** One setting: label and description on the start side, its control on the end side. */
export function SettingsRow({
	label,
	description,
	htmlFor,
	children,
}: {
	label: string;
	description?: ReactNode;
	htmlFor?: string;
	children: ReactNode;
}) {
	return (
		<div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-dashboard-border border-b py-3.5 last:border-0">
			<div className="min-w-0 flex-1 basis-60">
				<label
					htmlFor={htmlFor}
					className="block font-medium text-[14px] text-dashboard-text-primary leading-5"
				>
					{label}
				</label>
				{description ? (
					<p className="text-[13px] text-dashboard-text-dim leading-5">{description}</p>
				) : null}
			</div>
			<div className="flex shrink-0 items-center gap-2">{children}</div>
		</div>
	);
}

export function SettingsSwitch({
	label,
	checked,
	onCheckedChange,
	disabled,
}: {
	label: string;
	checked: boolean;
	onCheckedChange: (checked: boolean) => void;
	disabled?: boolean;
}) {
	return (
		<Switch
			aria-label={label}
			checked={checked}
			onCheckedChange={onCheckedChange}
			disabled={disabled}
			className="data-checked:bg-[var(--rx-accent)]"
		/>
	);
}

/** Fixed-width control slot so selects line up down a section, as in the frame. */
export const SETTINGS_CONTROL = "w-[220px] max-w-full";

/** Shown in place of a section when the viewer cannot read or change it. */
export function SettingsNotice({ children }: { children: ReactNode }) {
	return (
		<p className="rounded-[12px] border border-dashboard-border bg-dashboard-surface px-4 py-6 text-center text-[13px] text-dashboard-text-dim">
			{children}
		</p>
	);
}
