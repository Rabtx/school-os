"use client";

import { WhatsappIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useToast } from "@school-os/ui/components/toaster";
import { useConfirm } from "@/components/states";
import { cn } from "@/lib/utils";
import {
	useMessagingStatusQuery,
	useRecentDeliveriesQuery,
	useWhatsAppConnection,
} from "../hooks/use-messaging";
import type { DeliveryLogItem } from "../types/delivery.types";

const STATUS_LABEL: Record<DeliveryLogItem["status"], string> = {
	queued: "Waiting",
	sent: "Sent",
	delivered: "Delivered",
	read: "Read",
	failed: "Failed",
	skipped: "Not sent",
};

const STATUS_TONE: Partial<Record<DeliveryLogItem["status"], string>> = {
	read: "text-[var(--rx-success)]",
	delivered: "text-dashboard-text-primary",
	failed: "text-[var(--rx-danger)]",
	queued: "text-[var(--rx-warning)]",
};

/**
 * Settings · Communication, the WhatsApp card: whether the school is connected, through which
 * provider, the last day's deliveries, and a log of recent sends for leadership.
 */
export function WhatsAppConnection({
	tenantId,
	canManage,
}: {
	tenantId: string;
	canManage: boolean;
}) {
	const toast = useToast();
	const confirm = useConfirm();
	const status = useMessagingStatusQuery(tenantId).data;
	const connection = useWhatsAppConnection(tenantId);
	const log = useRecentDeliveriesQuery(tenantId, canManage);
	const connected = Boolean(status?.whatsapp.connected);
	const sandbox = status ? !status.whatsapp.live : false;

	async function toggle() {
		if (connected) {
			const yes = await confirm({
				title: "Switch WhatsApp off?",
				consequences: [
					{ label: "Messages and notices", value: "Stay in School OS only" },
					{ label: "Waiting sends", value: "Go out if you switch it back on soon" },
				],
				confirmLabel: "Switch off",
			});
			if (!yes) return;
		}
		connection.mutate(!connected, {
			onSuccess: () =>
				toast.show({
					title: connected ? "WhatsApp switched off" : "WhatsApp connected",
					status: "success",
				}),
			onError: (error) =>
				toast.show({
					title: "Could not change WhatsApp",
					description: error instanceof Error ? error.message : undefined,
					status: "error",
				}),
		});
	}

	return (
		<div className="mb-8 space-y-3">
			<div className="flex flex-wrap items-center gap-3 rounded-[12px] border border-dashboard-border bg-dashboard-surface px-4 py-3.5">
				<span
					className={cn(
						"flex size-9 shrink-0 items-center justify-center rounded-[8px]",
						connected
							? "bg-[color-mix(in_oklab,var(--rx-success)_16%,transparent)] text-[var(--rx-success)]"
							: "bg-dashboard-hover text-dashboard-text-dim",
					)}
				>
					<HugeiconsIcon icon={WhatsappIcon} size={18} strokeWidth={1.8} />
				</span>
				<div className="min-w-0 flex-1">
					<p className="font-medium text-[14px] text-dashboard-text-primary leading-5">
						WhatsApp Business · {sandbox ? "Sandbox" : "Cloud API"}
					</p>
					<p className="text-[13px] text-dashboard-text-dim leading-5">
						{sandbox
							? "Sends are recorded here but do not leave School OS. Add the Meta keys on the server to go live."
							: "Messages, notices and alerts go to guardians' WhatsApp, with SMS when it fails."}
					</p>
				</div>
				<span
					className={cn(
						"inline-flex h-6 items-center gap-1.5 rounded-[6px] px-2 text-[12px]",
						connected
							? "bg-[color-mix(in_oklab,var(--rx-success)_16%,transparent)] text-[var(--rx-success)]"
							: "bg-dashboard-hover text-dashboard-text-secondary",
					)}
				>
					<span
						aria-hidden
						className={cn(
							"size-1.5 rounded-full",
							connected ? "bg-[var(--rx-success)]" : "bg-dashboard-text-dim",
						)}
					/>
					{connected ? "Connected" : "Not connected"}
				</span>
				{canManage ? (
					<button
						type="button"
						disabled={connection.isPending || !status}
						onClick={() => void toggle()}
						className={cn(
							"inline-flex h-8 items-center rounded-[6px] px-3 font-medium text-[13px] disabled:opacity-50",
							connected
								? "border border-dashboard-border-strong text-dashboard-text-primary hover:bg-dashboard-hover"
								: "bg-[var(--rx-accent)] text-white hover:opacity-90",
						)}
					>
						{connected ? "Switch off" : "Connect"}
					</button>
				) : null}
			</div>

			{status && connected ? (
				<dl className="grid grid-cols-2 gap-3 sm:grid-cols-5">
					{[
						{ label: "Sent today", value: status.last24h.sent },
						{ label: "Delivered", value: status.last24h.delivered },
						{ label: "Read", value: status.last24h.read },
						{ label: "Waiting", value: status.last24h.queued },
						{ label: "Failed", value: status.last24h.failed, tone: status.last24h.failed > 0 },
					].map((stat) => (
						<div
							key={stat.label}
							className="rounded-[10px] border border-dashboard-border bg-dashboard-surface px-3 py-2.5"
						>
							<dt className="text-[12px] text-dashboard-text-dim">{stat.label}</dt>
							<dd
								className={cn(
									"font-medium text-[18px] tabular-nums",
									stat.tone ? "text-[var(--rx-danger)]" : "text-dashboard-text-primary",
								)}
							>
								{stat.value}
							</dd>
						</div>
					))}
				</dl>
			) : null}

			{canManage && log.data && log.data.deliveries.length > 0 ? (
				<details className="rounded-[10px] border border-dashboard-border bg-dashboard-surface">
					<summary className="cursor-pointer px-4 py-2.5 text-[13px] text-dashboard-text-secondary">
						Recent deliveries
					</summary>
					<ul className="max-h-72 divide-y divide-dashboard-border overflow-y-auto border-dashboard-border border-t">
						{log.data.deliveries.map((item) => (
							<li key={item.id} className="flex items-start gap-3 px-4 py-2 text-[12px]">
								<span className="w-16 shrink-0 text-dashboard-text-dim uppercase">
									{item.channel}
								</span>
								<span
									className="min-w-0 flex-1 truncate text-dashboard-text-secondary"
									title={item.body}
								>
									{item.toPhone} · {item.body.split("\n")[0]}
								</span>
								<span
									className={cn("shrink-0", STATUS_TONE[item.status] ?? "text-dashboard-text-dim")}
									title={item.error ?? undefined}
								>
									{STATUS_LABEL[item.status]}
								</span>
							</li>
						))}
					</ul>
				</details>
			) : null}
		</div>
	);
}
