"use client";

import { BubbleChatIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { cn } from "@/lib/utils";
import { listTime, previewPrefix, threadTitle } from "../lib/message-format";
import type { ThreadSummary, Viewer } from "../types/messages.types";

/** Conversation rows (Figma `77:66449`, left column): who, the last line, when, and unread. */
export function ThreadList({
	threads,
	viewer,
	selectedId,
	now,
	onSelect,
}: {
	threads: ThreadSummary[];
	viewer: Viewer;
	selectedId: string | null;
	now: Date;
	onSelect: (threadId: string) => void;
}) {
	return (
		<ul className="space-y-1 p-2">
			{threads.map((thread) => {
				const waiting = viewer === "school" && thread.needsReply;
				return (
					<li key={thread.id}>
						<button
							type="button"
							onClick={() => onSelect(thread.id)}
							aria-current={thread.id === selectedId ? "true" : undefined}
							className={cn(
								"flex w-full items-center gap-3 rounded-[10px] px-3 py-3 text-start transition-colors",
								thread.id === selectedId ? "bg-dashboard-hover" : "hover:bg-dashboard-hover/60",
							)}
						>
							<span
								className={cn(
									"flex size-8 shrink-0 items-center justify-center rounded-full",
									waiting
										? "bg-[color-mix(in_oklab,var(--rx-danger)_18%,transparent)] text-[var(--rx-danger)]"
										: "bg-dashboard-bg text-dashboard-text-dim",
								)}
							>
								<HugeiconsIcon icon={BubbleChatIcon} size={16} strokeWidth={1.8} />
							</span>
							<span className="min-w-0 flex-1">
								<span className="block truncate font-medium text-[14px] text-dashboard-text-primary">
									{threadTitle(thread, viewer)}
								</span>
								<span className="block truncate text-[13px] text-dashboard-text-secondary">
									{previewPrefix(thread, viewer)}
									{thread.lastMessagePreview}
								</span>
							</span>
							<span className="flex shrink-0 items-center gap-2 text-[12px] text-dashboard-text-dim">
								{listTime(thread.lastMessageAt, now)}
								<span
									aria-label={thread.unread > 0 ? `${thread.unread} unread` : undefined}
									className={cn(
										"size-2 rounded-full",
										thread.unread > 0 ? "bg-[var(--rx-accent)]" : "bg-transparent",
									)}
								/>
							</span>
						</button>
					</li>
				);
			})}
		</ul>
	);
}
