import * as z from 'zod';

const body = z.string().trim().min(1, 'Write a message first').max(2000);

export const listThreadsQuerySchema = z.object({
	filter: z.enum(['all', 'needs_reply']).default('all'),
	search: z.string().trim().max(100).optional(),
});
export type ListThreadsQuery = z.infer<typeof listThreadsQuerySchema>;

export const startThreadSchema = z
	.object({
		studentId: z.string().uuid(),
		/** Required for staff; a guardian always writes as themselves. */
		guardianId: z.string().uuid().optional(),
		body,
	})
	.strict();
export type StartThreadInput = z.infer<typeof startThreadSchema>;

export const replySchema = z.object({ body }).strict();
export type ReplyInput = z.infer<typeof replySchema>;

export const recipientsQuerySchema = z.object({
	search: z.string().trim().max(100).default(''),
});
export type RecipientsQuery = z.infer<typeof recipientsQuerySchema>;
