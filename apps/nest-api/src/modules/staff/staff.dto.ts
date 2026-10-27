import * as z from 'zod';

const dateSchema = z
	.string()
	.trim()
	.regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD');

export const upsertStaffProfileSchema = z
	.object({
		employeeCode: z.string().trim().min(2).max(32).optional(),
		phone: z.string().trim().max(32).optional(),
		qualification: z.string().trim().max(255).optional(),
		specialization: z.string().trim().max(255).optional(),
		hireDate: dateSchema.optional(),
		status: z.enum(['active', 'inactive', 'on_leave']).optional(),
		notes: z.string().trim().max(2000).optional(),
	})
	.strict();

// oxlint-disable-next-line typescript/no-extraneous-class -- the static Zod schema is what the validation pipe reads
export class UpsertStaffProfileDto {
	static schema = upsertStaffProfileSchema;
}

export const createSubjectSchema = z
	.object({
		code: z.string().trim().min(2).max(32),
		name: z.string().trim().min(1).max(128),
		description: z.string().trim().max(255).optional(),
	})
	.strict();

export class CreateSubjectDto {
	static schema = createSubjectSchema;
	code!: string;
	name!: string;
	description?: string;
}

export const assignSectionSubjectSchema = z
	.object({
		sectionId: z.string().uuid(),
		subjectId: z.string().uuid(),
		teacherMembershipId: z.string().uuid(),
	})
	.strict();

export class AssignSectionSubjectDto {
	static schema = assignSectionSubjectSchema;
	sectionId!: string;
	subjectId!: string;
	teacherMembershipId!: string;
}

export type UpsertStaffProfileInput = z.infer<typeof upsertStaffProfileSchema>;
export type CreateSubjectInput = z.infer<typeof createSubjectSchema>;
export type AssignSectionSubjectInput = z.infer<typeof assignSectionSubjectSchema>;
