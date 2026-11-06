import * as z from 'zod';

import { httpUrlSchema } from '@/common/validation/http-url.schema';

const timeSchema = z
	.string()
	.trim()
	.regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Time must be HH:MM (24-hour)');

const hexColorSchema = z
	.string()
	.trim()
	.regex(/^#[0-9A-Fa-f]{6}$/, 'Color must be a hex value like #1A2B3C');

export const updateOrganizationConfigSchema = z
	.object({
		settings: z
			.object({
				academicYearStartMonth: z.number().int().min(1).max(12).optional(),
				attendanceGraceMinutes: z.number().int().min(0).max(120).optional(),
				quietHoursStart: timeSchema.optional(),
				quietHoursEnd: timeSchema.optional(),
			})
			.strict()
			.optional(),
		branding: z
			.object({
				displayNameEn: z.string().trim().min(1).max(200).nullable().optional(),
				displayNameUr: z.string().trim().max(200).nullable().optional(),
				logoUrl: httpUrlSchema.nullable().optional(),
				primaryColor: hexColorSchema.nullable().optional(),
				accentColor: hexColorSchema.nullable().optional(),
			})
			.strict()
			.optional(),
		communicationPolicy: z
			.object({
				whatsappEnabled: z.boolean().optional(),
				smsFallbackEnabled: z.boolean().optional(),
				emailFallbackEnabled: z.boolean().optional(),
				notifyAllGuardians: z.boolean().optional(),
				sickReportRequiresNote: z.boolean().optional(),
			})
			.strict()
			.optional(),
	})
	.strict()
	.refine(
		(value) =>
			value.settings !== undefined ||
			value.branding !== undefined ||
			value.communicationPolicy !== undefined,
		{ message: 'At least one config section is required' },
	);

export class UpdateOrganizationConfigDto {
	static schema = updateOrganizationConfigSchema;
	settings?: z.infer<typeof updateOrganizationConfigSchema>['settings'];
	branding?: z.infer<typeof updateOrganizationConfigSchema>['branding'];
	communicationPolicy?: z.infer<typeof updateOrganizationConfigSchema>['communicationPolicy'];
}

export type UpdateOrganizationConfigInput = z.infer<typeof updateOrganizationConfigSchema>;
