import * as z from 'zod';

const assessmentTypeSchema = z.enum(['quiz', 'test', 'exam']);
const assessmentStatusSchema = z.enum(['draft', 'published', 'closed']);
export const assessmentResultStatusSchema = z.enum(['pending', 'graded', 'absent']);
const assignModeSchema = z.enum(['whole_class', 'selected_students']);

const dateSchema = z
	.string()
	.trim()
	.regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD');

const plannerFieldsSchema = {
	startsAt: z.string().datetime().nullable().optional(),
	durationMinutes: z.number().int().positive().max(480).nullable().optional(),
	room: z.string().trim().max(120).nullable().optional(),
	instructions: z.string().trim().max(5000).nullable().optional(),
};

export const createAssessmentSchema = z
	.object({
		sectionSubjectId: z.string().uuid(),
		type: assessmentTypeSchema.optional(),
		title: z.string().trim().min(1).max(200),
		assessedOn: dateSchema,
		maxScore: z.number().positive().max(10000).optional(),
		status: assessmentStatusSchema.optional(),
		assignMode: assignModeSchema.optional(),
		studentIds: z.array(z.string().uuid()).max(200).optional(),
		...plannerFieldsSchema,
	})
	.strict()
	.refine(
		(value) =>
			value.assignMode !== 'selected_students' ||
			(value.studentIds !== undefined && value.studentIds.length > 0),
		{
			message: 'Select at least one student when targeting specific students',
			path: ['studentIds'],
		},
	);

export class CreateAssessmentDto {
	static schema = createAssessmentSchema;
	sectionSubjectId!: string;
	type?: z.infer<typeof assessmentTypeSchema>;
	title!: string;
	assessedOn!: string;
	maxScore?: number;
	status?: z.infer<typeof assessmentStatusSchema>;
	assignMode?: z.infer<typeof assignModeSchema>;
	studentIds?: string[];
	startsAt?: string | null;
	durationMinutes?: number | null;
	room?: string | null;
	instructions?: string | null;
}

export const updateAssessmentSchema = z
	.object({
		type: assessmentTypeSchema.optional(),
		title: z.string().trim().min(1).max(200).optional(),
		assessedOn: dateSchema.optional(),
		maxScore: z.number().positive().max(10000).optional(),
		status: assessmentStatusSchema.optional(),
		assignMode: assignModeSchema.optional(),
		studentIds: z.array(z.string().uuid()).max(200).optional(),
		...plannerFieldsSchema,
	})
	.strict()
	.refine(
		(value) =>
			value.assignMode !== 'selected_students' ||
			(value.studentIds !== undefined && value.studentIds.length > 0),
		{
			message: 'Select at least one student when targeting specific students',
			path: ['studentIds'],
		},
	);

export class UpdateAssessmentDto {
	static schema = updateAssessmentSchema;
	type?: z.infer<typeof assessmentTypeSchema>;
	title?: string;
	assessedOn?: string;
	maxScore?: number;
	status?: z.infer<typeof assessmentStatusSchema>;
	assignMode?: z.infer<typeof assignModeSchema>;
	studentIds?: string[];
	startsAt?: string | null;
	durationMinutes?: number | null;
	room?: string | null;
	instructions?: string | null;
}

export const upsertAssessmentResultsSchema = z
	.object({
		results: z
			.array(
				z
					.object({
						studentId: z.string().uuid(),
						score: z.number().min(0).nullable().optional(),
						status: assessmentResultStatusSchema,
					})
					.strict(),
			)
			.min(1)
			.max(200),
	})
	.strict();

export class UpsertAssessmentResultsDto {
	static schema = upsertAssessmentResultsSchema;
	results!: Array<{
		studentId: string;
		score?: number | null;
		status: z.infer<typeof assessmentResultStatusSchema>;
	}>;
}

export const listAssessmentsQuerySchema = z
	.object({
		sectionSubjectId: z.string().uuid().optional(),
		status: assessmentStatusSchema.optional(),
	})
	.strict();

export const plannerAssessmentsQuerySchema = z
	.object({
		from: dateSchema,
		to: dateSchema,
		sectionSubjectId: z.string().uuid().optional(),
	})
	.strict();

export type CreateAssessmentInput = z.infer<typeof createAssessmentSchema>;
export type UpdateAssessmentInput = z.infer<typeof updateAssessmentSchema>;
export type UpsertAssessmentResultsInput = z.infer<typeof upsertAssessmentResultsSchema>;
export type ListAssessmentsQuery = z.infer<typeof listAssessmentsQuerySchema>;
export type PlannerAssessmentsQuery = z.infer<typeof plannerAssessmentsQuerySchema>;
export type AssessmentResultStatus = z.infer<typeof assessmentResultStatusSchema>;
