"use client";

import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogTitle,
} from "@school-os/ui/components/dialog";
import { Textarea } from "@school-os/ui/components/textarea";
import { useState } from "react";

export type ChangeRequestDraft = {
	studentName: string;
	dayLabel: string;
	fromLabel: string;
	toLabel: string;
};

/** A teacher asks the principal to change one mark on a locked day. */
export function RequestChangeDialog({
	draft,
	busy,
	onClose,
	onSend,
}: {
	draft: ChangeRequestDraft | null;
	busy: boolean;
	onClose: () => void;
	onSend: (note: string) => void;
}) {
	const [note, setNote] = useState("");
	return (
		<Dialog
			open={Boolean(draft)}
			onOpenChange={(open) => {
				if (!open) {
					setNote("");
					onClose();
				}
			}}
		>
			<DialogContent className="gap-0 overflow-hidden border border-dashboard-border-strong bg-dashboard-surface p-0 tracking-[-0.15px] sm:max-w-[440px]">
				{draft ? (
					<form
						onSubmit={(event) => {
							event.preventDefault();
							onSend(note.trim());
							setNote("");
						}}
					>
						<div className="px-5 pt-5 pb-4">
							<DialogTitle className="pe-8 font-medium text-[20px] text-dashboard-text-primary leading-7">
								Ask to mark {draft.studentName} {draft.toLabel.toLowerCase()}?
							</DialogTitle>
							<DialogDescription className="mt-1 text-[13px] text-dashboard-text-secondary">
								{draft.dayLabel} · marked {draft.fromLabel.toLowerCase()} now. The roll call is
								closed, so the principal decides.
							</DialogDescription>
							<div className="mt-5">
								<label
									htmlFor="change-request-note"
									className="mb-2 block text-[12px] text-dashboard-text-dim"
								>
									Why (the principal sees this)
								</label>
								<Textarea
									id="change-request-note"
									value={note}
									onChange={(event) => setNote(event.target.value)}
									rows={3}
									maxLength={500}
									placeholder="Arrived after the bell; I marked present by mistake."
									className="min-h-[80px] text-[14px]"
								/>
							</div>
						</div>
						<footer className="flex items-center justify-end gap-2 border-dashboard-border border-t px-5 py-3">
							<button
								type="button"
								onClick={onClose}
								className="inline-flex h-8 items-center rounded-[6px] border border-dashboard-border-strong px-3 font-medium text-[13px] text-dashboard-text-primary hover:bg-dashboard-hover"
							>
								Cancel
							</button>
							<button
								type="submit"
								disabled={busy}
								className="inline-flex h-8 items-center rounded-[6px] bg-[var(--rx-accent)] px-3 font-medium text-[13px] text-white hover:opacity-90 disabled:opacity-50"
							>
								Send request
							</button>
						</footer>
					</form>
				) : null}
			</DialogContent>
		</Dialog>
	);
}
