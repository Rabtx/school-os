import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { RISK_LABEL } from "../lib/approval-format";
import type { ApprovalFact, ApprovalView } from "../types/approvals.types";

/** The outlined type chip on cards and "Up next" rows: Attendance, Leave, Notice. */
export function TypeChip({ label, muted = false }: { label: string; muted?: boolean }) {
	return (
		<span
			className={cn(
				"inline-flex h-6 shrink-0 items-center rounded-[4px] border px-1.5 text-[12px]",
				muted
					? "border-dashboard-border text-dashboard-text-dim"
					: "border-[color-mix(in_oklab,var(--rx-accent)_45%,transparent)] text-[var(--rx-accent)]",
			)}
		>
			{label}
		</span>
	);
}

const RISK_TONE: Record<ApprovalView["risk"], string> = {
	low: "border-[color-mix(in_oklab,var(--rx-success)_45%,transparent)] text-[var(--rx-success)]",
	medium: "border-[color-mix(in_oklab,var(--rx-warning)_45%,transparent)] text-[var(--rx-warning)]",
	high: "border-[color-mix(in_oklab,var(--rx-danger)_45%,transparent)] text-[var(--rx-danger)]",
};

export function RiskBadge({ risk }: { risk: ApprovalView["risk"] }) {
	return (
		<span
			className={cn(
				"inline-flex h-6 shrink-0 items-center rounded-[4px] border px-1.5 text-[12px]",
				RISK_TONE[risk],
			)}
		>
			{RISK_LABEL[risk]}
		</span>
	);
}

/** Label/value rows on a sunken panel, as in "What happened" (Figma `221:114293`). */
export function FactPanel({ facts }: { facts: ApprovalFact[] }) {
	if (facts.length === 0) return null;
	return (
		<dl className="grid grid-cols-[minmax(0,132px)_1fr] gap-x-4 gap-y-2.5 rounded-[10px] bg-dashboard-bg px-3 py-3 text-[13px]">
			{facts.map((fact) => (
				<div key={fact.label} className="contents">
					<dt className="text-[12px] text-dashboard-text-dim leading-5">{fact.label}</dt>
					<dd className="text-dashboard-text-primary">{fact.value}</dd>
				</div>
			))}
		</dl>
	);
}

/** The large card that holds the current approval or its outcome. */
export function QueueCard({ children }: { children: ReactNode }) {
	return (
		<section className="rounded-[16px] border border-dashboard-border-strong bg-dashboard-surface p-6 tracking-[-0.15px] sm:p-8">
			{children}
		</section>
	);
}

/** The square icon above an outcome title. */
export function OutcomeMark({
	children,
	tone = "accent",
}: {
	children: ReactNode;
	tone?: "accent" | "neutral" | "danger";
}) {
	return (
		<span
			className={cn(
				"mb-4 flex size-14 items-center justify-center rounded-[12px]",
				tone === "accent" &&
					"bg-[color-mix(in_oklab,var(--rx-accent)_22%,transparent)] text-[var(--rx-accent)]",
				tone === "neutral" && "bg-dashboard-bg text-dashboard-text-primary",
				tone === "danger" &&
					"bg-[color-mix(in_oklab,var(--rx-danger)_18%,transparent)] text-[var(--rx-danger)]",
			)}
		>
			{children}
		</span>
	);
}

export const primaryButton =
	"inline-flex h-9 items-center justify-center rounded-[8px] bg-[var(--rx-accent)] px-3.5 font-medium text-[14px] text-white transition-opacity hover:opacity-90 disabled:opacity-50";
export const secondaryButton =
	"inline-flex h-9 items-center justify-center rounded-[8px] border border-dashboard-border-strong px-3.5 font-medium text-[14px] text-dashboard-text-primary transition-colors hover:bg-dashboard-hover disabled:opacity-50";
export const ghostButton =
	"inline-flex h-9 items-center justify-center rounded-[8px] px-3.5 font-medium text-[14px] text-dashboard-text-secondary transition-colors hover:bg-dashboard-hover hover:text-dashboard-text-primary disabled:opacity-50";
