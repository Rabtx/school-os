"use client";

import { Cancel01Icon, Tick02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { longestWaitLabel, undoSecondsLeft } from "../lib/approval-format";
import type { ApprovalQueue, ApprovalView } from "../types/approvals.types";
import {
	FactPanel,
	OutcomeMark,
	primaryButton,
	QueueCard,
	secondaryButton,
} from "./approval-parts";

/** Ticks once a second while an undo window is open. */
function useSecondsLeft(undoUntil: string | null) {
	const [left, setLeft] = useState(() => undoSecondsLeft(undoUntil, new Date()));
	useEffect(() => {
		const tick = () => setLeft(undoSecondsLeft(undoUntil, new Date()));
		tick();
		const timer = window.setInterval(tick, 1000);
		return () => window.clearInterval(timer);
	}, [undoUntil]);
	return left;
}

/** Approved, with what happened and an undo countdown (Figma `221:114293`). */
export function ApprovedOutcome({
	request,
	undoing,
	hasNext,
	onUndo,
	onNext,
}: {
	request: ApprovalView;
	undoing: boolean;
	hasNext: boolean;
	onUndo: () => void;
	onNext: () => void;
}) {
	const left = useSecondsLeft(request.undoUntil);
	return (
		<QueueCard>
			<OutcomeMark>
				<HugeiconsIcon icon={Tick02Icon} size={26} strokeWidth={2} />
			</OutcomeMark>
			<h2 className="font-medium text-[24px] text-dashboard-text-primary leading-8">Approved</h2>
			<p className="mt-3 text-[14px] text-dashboard-text-secondary">{request.effect?.headline}</p>
			{request.effect?.facts.length ? (
				<div className="mt-4">
					<p className="mb-2 text-[13px] text-dashboard-text-dim">What happened</p>
					<FactPanel facts={request.effect.facts} />
				</div>
			) : null}
			<div className="mt-5 flex flex-wrap gap-2">
				{left > 0 ? (
					<button type="button" className={secondaryButton} disabled={undoing} onClick={onUndo}>
						Undo <span className="ms-1.5 tabular-nums">({left} s)</span>
					</button>
				) : null}
				<button type="button" className={primaryButton} onClick={onNext}>
					{hasNext ? "Next approval" : "Done"}
				</button>
			</div>
		</QueueCard>
	);
}

/** Declined, with the reason the requester sees (Figma `221:115806`, after sending). */
export function DeclinedOutcome({
	request,
	hasNext,
	onNext,
}: {
	request: ApprovalView;
	hasNext: boolean;
	onNext: () => void;
}) {
	return (
		<QueueCard>
			<OutcomeMark tone="danger">
				<HugeiconsIcon icon={Cancel01Icon} size={24} strokeWidth={2} />
			</OutcomeMark>
			<h2 className="font-medium text-[24px] text-dashboard-text-primary leading-8">Declined</h2>
			<p className="mt-3 text-[14px] text-dashboard-text-secondary">{request.declined}</p>
			<p className="mt-2 text-[13px] text-dashboard-text-dim">
				{request.requester.name ?? "They"} can see your reason on their requests.
			</p>
			<div className="mt-5 flex flex-wrap gap-2">
				<button type="button" className={primaryButton} onClick={onNext}>
					{hasNext ? "Next approval" : "Done"}
				</button>
			</div>
		</QueueCard>
	);
}

/** Nothing waiting, with today's decisions (Figma `221:121411`). */
export function AllCaughtUp({ today }: { today: ApprovalQueue["today"] }) {
	const cleared = today.approved + today.declined;
	const wait = longestWaitLabel(today.longestWaitMinutes);
	return (
		<QueueCard>
			<OutcomeMark>
				<HugeiconsIcon icon={Tick02Icon} size={26} strokeWidth={2} />
			</OutcomeMark>
			<h2 className="font-medium text-[24px] text-dashboard-text-primary leading-8">
				Nothing is waiting
			</h2>
			<p className="mt-3 text-[14px] text-dashboard-text-secondary">
				{cleared === 0
					? "No requests today. Teachers ask here when a roll call needs changing after it closes."
					: `You cleared ${cleared} ${cleared === 1 ? "approval" : "approvals"} today.${wait ? ` ${wait}` : ""}`}
			</p>
			<div className="mt-4">
				<p className="mb-2 text-[13px] text-dashboard-text-dim">Today</p>
				<FactPanel
					facts={[
						{ label: "Approved", value: String(today.approved) },
						{ label: "Declined", value: String(today.declined) },
						{ label: "Ran out of time", value: String(today.expired) },
					]}
				/>
			</div>
			<div className="mt-5 flex flex-wrap gap-2">
				<Link href="/admin" className={primaryButton}>
					Go to the dashboard
				</Link>
			</div>
		</QueueCard>
	);
}
