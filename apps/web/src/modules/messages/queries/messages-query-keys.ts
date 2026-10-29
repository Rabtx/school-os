export const messagesQueryKeys = {
	root: ["messages"] as const,
	threads: (tenantId: string, filter: string, search: string) =>
		[...messagesQueryKeys.root, tenantId, "threads", filter, search] as const,
	thread: (tenantId: string, threadId: string) =>
		[...messagesQueryKeys.root, tenantId, "thread", threadId] as const,
	recipients: (tenantId: string, search: string) =>
		[...messagesQueryKeys.root, tenantId, "recipients", search] as const,
};
