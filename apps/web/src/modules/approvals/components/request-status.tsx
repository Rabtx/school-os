import { cn } from "@/lib/utils";
import type { ApprovalView } from "../types/approvals.types";

const STATUS: Record<ApprovalView["status"], { label: string; className: string }> = {
	pending: {
		label: "Waiting",
		className:
			"text-[var(--rx-warning)] border-[color-mix(in_oklab,var(--rx-warning)_45%,transparent)]",
	},
	approved: {
		label: "Approved",
		className:
			"text-[var(--rx-success)] border-[color-mix(in_oklab,var(--rx-success)_45%,transparent)]",
	},
	declined: {
		label: "Not approved",
		className:
			"text-[var(--rx-danger)] border-[color-mix(in_oklab,var(--rx-danger)_45%,transparent)]",
	},
	expired: {
		label: "Ran out of time",
		className: "text-dashboard-text-dim border-dashboard-border",
	},
	cancelled: { label: "Withdrawn", className: "text-dashboard-text-dim border-dashboard-border" },
};

/** The state of a request, as its requester sees it. */
export function RequestStatus({ status }: { status: ApprovalView["status"] }) {
	return (
		<span
			className={cn(
				"inline-flex h-6 shrink-0 items-center rounded-[4px] border px-1.5 text-[12px]",
				STATUS[status].className,
			)}
		>
			{STATUS[status].label}
		</span>
	);
}

/** The line under a decided request: the reason, what stayed in place, or who approved it. */
export function requestOutcomeLine(request: ApprovalView): string | null {
	if (request.status === "declined") return request.declined;
	if (request.status === "expired") return request.expiry?.summary ?? null;
	if (request.status === "approved") {
		return request.decision?.by ? `Approved by ${request.decision.by}` : "Approved";
	}
	return null;
}
