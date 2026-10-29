"use client";

import { WhatsappIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useMessagingStatusQuery } from "../hooks/use-messaging";

/** The sidebar's WhatsApp card (Figma `76:54336`): connected, sandbox or not connected. */
export function WhatsAppSidebarCard({
	tenantId,
	onNavigate,
}: {
	tenantId: string | null;
	onNavigate?: () => void;
}) {
	const status = useMessagingStatusQuery(tenantId).data?.whatsapp;
	const state =
		!status || !status.connected || !status.enabled ? "off" : status.live ? "live" : "sandbox";
	return (
		<Link
			href="/admin/settings/communication"
			onClick={onNavigate}
			className="flex items-center gap-2 rounded-[8px] border border-dashboard-border bg-dashboard-surface px-3 py-2 text-[13px] transition-colors hover:bg-dashboard-hover"
		>
			<HugeiconsIcon
				icon={WhatsappIcon}
				size={16}
				strokeWidth={1.8}
				className={state === "off" ? "text-dashboard-text-dim" : "text-[var(--rx-success)]"}
			/>
			<span className="flex-1 text-dashboard-text-secondary">WhatsApp</span>
			<span
				className={cn(
					"text-[12px]",
					state === "live" && "text-[var(--rx-success)]",
					state === "sandbox" && "text-[var(--rx-warning)]",
					state === "off" && "text-dashboard-text-dim",
				)}
			>
				{state === "live" ? "Connected" : state === "sandbox" ? "Sandbox" : "Not connected"}
			</span>
		</Link>
	);
}
