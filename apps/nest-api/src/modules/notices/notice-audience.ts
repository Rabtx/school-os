import * as z from 'zod';

import type { NoticeAudience } from '@/database/schema';

export const noticeAudienceSchema: z.ZodType<NoticeAudience> = z.discriminatedUnion('kind', [
	z.object({ kind: z.literal('all_parents') }).strict(),
	z
		.object({
			kind: z.literal('sections'),
			sectionIds: z.array(z.string().uuid()).min(1, 'Pick at least one class').max(50),
		})
		.strict(),
	z.object({ kind: z.literal('staff') }).strict(),
	z.object({ kind: z.literal('everyone') }).strict(),
]);

export function audienceIncludesParents(audience: NoticeAudience): boolean {
	return audience.kind !== 'staff';
}

export function audienceIncludesStaff(audience: NoticeAudience): boolean {
	return audience.kind === 'staff' || audience.kind === 'everyone';
}

/** "All parents", "Parents of 7-A, 7-B", "Staff", "Everyone". */
export function audienceLabel(audience: NoticeAudience, sectionNames: string[] = []): string {
	switch (audience.kind) {
		case 'all_parents':
			return 'All parents';
		case 'staff':
			return 'Staff';
		case 'everyone':
			return 'Everyone';
		case 'sections':
			return sectionNames.length > 0
				? `Parents of ${sectionNames.join(', ')}`
				: `Parents of ${audience.sectionIds.length} ${audience.sectionIds.length === 1 ? 'class' : 'classes'}`;
	}
}
