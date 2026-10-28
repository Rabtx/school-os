"use client";

import { Spinner } from "@school-os/ui/components/spinner";
import { useToast } from "@school-os/ui/components/toaster";
import { useEffect, useState } from "react";
import { ErrorState, NoAccess } from "@/components/states";
import { ApiError } from "@/lib/api/client";
import { useNow } from "@/lib/use-now";
import { cn } from "@/lib/utils";
import { usePermissions, useTenantContext } from "@/modules/tenants";
import { useApprovalDecisions, useApprovalQueueQuery } from "../hooks/use-approvals";
import { shortAge } from "../lib/approval-format";
import type { ApprovalView } from "../types/approvals.types";
import { AllCaughtUp, ApprovedOutcome, DeclinedOutcome } from "./approval-outcome";
import { TypeChip } from "./approval-parts";
import { ApprovalRequestCard } from "./approval-request-card";
import { DeclineDialog } from "./decline-dialog";

const UP_NEXT = 3;

/**
 * Approvals (Figma `82:37115`): one request at a time, oldest first, with what happens if you
 * approve, then the outcome with an undo window, then the next. Ends on "Nothing is waiting".
 */
export function ApprovalsPage() {
	const now = useNow();
	const toast = useToast();
	const { activeTenant } = useTenantContext();
	const { role } = usePermissions();
	const tenantId = activeTenant?.id ?? null;
	const queue = useApprovalQueueQuery(tenantId);
	const { approve, decline, undo } = useApprovalDecisions(tenantId);

	/** The request just decided, shown in place of the next one until the principal moves on. */
	const [outcome, setOutcome] = useState<ApprovalView | null>(null);
	/** Decided in this visit, for "Approval N of M". */
	const [handled, setHandled] = useState(0);
	const [declining, setDeclining] = useState<ApprovalView | null>(null);

	const pending = (queue.data?.pending ?? []).filter((request) => request.id !== outcome?.id);
	const current = outcome ? null : (pending[0] ?? null);
	const upNext = pending.slice(outcome ? 0 : 1, (outcome ? 0 : 1) + UP_NEXT);
	const total = handled + pending.length;
	const position = outcome ? handled : handled + 1;
	const canDecide = role === "owner";

	function failed(title: string, error: unknown) {
		toast.show({
			title,
			description: error instanceof Error ? error.message : undefined,
			status: "error",
		});
	}

	async function handleApprove(request: ApprovalView) {
		try {
			setOutcome(await approve.mutateAsync(request.id));
			setHandled((count) => count + 1);
		} catch (error) {
			failed("Not approved", error);
		}
	}

	async function handleDecline(request: ApprovalView, reason: string) {
		try {
			const declined = await decline.mutateAsync({ approvalId: request.id, reason });
			setDeclining(null);
			setOutcome(declined);
			setHandled((count) => count + 1);
		} catch (error) {
			failed("Not declined", error);
		}
	}

	async function handleUndo(request: ApprovalView) {
		try {
			await undo.mutateAsync(request.id);
			setOutcome(null);
			setHandled((count) => Math.max(0, count - 1));
			toast.show({ title: "Approval undone. It is back in the queue.", status: "success" });
		} catch (error) {
			failed("Could not undo", error);
		}
	}

	// ⌘↵ / Ctrl+↵ approves the request on screen.
	useEffect(() => {
		if (!current || declining) return;
		const onKey = (event: KeyboardEvent) => {
			if (event.key === "Enter" && (event.metaKey || event.ctrlKey) && !approve.isPending) {
				event.preventDefault();
				void handleApprove(current);
			}
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	});

	if (queue.error instanceof ApiError && queue.error.statusCode === 403) {
		return (
			<NoAccess
				title="Approvals are for school leadership"
				description="The principal and administrators decide requests here. Your own requests show where you made them."
			/>
		);
	}
	if (queue.error) {
		return <ErrorState onRetry={() => void queue.refetch()} />;
	}
	if (queue.isLoading || !queue.data) {
		return (
			<div className="flex min-h-[320px] items-center justify-center">
				<Spinner className="size-6" />
			</div>
		);
	}

	const done = !outcome && !current;

	return (
		<div className="mx-auto w-full max-w-[680px] px-4 pt-10 pb-16 sm:px-0">
			<div className="mb-6 flex flex-col items-center gap-2">
				<p className="text-[13px] text-dashboard-text-secondary tracking-[-0.15px]">
					{done ? "All done" : `Approval ${position} of ${total}`}
				</p>
				<div
					className="h-[3px] w-[220px] overflow-hidden rounded-full bg-dashboard-border"
					role="progressbar"
					aria-label="Approvals decided"
					aria-valuemin={0}
					aria-valuemax={done ? 1 : total}
					aria-valuenow={done ? 1 : position}
				>
					<div
						className="h-full rounded-full bg-[var(--rx-accent)] transition-[width] duration-300"
						style={{
							width: done ? "100%" : `${Math.max(8, (position / Math.max(total, 1)) * 100)}%`,
						}}
					/>
				</div>
			</div>

			{outcome?.status === "approved" ? (
				<ApprovedOutcome
					request={outcome}
					undoing={undo.isPending}
					hasNext={pending.length > 0}
					onUndo={() => void handleUndo(outcome)}
					onNext={() => setOutcome(null)}
				/>
			) : outcome ? (
				<DeclinedOutcome
					request={outcome}
					hasNext={pending.length > 0}
					onNext={() => setOutcome(null)}
				/>
			) : current ? (
				<ApprovalRequestCard
					request={current}
					now={now}
					busy={approve.isPending}
					canDecide={current.approverRole !== "owner" || canDecide}
					onApprove={() => void handleApprove(current)}
					onDecline={() => setDeclining(current)}
				/>
			) : (
				<AllCaughtUp today={queue.data.today} />
			)}

			{upNext.length > 0 ? (
				<section className="mt-8">
					<h3 className="mb-2 text-[13px] text-dashboard-text-secondary">Up next</h3>
					<ul className="space-y-2">
						{upNext.map((request, index) => (
							<li
								key={request.id}
								className={cn(
									"flex items-center gap-3 rounded-[10px] border border-dashboard-border bg-dashboard-surface px-4 py-3 text-[14px]",
									index > 0 && "opacity-60",
								)}
							>
								<TypeChip label={request.label} muted={index > 0} />
								<span className="min-w-0 flex-1 truncate text-dashboard-text-primary">
									{request.card.title}
								</span>
								<span className="shrink-0 text-[12px] text-dashboard-text-dim">
									{request.requester.name ? `${request.requester.name} · ` : ""}
									{shortAge(request.createdAt, now)}
								</span>
							</li>
						))}
					</ul>
				</section>
			) : null}

			<DeclineDialog
				request={declining}
				busy={decline.isPending}
				onClose={() => setDeclining(null)}
				onDecline={(reason) => declining && void handleDecline(declining, reason)}
			/>
		</div>
	);
}
