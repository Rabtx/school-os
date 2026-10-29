import * as z from 'zod';

import { noticeAudienceSchema } from './notice-audience';

export const noticeDraftSchema = z
	.object({
		title: z.string().trim().min(1, 'Give the notice a title').max(160),
		body: z.string().trim().min(1, 'Write the notice').max(4000),
		audience: noticeAudienceSchema,
	})
	.strict();
export type NoticeDraftInput = z.infer<typeof noticeDraftSchema>;

export const updateNoticeSchema = noticeDraftSchema.partial().strict();
export type UpdateNoticeInput = z.infer<typeof updateNoticeSchema>;

export const listNoticesQuerySchema = z.object({
	tab: z.enum(['sent', 'drafts']).default('sent'),
});
export type ListNoticesQuery = z.infer<typeof listNoticesQuerySchema>;

export const audiencePreviewSchema = z.object({ audience: noticeAudienceSchema }).strict();
export type AudiencePreviewInput = z.infer<typeof audiencePreviewSchema>;
