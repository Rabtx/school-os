export type MessagingStatus = {
	whatsapp: {
		connected: boolean;
		enabled: boolean;
		provider: "sandbox" | "meta";
		live: boolean;
		connectedAt: string | null;
	};
	sms: { fallbackEnabled: boolean; provider: "sandbox"; live: boolean };
	last24h: {
		queued: number;
		sent: number;
		delivered: number;
		read: number;
		failed: number;
		skipped: number;
		sms: number;
	};
};

export type DeliveryLogItem = {
	id: string;
	sourceType: "message" | "notice";
	channel: "whatsapp" | "sms";
	status: "queued" | "sent" | "delivered" | "read" | "failed" | "skipped";
	language: "en" | "ur";
	body: string;
	error: string | null;
	toPhone: string;
	createdAt: string;
	sentAt: string | null;
	readAt: string | null;
};
