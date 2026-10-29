"use client";

import { ArrowUp02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Avatar } from "@rabtx/ui/avatar";
import { Spinner } from "@school-os/ui/components/spinner";
import { Textarea } from "@school-os/ui/components/textarea";
import { useToast } from "@school-os/ui/components/toaster";
import { Fragment, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { useReplyMutation, useThreadQuery } from "../hooks/use-messages";
import { dayHeading, groupByDay, guardianLine, messageMeta } from "../lib/message-format";
import type { ThreadDetail } from "../types/messages.types";

/** One conversation (Figma `77:66449`, right): header, messages by day, and the reply box. */
export function ThreadView({
	tenantId,
	threadId,
	schoolName,
	now,
}: {
	tenantId: string;
	threadId: string;
	schoolName: string;
	now: Date;
}) {
	const query = useThreadQuery(tenantId, threadId);
	if (query.isLoading || !query.data) {
		return (
			<div className="flex h-full items-center justify-center">
				<Spinner className="size-5" />
			</div>
		);
	}
	return (
		<Conversation
			key={threadId}
			tenantId={tenantId}
			detail={query.data}
			schoolName={schoolName}
			now={now}
		/>
	);
}

function Conversation({
	tenantId,
	detail,
	schoolName,
	now,
}: {
	tenantId: string;
	detail: ThreadDetail;
	schoolName: string;
	now: Date;
}) {
	const { thread, viewer, messages } = detail;
	const toast = useToast();
	const reply = useReplyMutation(tenantId, thread.id);
	const [draft, setDraft] = useState("");
	const endRef = useRef<HTMLDivElement>(null);

	const lastMessageId = messages.at(-1)?.id;
	// Keep the newest message in view when one arrives.
	useEffect(() => {
		if (lastMessageId) endRef.current?.scrollIntoView({ block: "end" });
	}, [lastMessageId]);

	const title = viewer === "school" ? thread.guardian.name : schoolName;
	const subtitle = viewer === "school" ? guardianLine(thread) : `About ${thread.student.name}`;
	const replyTo = viewer === "school" ? thread.guardian.name.split(" ")[0] : "the school";

	function send() {
		const body = draft.trim();
		if (!body || reply.isPending) return;
		reply.mutate(body, {
			onSuccess: () => setDraft(""),
			onError: (error) =>
				toast.show({
					title: "Message not sent",
					description: error instanceof Error ? error.message : undefined,
					status: "error",
				}),
		});
	}

	return (
		<div className="flex h-full min-h-0 flex-col tracking-[-0.15px]">
			<header className="flex shrink-0 items-center gap-3 border-dashboard-border border-b px-5 py-3">
				<Avatar name={title} tone="accent" />
				<div className="min-w-0 flex-1">
					<p className="truncate font-medium text-[15px] text-dashboard-text-primary">{title}</p>
					<p className="truncate text-[13px] text-dashboard-text-dim">{subtitle}</p>
				</div>
				{viewer === "school" ? (
					<span
						className={cn(
							"hidden h-6 shrink-0 items-center rounded-[4px] px-2 text-[12px] sm:inline-flex",
							thread.guardian.hasAppAccount
								? "bg-[color-mix(in_oklab,var(--rx-success)_16%,transparent)] text-[var(--rx-success)]"
								: "bg-dashboard-hover text-dashboard-text-secondary",
						)}
					>
						{thread.guardian.hasAppAccount ? "On School OS" : "Not on the app yet"}
					</span>
				) : null}
			</header>

			<div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
				{viewer === "school" && !thread.guardian.hasAppAccount ? (
					<p className="mb-4 rounded-[8px] bg-dashboard-hover/60 px-3 py-2 text-center text-[12px] text-dashboard-text-dim">
						{thread.guardian.name} has no School OS account. Messages wait here and go out by
						WhatsApp once it is connected.
					</p>
				) : null}
				{groupByDay(messages).map((group) => (
					<Fragment key={group.day}>
						<p className="my-3 text-center text-[13px] text-dashboard-text-dim">
							{dayHeading(group.messages[0]?.createdAt ?? "", now)}
						</p>
						<ul className="space-y-4">
							{group.messages.map((message) => {
								const outgoing = (viewer === "school") === (message.direction === "to_family");
								return (
									<li
										key={message.id}
										className={cn("flex flex-col", outgoing ? "items-end" : "items-start")}
									>
										<div
											className={cn(
												"max-w-[75%] whitespace-pre-line rounded-[12px] px-3.5 py-2.5 text-[14px] leading-5",
												outgoing
													? "border border-[color-mix(in_oklab,var(--rx-accent)_45%,transparent)] bg-[color-mix(in_oklab,var(--rx-accent)_16%,var(--dashboard-surface,transparent))] text-dashboard-text-primary"
													: "bg-dashboard-hover text-dashboard-text-primary",
											)}
										>
											{message.body}
										</div>
										<p className="mt-1 text-[12px] text-dashboard-text-dim">
											{messageMeta(message, thread.guardian.hasAppAccount)}
										</p>
									</li>
								);
							})}
						</ul>
					</Fragment>
				))}
				<div ref={endRef} />
			</div>

			<form
				className="shrink-0 px-5 pb-5"
				onSubmit={(event) => {
					event.preventDefault();
					send();
				}}
			>
				<div className="rounded-[14px] border border-dashboard-border-strong bg-dashboard-surface p-2">
					<Textarea
						value={draft}
						onChange={(event) => setDraft(event.target.value)}
						onKeyDown={(event) => {
							if (event.key === "Enter" && !event.shiftKey) {
								event.preventDefault();
								send();
							}
						}}
						rows={2}
						maxLength={2000}
						aria-label={`Reply to ${replyTo}`}
						placeholder={`Reply to ${replyTo}…`}
						className="min-h-[56px] resize-none border-0 bg-transparent text-[14px] shadow-none focus-visible:ring-0"
					/>
					<div className="flex items-center justify-between px-1">
						<span className="text-[12px] text-dashboard-text-dim">
							Enter to send · Shift+Enter for a new line
						</span>
						<button
							type="submit"
							aria-label="Send"
							disabled={!draft.trim() || reply.isPending}
							className="flex size-8 items-center justify-center rounded-full bg-[var(--rx-accent)] text-white hover:opacity-90 disabled:opacity-40"
						>
							{reply.isPending ? (
								<Spinner className="size-4" />
							) : (
								<HugeiconsIcon icon={ArrowUp02Icon} size={16} strokeWidth={2} />
							)}
						</button>
					</div>
				</div>
			</form>
		</div>
	);
}
