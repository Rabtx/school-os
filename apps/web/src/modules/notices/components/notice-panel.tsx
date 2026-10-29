"use client";

import { Avatar } from "@rabtx/ui/avatar";
import { Meter } from "@rabtx/ui/meter";
import {
	Drawer,
	DrawerContent,
	DrawerDescription,
	DrawerTitle,
} from "@school-os/ui/components/drawer";
import { Spinner } from "@school-os/ui/components/spinner";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useNoticeQuery } from "../hooks/use-notices";
import { reachLine, readRate, STATUS_LABEL, whenLabel } from "../lib/notice-format";
import type { NoticeDetail } from "../types/notices.types";

/** A notice's side panel (Figma `185:56501`, right): status, actions, message, reach and audience. */
export function NoticePanel({
	tenantId,
	noticeId,
	busy,
	onClose,
	onSend,
	onSubmit,
	onEdit,
	onDelete,
}: {
	tenantId: string;
	noticeId: string | null;
	busy: boolean;
	onClose: () => void;
	onSend: (notice: NoticeDetail) => void;
	onSubmit: (notice: NoticeDetail) => void;
	onEdit: (notice: NoticeDetail) => void;
	onDelete: (notice: NoticeDetail) => void;
}) {
	const query = useNoticeQuery(tenantId, noticeId);
	const notice = query.data ?? null;
	return (
		<Drawer open={Boolean(noticeId)} onOpenChange={(open) => !open && onClose()} direction="right">
			<DrawerContent className="h-full max-h-none gap-0 border-dashboard-border bg-dashboard-sidebar-bg text-[13px] tracking-[-0.15px] data-[vaul-drawer-direction=right]:w-full data-[vaul-drawer-direction=right]:sm:max-w-[440px]">
				{notice ? (
					<div className="flex h-full min-h-0 flex-col">
						<header className="flex items-start gap-3 border-dashboard-border border-b px-5 py-4">
							<Avatar name={notice.author ?? notice.title} tone="accent" />
							<div className="min-w-0 flex-1">
								<DrawerTitle className="font-medium text-[15px] text-dashboard-text-primary">
									{notice.title}
								</DrawerTitle>
								<DrawerDescription className="truncate text-[12px] text-dashboard-text-dim">
									{notice.audienceLabel} · {whenLabel(notice)}
									{notice.author ? ` · ${notice.author}` : ""}
								</DrawerDescription>
							</div>
							<button
								type="button"
								onClick={onClose}
								className="rounded-[6px] px-2 py-1 text-[12px] text-dashboard-text-dim hover:bg-dashboard-hover"
							>
								Close
							</button>
						</header>

						<div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-4">
							<div className="flex flex-wrap items-center gap-2">
								<span
									className={cn(
										"inline-flex h-6 items-center gap-1.5 rounded-[4px] px-2 text-[12px]",
										notice.status === "sent"
											? "bg-[color-mix(in_oklab,var(--rx-success)_16%,transparent)] text-[var(--rx-success)]"
											: notice.status === "pending_approval"
												? "bg-[color-mix(in_oklab,var(--rx-warning)_16%,transparent)] text-[var(--rx-warning)]"
												: "bg-dashboard-hover text-dashboard-text-secondary",
									)}
								>
									{STATUS_LABEL[notice.status]}
								</span>
								<span className="inline-flex h-6 items-center rounded-[4px] bg-dashboard-hover px-2 text-[12px] text-dashboard-text-secondary">
									{notice.status === "sent"
										? `${notice.recipientCount} people`
										: notice.reach
											? `${notice.reach.total} people`
											: "—"}
								</span>
							</div>

							{notice.status === "draft" ? (
								<div className="flex flex-wrap gap-2">
									<button
										type="button"
										disabled={busy}
										onClick={() => (notice.canSendDirectly ? onSend(notice) : onSubmit(notice))}
										className="inline-flex h-8 items-center rounded-[6px] bg-[var(--rx-accent)] px-3 font-medium text-[13px] text-white hover:opacity-90 disabled:opacity-50"
									>
										{notice.canSendDirectly ? "Approve and send" : "Send for approval"}
									</button>
									<button
										type="button"
										onClick={() => onEdit(notice)}
										className="inline-flex h-8 items-center rounded-[6px] border border-dashboard-border-strong px-3 font-medium text-[13px] text-dashboard-text-primary hover:bg-dashboard-hover"
									>
										Edit
									</button>
									<button
										type="button"
										onClick={() => onDelete(notice)}
										className="inline-flex h-8 items-center rounded-[6px] px-3 text-[13px] text-dashboard-text-dim hover:bg-dashboard-hover hover:text-[var(--rx-danger)]"
									>
										Delete draft
									</button>
								</div>
							) : notice.status === "pending_approval" ? (
								<p className="rounded-[8px] bg-dashboard-hover/60 px-3 py-2 text-dashboard-text-secondary">
									Waiting in the principal&apos;s approvals. If they say no, it comes back here as a
									draft with their reason.
								</p>
							) : null}

							<Section title="Message">
								<p className="whitespace-pre-line rounded-[10px] bg-dashboard-bg px-3 py-3 text-[14px] text-dashboard-text-primary leading-5">
									{notice.body}
								</p>
							</Section>

							<Section
								title="Reach"
								aside={
									notice.status === "sent"
										? `${notice.readCount} of ${notice.recipientCount} read`
										: undefined
								}
							>
								{notice.status === "sent" ? (
									<>
										<Meter rate={readRate(notice)} />
										<p className="text-[12px] text-dashboard-text-dim">
											{notice.onAppCount} reached in School OS.{" "}
											{notice.recipientCount - notice.onAppCount > 0
												? `${notice.recipientCount - notice.onAppCount} are not on the app yet and get it by WhatsApp once it is connected.`
												: ""}
										</p>
									</>
								) : notice.reach ? (
									<p className="text-dashboard-text-secondary">{reachLine(notice.reach)}</p>
								) : null}
							</Section>

							<Section title="Timing">
								<p className="text-dashboard-text-secondary">
									{notice.status === "sent"
										? whenLabel(notice)
										: "Sends as soon as it is approved. Quiet hours apply to WhatsApp once connected."}
								</p>
							</Section>
						</div>
					</div>
				) : (
					<div className="flex h-full items-center justify-center">
						<DrawerTitle className="sr-only">Notice</DrawerTitle>
						<DrawerDescription className="sr-only">Loading the notice</DrawerDescription>
						{noticeId ? <Spinner className="size-5" /> : null}
					</div>
				)}
			</DrawerContent>
		</Drawer>
	);
}

function Section({
	title,
	aside,
	children,
}: {
	title: string;
	aside?: string;
	children: ReactNode;
}) {
	return (
		<section className="space-y-2">
			<div className="flex items-center justify-between">
				<h3 className="text-[12px] text-dashboard-text-dim uppercase">{title}</h3>
				{aside ? <span className="text-[12px] text-dashboard-text-dim">{aside}</span> : null}
			</div>
			{children}
		</section>
	);
}
