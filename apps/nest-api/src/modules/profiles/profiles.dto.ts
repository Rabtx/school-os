import * as z from 'zod';

import { httpUrlSchema } from '@/common/validation/http-url.schema';

const optionalText = (maximum: number) => z.string().trim().max(maximum).nullable().optional();

export const updateProfileSchema = z
	.object({
		username: z
			.string()
			.trim()
			.toLowerCase()
			.min(3)
			.max(64)
			.regex(/^[a-z0-9._-]+$/)
			.optional(),
		displayName: optionalText(100),
		avatarUrl: httpUrlSchema.nullable().optional(),
		bio: optionalText(280),
		timezone: optionalText(64),
		locale: optionalText(16),
	})
	.strict()
	.refine((input) => Object.keys(input).length > 0, 'At least one profile field is required');

export class UpdateProfileDto {
	static schema = updateProfileSchema;
	username?: string;
	displayName?: string | null;
	avatarUrl?: string | null;
	bio?: string | null;
	timezone?: string | null;
	locale?: string | null;
}

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
