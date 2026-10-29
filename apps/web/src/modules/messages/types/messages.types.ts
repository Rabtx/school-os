export type MessageDirection = "to_family" | "from_family";
export type Viewer = "school" | "family";

export type ThreadSummary = {
	id: string;
	guardian: { id: string; name: string; relationship: string | null; hasAppAccount: boolean };
	student: { id: string; name: string; sectionName: string | null };
	needsReply: boolean;
	unread: number;
	lastMessageAt: string;
	lastMessagePreview: string;
	lastMessageDirection: MessageDirection;
};

export type ThreadList = { viewer: Viewer; threads: ThreadSummary[] };

export type ThreadMessage = {
	id: string;
	direction: MessageDirection;
	body: string;
	channel: "app" | "whatsapp" | "sms";
	status: "sent" | "delivered" | "read" | "failed";
	readAt: string | null;
	createdAt: string;
	senderName: string | null;
	mine: boolean;
	/** How it reached the family outside the app, once WhatsApp delivery ran. */
	delivery: {
		channel: "whatsapp" | "sms";
		status: "queued" | "sent" | "delivered" | "read" | "failed" | "skipped";
	} | null;
};

export type ThreadDetail = { viewer: Viewer; thread: ThreadSummary; messages: ThreadMessage[] };

export type Recipient = {
	guardianId: string;
	guardianName: string;
	relationship: string | null;
	hasAppAccount: boolean;
	studentId: string;
	studentName: string;
	sectionName: string | null;
};
