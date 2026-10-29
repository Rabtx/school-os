"use client";

import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogTitle,
} from "@school-os/ui/components/dialog";
import { SearchInput } from "@school-os/ui/components/search-input";
import { SelectField } from "@school-os/ui/components/select-field";
import { Textarea } from "@school-os/ui/components/textarea";
import { useToast } from "@school-os/ui/components/toaster";
import { useId, useState } from "react";
import { useDebouncedValue } from "../lib/use-debounced-value";
import { cn } from "@/lib/utils";
import { useMyChildrenQuery } from "@/modules/guardians/hooks/use-guardian-queries";
import { useRecipientsQuery, useStartThreadMutation } from "../hooks/use-messages";
import type { Recipient, Viewer } from "../types/messages.types";

/** "New" message: staff pick a guardian of a child they teach; a parent picks their child. */
export function NewMessageDialog({
	open,
	tenantId,
	viewer,
	onClose,
	onStarted,
}: {
	open: boolean;
	tenantId: string;
	viewer: Viewer;
	onClose: () => void;
	onStarted: (threadId: string) => void;
}) {
	return (
		<Dialog open={open} onOpenChange={(next) => !next && onClose()}>
			<DialogContent className="gap-0 overflow-hidden border border-dashboard-border-strong bg-dashboard-surface p-0 tracking-[-0.15px] sm:max-w-[480px]">
				{open ? (
					<NewMessageForm
						tenantId={tenantId}
						viewer={viewer}
						onClose={onClose}
						onStarted={onStarted}
					/>
				) : null}
			</DialogContent>
		</Dialog>
	);
}

function NewMessageForm({
	tenantId,
	viewer,
	onClose,
	onStarted,
}: {
	tenantId: string;
	viewer: Viewer;
	onClose: () => void;
	onStarted: (threadId: string) => void;
}) {
	const id = useId();
	const toast = useToast();
	const start = useStartThreadMutation(tenantId);
	const [search, setSearch] = useState("");
	const debounced = useDebouncedValue(search.trim(), 250);
	const recipients = useRecipientsQuery(tenantId, debounced, viewer === "school");
	const children = useMyChildrenQuery(tenantId, viewer === "family");
	const [recipient, setRecipient] = useState<Recipient | null>(null);
	const [childId, setChildId] = useState("");
	const [body, setBody] = useState("");

	const familyChildren = children.data ?? [];
	const studentId =
		viewer === "school" ? recipient?.studentId : childId || familyChildren[0]?.studentId;
	const ready = Boolean(studentId && body.trim());

	return (
		<form
			onSubmit={(event) => {
				event.preventDefault();
				if (!ready || !studentId) return;
				start.mutate(
					{ studentId, guardianId: recipient?.guardianId, body: body.trim() },
					{
						onSuccess: (detail) => onStarted(detail.thread.id),
						onError: (error) =>
							toast.show({
								title: "Message not sent",
								description: error instanceof Error ? error.message : undefined,
								status: "error",
							}),
					},
				);
			}}
		>
			<div className="space-y-4 px-5 pt-5 pb-4">
				<div>
					<DialogTitle className="pe-8 font-medium text-[20px] text-dashboard-text-primary leading-7">
						New message
					</DialogTitle>
					<DialogDescription className="mt-1 text-[13px] text-dashboard-text-secondary">
						{viewer === "school"
							? "Write to a guardian about their child. Replies come back here."
							: "Write to the school about your child. Replies come back here."}
					</DialogDescription>
				</div>

				{viewer === "school" ? (
					<div>
						<p className="mb-2 text-[12px] text-dashboard-text-dim">To</p>
						{recipient ? (
							<div className="flex items-center justify-between rounded-[8px] border border-dashboard-border-strong px-3 py-2 text-[13px]">
								<span>
									<span className="font-medium text-dashboard-text-primary">
										{recipient.guardianName}
									</span>{" "}
									<span className="text-dashboard-text-dim">
										· {recipient.relationship ?? "guardian"} of {recipient.studentName}
										{recipient.sectionName ? `, ${recipient.sectionName}` : ""}
									</span>
								</span>
								<button
									type="button"
									onClick={() => setRecipient(null)}
									className="text-[12px] text-dashboard-text-dim hover:text-dashboard-text-primary"
								>
									Change
								</button>
							</div>
						) : (
							<>
								<SearchInput
									value={search}
									onValueChange={setSearch}
									placeholder="Search a guardian or child"
									aria-label="Search a guardian or child"
								/>
								<ul className="mt-2 max-h-56 overflow-y-auto rounded-[8px] border border-dashboard-border">
									{(recipients.data?.recipients ?? []).map((option) => (
										<li key={`${option.guardianId}:${option.studentId}`}>
											<button
												type="button"
												onClick={() => setRecipient(option)}
												className="flex w-full items-center justify-between gap-3 px-3 py-2 text-start text-[13px] hover:bg-dashboard-hover"
											>
												<span className="min-w-0 truncate">
													<span className="text-dashboard-text-primary">{option.guardianName}</span>{" "}
													<span className="text-dashboard-text-dim">
														· {option.studentName}
														{option.sectionName ? `, ${option.sectionName}` : ""}
													</span>
												</span>
												<span
													className={cn(
														"shrink-0 text-[12px]",
														option.hasAppAccount
															? "text-[var(--rx-success)]"
															: "text-dashboard-text-dim",
													)}
												>
													{option.hasAppAccount ? "On School OS" : "WhatsApp later"}
												</span>
											</button>
										</li>
									))}
									{recipients.data && recipients.data.recipients.length === 0 ? (
										<li className="px-3 py-3 text-[13px] text-dashboard-text-dim">
											No guardians match.
										</li>
									) : null}
								</ul>
							</>
						)}
					</div>
				) : familyChildren.length > 1 ? (
					<div>
						<p className="mb-2 text-[12px] text-dashboard-text-dim">About</p>
						<SelectField
							aria-label="Child"
							items={familyChildren.map((child) => ({
								value: child.studentId,
								label: `${child.firstName} ${child.lastName}`.trim(),
							}))}
							value={studentId ?? ""}
							onValueChange={setChildId}
						/>
					</div>
				) : null}

				<div>
					<label htmlFor={`${id}-body`} className="mb-2 block text-[12px] text-dashboard-text-dim">
						Message
					</label>
					<Textarea
						id={`${id}-body`}
						value={body}
						onChange={(event) => setBody(event.target.value)}
						rows={4}
						maxLength={2000}
						className="min-h-[96px] text-[14px]"
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
					disabled={!ready || start.isPending}
					className="inline-flex h-8 items-center rounded-[6px] bg-[var(--rx-accent)] px-3 font-medium text-[13px] text-white hover:opacity-90 disabled:opacity-50"
				>
					Send
				</button>
			</footer>
		</form>
	);
}
