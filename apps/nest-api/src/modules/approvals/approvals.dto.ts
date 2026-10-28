import * as z from 'zod';

export const createApprovalSchema = z
	.object({
		type: z.string().trim().min(1).max(64),
		input: z.record(z.string(), z.unknown()),
		note: z.string().trim().max(500).optional(),
	})
	.strict();

export type CreateApprovalInput = z.infer<typeof createApprovalSchema>;

export const declineApprovalSchema = z
	.object({
		reason: z.string().trim().min(1, 'Say why, so they know what to do next').max(500),
	})
	.strict();

export type DeclineApprovalInput = z.infer<typeof declineApprovalSchema>;
