"use client";

import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogTitle,
} from "@school-os/ui/components/dialog";
import { Textarea } from "@school-os/ui/components/textarea";
import { useState } from "react";
import { cn } from "@/lib/utils";
import type { ApprovalView } from "../types/approvals.types";

/** "Say no to this…?" (Figma `221:115806`): pick why, edit what they see, send. */
export function DeclineDialog({
	request,
	busy,
	onClose,
	onDecline,
}: {
	request: ApprovalView | null;
	busy: boolean;
	onClose: () => void;
	onDecline: (reason: string) => void;
}) {
	return (
		<Dialog open={Boolean(request)} onOpenChange={(open) => !open && onClose()}>
			<DialogContent className="gap-0 overflow-hidden border border-dashboard-border-strong bg-dashboard-surface p-0 tracking-[-0.15px] sm:max-w-[480px]">
				{request ? (
					<DeclineForm
						key={request.id}
						request={request}
						busy={busy}
						onClose={onClose}
						onDecline={onDecline}
					/>
				) : null}
			</DialogContent>
		</Dialog>
	);
}

function DeclineForm({
	request,
	busy,
	onClose,
	onDecline,
}: {
	request: ApprovalView;
	busy: boolean;
	onClose: () => void;
	onDecline: (reason: string) => void;
}) {
	const reasons = request.card.declineReasons;
	const [picked, setPicked] = useState<string | null>(null);
	const [text, setText] = useState("");
	const reason = text.trim();

	function pick(option: string) {
		setPicked(option);
		// "Other" leaves the words to the principal; the rest start the message for them.
		if (option !== "Other" && (text.trim() === "" || reasons.includes(text.trim())))
			setText(option);
	}

	return (
		<form
			onSubmit={(event) => {
				event.preventDefault();
				if (reason) onDecline(reason);
			}}
		>
			<div className="px-5 pt-5 pb-4">
				<DialogTitle className="pe-8 font-medium text-[22px] text-dashboard-text-primary leading-7">
					{request.card.declineTitle}
				</DialogTitle>
				<DialogDescription className="mt-1 text-[13px] text-dashboard-text-secondary">
					{request.card.title}
				</DialogDescription>

				{reasons.length > 0 ? (
					<fieldset className="mt-5">
						<legend className="mb-2 text-[12px] text-dashboard-text-dim">Why</legend>
						<div className="flex flex-wrap gap-2">
							{reasons.map((option) => (
								<button
									key={option}
									type="button"
									aria-pressed={picked === option}
									onClick={() => pick(option)}
									className={cn(
										"inline-flex h-8 items-center rounded-[8px] border px-3 text-[13px] transition-colors",
										picked === option
											? "border-[var(--rx-accent)] bg-[color-mix(in_oklab,var(--rx-accent)_14%,transparent)] text-dashboard-text-primary"
											: "border-dashboard-border-strong text-dashboard-text-secondary hover:bg-dashboard-hover",
									)}
								>
									{option}
								</button>
							))}
						</div>
					</fieldset>
				) : null}

				<label className="mt-5 block">
					<span className="mb-2 block text-[12px] text-dashboard-text-dim">
						What {request.requester.name ?? "they"} sees
					</span>
					<Textarea
						value={text}
						onChange={(event) => setText(event.target.value)}
						rows={3}
						maxLength={500}
						placeholder="Say why, so they know what to do next."
						className="min-h-[88px] text-[14px]"
					/>
				</label>
			</div>

			<footer className="flex flex-wrap items-center gap-2 border-dashboard-border border-t px-5 py-3">
				<p className="min-w-0 flex-1 text-[12px] text-dashboard-text-dim">
					{request.requester.name ?? "The requester"} sees your reason
				</p>
				<button
					type="button"
					onClick={onClose}
					className="inline-flex h-8 items-center rounded-[6px] border border-dashboard-border-strong px-3 font-medium text-[13px] text-dashboard-text-primary hover:bg-dashboard-hover"
				>
					Go back
				</button>
				<button
					type="submit"
					disabled={!reason || busy}
					className="inline-flex h-8 items-center rounded-[6px] bg-[var(--rx-danger)] px-3 font-medium text-[13px] text-white hover:opacity-90 disabled:opacity-50"
				>
					Send and decline
				</button>
			</footer>
		</form>
	);
}
