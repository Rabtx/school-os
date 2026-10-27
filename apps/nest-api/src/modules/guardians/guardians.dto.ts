import * as z from 'zod';

const guardianBaseSchema = z.object({
	firstName: z.string().trim().min(1).max(100),
	lastName: z.string().trim().min(1).max(100),
	email: z.string().trim().email().optional(),
	phone: z.string().trim().max(32).optional(),
	alternatePhone: z.string().trim().max(32).optional(),
	addressLine1: z.string().trim().max(255).optional(),
	addressLine2: z.string().trim().max(255).optional(),
	city: z.string().trim().max(100).optional(),
	state: z.string().trim().max(100).optional(),
	postalCode: z.string().trim().max(20).optional(),
	country: z.string().trim().max(100).optional(),
	occupation: z.string().trim().max(128).optional(),
	preferredChannel: z.enum(['email', 'phone', 'whatsapp', 'sms']).optional(),
	membershipId: z.string().uuid().optional(),
});

export const createGuardianSchema = guardianBaseSchema.strict();

export class CreateGuardianDto {
	static schema = createGuardianSchema;
	firstName!: string;
	lastName!: string;
	email?: string;
	phone?: string;
	alternatePhone?: string;
	addressLine1?: string;
	addressLine2?: string;
	city?: string;
	state?: string;
	postalCode?: string;
	country?: string;
	occupation?: string;
	preferredChannel?: 'email' | 'phone' | 'whatsapp' | 'sms';
	membershipId?: string;
}

export const updateGuardianSchema = guardianBaseSchema
	.partial()
	.strict()
	.refine((value) => Object.keys(value).length > 0, { message: 'At least one field is required' });

// oxlint-disable-next-line typescript/no-extraneous-class -- the static Zod schema is what the validation pipe reads
export class UpdateGuardianDto {
	static schema = updateGuardianSchema;
}

export const linkStudentGuardianSchema = z
	.object({
		guardianId: z.string().uuid().optional(),
		guardian: createGuardianSchema.optional(),
		relationship: z.enum([
			'father',
			'mother',
			'guardian',
			'step_parent',
			'grandparent',
			'sibling',
			'other',
		]),
		isPrimary: z.boolean().optional(),
		canPickup: z.boolean().optional(),
		receivesNotifications: z.boolean().optional(),
	})
	.strict()
	.refine((value) => Boolean(value.guardianId || value.guardian), {
		message: 'Provide guardianId or guardian details',
	});

export type CreateGuardianInput = z.infer<typeof createGuardianSchema>;
export type UpdateGuardianInput = z.infer<typeof updateGuardianSchema>;
export type LinkStudentGuardianInput = z.infer<typeof linkStudentGuardianSchema>;

export class LinkStudentGuardianDto {
	static schema = linkStudentGuardianSchema;
	guardianId?: string;
	guardian?: CreateGuardianInput;
	relationship!: LinkStudentGuardianInput['relationship'];
	isPrimary?: boolean;
	canPickup?: boolean;
	receivesNotifications?: boolean;
}
