"use client";

import { Spinner } from "@school-os/ui/components/spinner";
import { timeAgo } from "../lib/approval-format";
import type { ApprovalView } from "../types/approvals.types";
import {
	FactPanel,
	ghostButton,
	primaryButton,
	QueueCard,
	RiskBadge,
	TypeChip,
} from "./approval-parts";

/** One request waiting for a decision (Figma `82:37115`, `126:40250`). */
export function ApprovalRequestCard({
	request,
	now,
	busy,
	canDecide,
	onApprove,
	onDecline,
}: {
	request: ApprovalView;
	now: Date;
	busy: boolean;
	/** False when only the owner can decide this one. */
	canDecide: boolean;
	onApprove: () => void;
	onDecline: () => void;
}) {
	const { card } = request;
	return (
		<QueueCard>
			<div className="flex flex-wrap items-center gap-2 text-[13px] text-dashboard-text-secondary">
				<TypeChip label={request.label} />
				<span className="min-w-0 flex-1 truncate">
					{request.requester.name ? `Asked by ${request.requester.name}` : "Asked"} ·{" "}
					{timeAgo(request.createdAt, now)}
				</span>
				<RiskBadge risk={request.risk} />
			</div>

			<h2 className="mt-4 font-medium text-[24px] text-dashboard-text-primary leading-8 tracking-[-0.4px]">
				{card.title}
			</h2>
			<p className="mt-1 text-[14px] text-dashboard-text-secondary">{card.subtitle}</p>

			{request.note || card.quote ? (
				<blockquote className="mt-5 rounded-[12px] bg-dashboard-bg px-4 py-3.5">
					<p className="text-[12px] text-dashboard-text-dim">
						{card.quote?.label ??
							(request.requester.name ? `Note from ${request.requester.name}` : "Note")}
					</p>
					<p className="mt-1 whitespace-pre-line text-[14px] text-dashboard-text-primary leading-5">
						{card.quote?.text ?? request.note}
					</p>
				</blockquote>
			) : null}

			<div className="mt-5">
				<FactPanel facts={card.facts} />
			</div>

			<p className="mt-4 text-[13px] text-dashboard-text-secondary leading-5">{card.outcome}</p>

			{request.approverRole === "owner" && !canDecide ? (
				<p className="mt-6 text-[13px] text-dashboard-text-dim">
					Waiting for the school owner. Only they can decide this one.
				</p>
			) : (
				<div className="mt-6 flex flex-wrap items-center gap-2">
					<button type="button" className={primaryButton} disabled={busy} onClick={onApprove}>
						{busy ? <Spinner className="me-2 size-4" /> : null}
						{card.approveLabel}
					</button>
					<button type="button" className={ghostButton} disabled={busy} onClick={onDecline}>
						Reject
					</button>
					<span className="ms-auto hidden text-[12px] text-dashboard-text-dim sm:inline">
						<kbd className="font-sans">⌘↵</kbd> approve
					</span>
				</div>
			)}
		</QueueCard>
	);
}
