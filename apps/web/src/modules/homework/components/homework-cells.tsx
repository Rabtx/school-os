import { cn } from "@/lib/utils";
import type { HomeworkAssignment } from "../types/homework.types";

/**
 * Subject chip colours: the validated categorical slots (dark surface), assigned by a stable hash
 * of the subject name so a subject keeps its colour across pages.
 */
const SUBJECT_COLORS = [
	"#3987e5",
	"#d95926",
	"#199e70",
	"#c98500",
	"#d55181",
	"#9085e9",
	"#e66767",
	"#008300",
];

function hashName(name: string): number {
	let hash = 0;
	for (const char of name) hash = (hash * 31 + char.charCodeAt(0)) % 997;
	return hash;
}

export function SubjectChip({ name }: { name: string }) {
	const color = SUBJECT_COLORS[hashName(name) % SUBJECT_COLORS.length];
	return (
		<span
			className="inline-flex h-6 items-center rounded-md border px-2 text-[12px]"
			style={{
				color,
				borderColor: `color-mix(in oklab, ${color} 45%, transparent)`,
				background: `color-mix(in oklab, ${color} 12%, transparent)`,
			}}
		>
			{name}
		</span>
	);
}

export function SubmittedBar({ submitted, total }: { submitted: number; total: number }) {
	const ratio = total > 0 ? Math.min(1, submitted / total) : 0;
	const complete = total > 0 && submitted >= total;
	return (
		<span className="flex items-center gap-2.5">
			<span
				className="h-1 w-[72px] overflow-hidden rounded-full bg-dashboard-hover"
				role="img"
				aria-label={`${submitted} of ${total} submitted`}
			>
				<span
					className="block h-full rounded-full"
					style={{
						width: `${ratio * 100}%`,
						background: complete ? "var(--rx-success)" : "var(--rx-accent)",
					}}
				/>
			</span>
			<span className="tabular-nums">
				{submitted}/{total}
			</span>
		</span>
	);
}

type Tone = "accent" | "warning" | "success" | "neutral";

export type HomeworkState = { label: string; tone: Tone; dot: boolean };

const DAY_MS = 24 * 60 * 60 * 1000;

function startOfDay(ms: number): number {
	const date = new Date(ms);
	date.setHours(0, 0, 0, 0);
	return date.getTime();
}

/** Status tag from real data: draft, closed, due today, missing work, all in, or published. */
export function homeworkState(row: HomeworkAssignment, nowMs: number): HomeworkState {
	if (row.status === "draft") return { label: "Draft", tone: "neutral", dot: false };
	if (row.status === "closed") return { label: "Closed", tone: "neutral", dot: false };
	const missing = Math.max(0, row.recipientCount - row.submittedCount);
	if (row.recipientCount > 0 && missing === 0)
		return { label: "All in", tone: "success", dot: true };
	if (row.dueAt) {
		const dueDay = startOfDay(new Date(row.dueAt).getTime());
		const today = startOfDay(nowMs);
		if (dueDay === today) return { label: "Due today", tone: "accent", dot: true };
		if (dueDay < today && missing > 0)
			return { label: `${missing} missing`, tone: "warning", dot: true };
	}
	return { label: "Published", tone: "neutral", dot: false };
}

const toneStyle: Record<Tone, string> = {
	accent: "bg-[color-mix(in_oklab,var(--rx-accent)_16%,transparent)] text-[var(--rx-accent)]",
	warning: "bg-[color-mix(in_oklab,var(--rx-warning)_16%,transparent)] text-[var(--rx-warning)]",
	success: "bg-[color-mix(in_oklab,var(--rx-success)_16%,transparent)] text-[var(--rx-success)]",
	neutral: "bg-dashboard-hover text-dashboard-text-secondary",
};

export function StatusTag({ state }: { state: HomeworkState }) {
	return (
		<span
			className={cn(
				"inline-flex h-5 items-center gap-1.5 rounded-[4px] px-1.5 text-[12px]",
				toneStyle[state.tone],
			)}
		>
			{state.dot ? <span aria-hidden className="size-1.5 rounded-full bg-current" /> : null}
			{state.label}
		</span>
	);
}

/** "Today", "Tomorrow", or a short weekday date; flags dates in the past. */
export function dueLabel(dueAt: string | null, nowMs: number): { label: string; overdue: boolean } {
	if (!dueAt) return { label: "No due date", overdue: false };
	const dueMs = new Date(dueAt).getTime();
	const days = Math.round((startOfDay(dueMs) - startOfDay(nowMs)) / DAY_MS);
	if (days === 0) return { label: "Today", overdue: false };
	if (days === 1) return { label: "Tomorrow", overdue: false };
	const label = new Date(dueMs).toLocaleDateString(undefined, {
		weekday: "short",
		day: "numeric",
		month: "short",
	});
	return { label, overdue: days < 0 };
}

export function matchesDueFilter(dueAt: string | null, filter: string, nowMs: number): boolean {
	if (!dueAt) return false;
	const days = Math.round((startOfDay(new Date(dueAt).getTime()) - startOfDay(nowMs)) / DAY_MS);
	if (filter === "today") return days === 0;
	if (filter === "week") return days >= 0 && days < 7;
	if (filter === "overdue") return days < 0;
	return true;
}
