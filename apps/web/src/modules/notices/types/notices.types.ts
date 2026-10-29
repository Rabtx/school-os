export type NoticeAudience =
	| { kind: "all_parents" }
	| { kind: "sections"; sectionIds: string[] }
	| { kind: "staff" }
	| { kind: "everyone" };

export type NoticeStatus = "draft" | "pending_approval" | "sent";

export type AudienceReach = { parents: number; parentsOnApp: number; staff: number; total: number };

export type NoticeItem = {
	id: string;
	title: string;
	body: string;
	audience: NoticeAudience;
	audienceLabel: string;
	status: NoticeStatus;
	author: string | null;
	createdAt: string;
	sentAt: string | null;
	recipientCount: number;
	readCount: number;
	onAppCount: number;
};

export type NoticeDetail = NoticeItem & { canSendDirectly: boolean; reach: AudienceReach | null };

export type NoticeList = {
	canSendDirectly: boolean;
	notices: NoticeItem[];
	totals: { sent: number; drafts: number; notRead: number };
};

export type AudienceOptions = {
	canReachEveryone: boolean;
	sections: { id: string; name: string; campusName: string; families: number }[];
};

export type InboxNotice = {
	id: string;
	title: string;
	body: string;
	sentAt: string | null;
	from: string | null;
	readAt: string | null;
};

export type NoticeDraft = { title: string; body: string; audience: NoticeAudience };
