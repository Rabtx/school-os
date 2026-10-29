import type { ThreadMessage, ThreadSummary, Viewer } from "../types/messages.types";

/** "9:02" today, "Wed" this week, otherwise "12 Oct". */
export function listTime(iso: string, now: Date): string {
	const date = new Date(iso);
	if (date.toDateString() === now.toDateString()) {
		return date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
	}
	const days = (now.getTime() - date.getTime()) / 86_400_000;
	if (days < 6) return date.toLocaleDateString(undefined, { weekday: "short" });
	return date.toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

/** "Today · Thu, 8 Oct", "Yesterday", or the date, over each day's messages. */
export function dayHeading(iso: string, now: Date): string {
	const date = new Date(iso);
	const label = date.toLocaleDateString(undefined, {
		weekday: "short",
		day: "numeric",
		month: "short",
	});
	if (date.toDateString() === now.toDateString()) return `Today · ${label}`;
	const yesterday = new Date(now);
	yesterday.setDate(now.getDate() - 1);
	if (date.toDateString() === yesterday.toDateString()) return `Yesterday · ${label}`;
	return label;
}

/** Messages split by calendar day, oldest first. */
export function groupByDay(
	messages: ThreadMessage[],
): { day: string; messages: ThreadMessage[] }[] {
	const groups: { day: string; messages: ThreadMessage[] }[] = [];
	for (const message of messages) {
		const day = new Date(message.createdAt).toDateString();
		const last = groups.at(-1);
		if (last && last.day === day) last.messages.push(message);
		else groups.push({ day, messages: [message] });
	}
	return groups;
}

/** The list row's title: who the conversation is with, from the viewer's side. */
export function threadTitle(thread: ThreadSummary, viewer: Viewer): string {
	if (viewer === "family") return `About ${thread.student.name}`;
	const child = thread.student.name.split(" ")[0] ?? thread.student.name;
	return `${thread.guardian.name} · ${child}${thread.student.sectionName ? `, ${thread.student.sectionName}` : ""}`;
}

/**
 * Before the last line in the list: a guardian sees "You:" on their own; staff see "Replied:"
 * because any of them may have answered.
 */
export function previewPrefix(thread: ThreadSummary, viewer: Viewer): string {
	if (viewer === "family") return thread.lastMessageDirection === "from_family" ? "You: " : "";
	return thread.lastMessageDirection === "to_family" ? "Replied: " : "";
}

/** "Father of Saad Javed · 7-B" under the thread header. */
export function guardianLine(thread: ThreadSummary): string {
	const relation = thread.guardian.relationship
		? `${thread.guardian.relationship[0]?.toUpperCase()}${thread.guardian.relationship.slice(1)}`
		: "Guardian";
	return `${relation} of ${thread.student.name}${thread.student.sectionName ? ` · ${thread.student.sectionName}` : ""}`;
}

/** The line under a message: channel, time and, for what the viewer sent, whether it was read. */
export function messageMeta(message: ThreadMessage, hasAppAccount: boolean): string {
	const time = new Date(message.createdAt).toLocaleTimeString(undefined, {
		hour: "numeric",
		minute: "2-digit",
	});
	const channel =
		message.channel === "app" ? "School OS" : message.channel === "sms" ? "SMS" : "WhatsApp";
	const parts = [
		message.senderName && !message.mine ? message.senderName : null,
		`${channel} · ${time}`,
	];
	if (message.mine) {
		if (message.status === "read") parts.push("Read");
		else if (message.direction === "to_family" && !hasAppAccount)
			parts.push("Waiting for WhatsApp");
		else parts.push("Sent");
	}
	return parts.filter(Boolean).join(" · ");
}
