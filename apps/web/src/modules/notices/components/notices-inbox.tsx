"use client";

import { Spinner } from "@school-os/ui/components/spinner";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useInboxQuery, useMarkNoticeRead } from "../hooks/use-notices";

/** Notices that reached the signed-in member; opening one marks it read. */
export function NoticesInbox({ tenantId }: { tenantId: string }) {
	const inbox = useInboxQuery(tenantId);
	const markRead = useMarkNoticeRead(tenantId);
	const [openId, setOpenId] = useState<string | null>(null);

	if (inbox.isLoading) {
		return (
			<div className="flex justify-center py-12">
				<Spinner className="size-5" />
			</div>
		);
	}
	const notices = inbox.data?.notices ?? [];
	if (notices.length === 0) {
		return (
			<div className="px-6 py-16 text-center">
				<p className="font-medium text-[14px] text-dashboard-text-primary">No notices yet</p>
				<p className="mt-1 text-[13px] text-dashboard-text-dim">
					Notices from the school show here as soon as they are sent.
				</p>
			</div>
		);
	}
	return (
		<ul className="mx-auto max-w-3xl space-y-2 px-4 py-5 sm:px-6">
			{notices.map((notice) => {
				const open = openId === notice.id;
				const unread = !notice.readAt;
				return (
					<li
						key={notice.id}
						className="rounded-[12px] border border-dashboard-border bg-dashboard-surface"
					>
						<button
							type="button"
							aria-expanded={open}
							onClick={() => {
								setOpenId(open ? null : notice.id);
								if (unread) markRead.mutate(notice.id);
							}}
							className="flex w-full items-start gap-3 px-4 py-3 text-start"
						>
							<span
								aria-label={unread ? "Unread" : undefined}
								className={cn(
									"mt-1.5 size-2 shrink-0 rounded-full",
									unread ? "bg-[var(--rx-accent)]" : "bg-transparent",
								)}
							/>
							<span className="min-w-0 flex-1">
								<span
									className={cn(
										"block text-[14px] text-dashboard-text-primary",
										unread && "font-medium",
									)}
								>
									{notice.title}
								</span>
								<span className="block text-[12px] text-dashboard-text-dim">
									{notice.from ? `${notice.from} · ` : ""}
									{notice.sentAt
										? new Date(notice.sentAt).toLocaleString(undefined, {
												day: "numeric",
												month: "short",
												hour: "numeric",
												minute: "2-digit",
											})
										: ""}
								</span>
								<span
									className={cn(
										"mt-2 block whitespace-pre-line text-[14px] text-dashboard-text-secondary leading-5",
										!open && "line-clamp-1",
									)}
								>
									{notice.body}
								</span>
							</span>
						</button>
					</li>
				);
			})}
		</ul>
	);
}
