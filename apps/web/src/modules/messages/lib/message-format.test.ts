import { describe, expect, it } from "vitest";
import type { ThreadMessage, ThreadSummary } from "../types/messages.types";
import {
	groupByDay,
	guardianLine,
	messageMeta,
	previewPrefix,
	threadTitle,
} from "./message-format";

const thread: ThreadSummary = {
	id: "t",
	guardian: { id: "g", name: "Javed Akhtar", relationship: "father", hasAppAccount: true },
	student: { id: "s", name: "Saad Javed", sectionName: "7-B" },
	needsReply: true,
	unread: 1,
	lastMessageAt: "2026-10-29T09:02:00Z",
	lastMessagePreview: "He has fever",
	lastMessageDirection: "from_family",
};

const message = (overrides: Partial<ThreadMessage>): ThreadMessage => ({
	id: "m",
	direction: "to_family",
	body: "Hi",
	channel: "app",
	status: "sent",
	readAt: null,
	createdAt: "2026-10-29T09:02:00Z",
	senderName: "Sana Iqbal",
	mine: true,
	...overrides,
});

describe("message format", () => {
	it("titles a thread from each side", () => {
		expect(threadTitle(thread, "school")).toBe("Javed Akhtar · Saad, 7-B");
		expect(threadTitle(thread, "family")).toBe("About Saad Javed");
		expect(guardianLine(thread)).toBe("Father of Saad Javed · 7-B");
		expect(previewPrefix(thread, "family")).toBe("You: ");
		expect(previewPrefix(thread, "school")).toBe("");
		expect(previewPrefix({ ...thread, lastMessageDirection: "to_family" }, "school")).toBe(
			"Replied: ",
		);
	});

	it("groups messages by day", () => {
		const groups = groupByDay([
			message({ id: "a", createdAt: "2026-10-28T09:00:00" }),
			message({ id: "b", createdAt: "2026-10-29T08:00:00" }),
			message({ id: "c", createdAt: "2026-10-29T10:00:00" }),
		]);
		expect(groups.map((group) => group.messages.map((item) => item.id))).toEqual([
			["a"],
			["b", "c"],
		]);
	});

	it("says whether what you sent was read, or waits for WhatsApp", () => {
		expect(messageMeta(message({ status: "read" }), true)).toMatch(/School OS · .* · Read$/);
		expect(messageMeta(message({}), true)).toMatch(/Sent$/);
		expect(messageMeta(message({}), false)).toMatch(/Waiting for WhatsApp$/);
		expect(
			messageMeta(message({ mine: false, direction: "from_family", senderName: "Javed" }), true),
		).toMatch(/^Javed · School OS/);
	});
});
