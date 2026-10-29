import type { AudienceReach, NoticeItem } from "../types/notices.types";

/** Share of recipients who opened it, or null before anyone was reached. */
export function readRate(notice: Pick<NoticeItem, "readCount" | "recipientCount">): number | null {
	if (notice.recipientCount === 0) return null;
	return Math.round((notice.readCount / notice.recipientCount) * 100);
}

/** "238 people · 12 on School OS", the reach line under a draft. */
export function reachLine(reach: AudienceReach): string {
	const parts = [`${reach.total} ${reach.total === 1 ? "person" : "people"}`];
	if (reach.parents > 0) {
		const later = reach.parents - reach.parentsOnApp;
		parts.push(
			`${reach.parentsOnApp} ${reach.parentsOnApp === 1 ? "parent" : "parents"} on School OS${later > 0 ? `, ${later} by WhatsApp once connected` : ""}`,
		);
	}
	if (reach.staff > 0) parts.push(`${reach.staff} staff`);
	return parts.join(" · ");
}

export const STATUS_LABEL: Record<NoticeItem["status"], string> = {
	draft: "Draft",
	pending_approval: "Waiting for approval",
	sent: "Sent",
};

/** "Sent 29 Oct, 9:02" or "Saved 29 Oct". */
export function whenLabel(notice: Pick<NoticeItem, "sentAt" | "createdAt">): string {
	const iso = notice.sentAt ?? notice.createdAt;
	const date = new Date(iso);
	const day = date.toLocaleDateString(undefined, { day: "numeric", month: "short" });
	if (!notice.sentAt) return `Saved ${day}`;
	return `Sent ${day}, ${date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}`;
}
