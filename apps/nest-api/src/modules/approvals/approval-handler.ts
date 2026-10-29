import type * as z from 'zod';

import type { ApprovalRisk, ApproverRole, MembershipRecord } from '@/database/schema';

export type ApprovalFact = { label: string; value: string };

/** What the queue card shows for a request (Figma `82:37115`, `126:40250`). */
export type ApprovalCard = {
	title: string;
	subtitle: string;
	/** The requester's own words, e.g. "Message from parent". */
	quote: { label: string; text: string } | null;
	/** Heading over the requester's note, e.g. "Message from the guardian". */
	noteLabel?: string;
	facts: ApprovalFact[];
	/** "If you approve: …", told before the decision. */
	outcome: string;
	approveLabel: string;
	declineTitle: string;
	declineReasons: string[];
};

/** What applying an approval changed, shown in the Approved state and used to undo it. */
export type ApprovalEffect = {
	headline: string;
	facts: ApprovalFact[];
	undo: Record<string, unknown>;
};

export type PreparedRequest<P> = {
	payload: P;
	dedupeKey: string;
	risk: ApprovalRisk;
	approverRole: ApproverRole;
	expiresAt: Date | null;
};

/**
 * One kind of request in the registry. A handler owns its payload: it validates who may ask and
 * what, describes the card, applies the decision as the approver, and reverses it on undo.
 */
export interface ApprovalHandler<Input = unknown, Payload = unknown> {
	type: string;
	/** The chip on the card, e.g. "Attendance". */
	label: string;
	inputSchema: z.ZodType<Input>;
	prepare(
		context: { userId: string; tenantId: string },
		input: Input,
	): Promise<PreparedRequest<Payload>>;
	describe(payload: Payload): ApprovalCard;
	apply(
		context: { tenantId: string; approver: MembershipRecord },
		payload: Payload,
	): Promise<ApprovalEffect>;
	undo(
		context: { tenantId: string; approver: MembershipRecord },
		payload: Payload,
		undo: Record<string, unknown>,
	): Promise<void>;
	/** Optional: undo side effects of asking, when the request is declined or withdrawn. */
	release?(context: { tenantId: string }, payload: Payload): Promise<void>;
	/** What stays in place when nobody decided in time (Figma `221:117286`). */
	expired(payload: Payload): { summary: string; facts: ApprovalFact[] };
	/** One line for the Declined state and the requester. */
	declined(payload: Payload, reason: string): string;
}
