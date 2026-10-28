export const approvalsQueryKeys = {
	root: ["approvals"] as const,
	queue: (tenantId: string) => [...approvalsQueryKeys.root, tenantId, "queue"] as const,
	mine: (tenantId: string) => [...approvalsQueryKeys.root, tenantId, "mine"] as const,
};
