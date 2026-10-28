import * as z from 'zod';

const gradebookTermSchema = z.enum(['term1', 'term2', 'term3', 'final']);
const gradebookSourceSchema = z.enum(['assessment', 'homework', 'manual']);

export const gradebookGridQuerySchema = z
	.object({
		sectionId: z.string().uuid(),
		term: gradebookTermSchema,
		subjectId: z.string().uuid().optional(),
	})
	.strict();

export const marksheetQuerySchema = z
	.object({
		sectionId: z.string().uuid(),
		subjectId: z.string().uuid(),
	})
	.strict();

export type MarksheetQuery = z.infer<typeof marksheetQuerySchema>;

export const addGradebookEntrySchema = z
	.object({
		studentId: z.string().uuid(),
		sectionId: z.string().uuid(),
		academicYearId: z.string().uuid(),
		term: gradebookTermSchema,
		subjectId: z.string().uuid(),
		totalMarks: z.number().positive().max(10000),
		obtainedMarks: z.number().min(0).max(10000),
		source: gradebookSourceSchema.optional(),
		sourceId: z.string().uuid().nullable().optional(),
	})
	.strict()
	.refine((value) => value.obtainedMarks <= value.totalMarks, {
		message: 'Obtained marks cannot exceed total marks',
		path: ['obtainedMarks'],
	});

export const studentReportQuerySchema = z
	.object({
		term: gradebookTermSchema.optional(),
	})
	.strict();

export class GradebookGridQueryDto {
	static schema = gradebookGridQuerySchema;
	sectionId!: string;
	term!: z.infer<typeof gradebookTermSchema>;
	subjectId?: string;
}

export class AddGradebookEntryDto {
	static schema = addGradebookEntrySchema;
	studentId!: string;
	sectionId!: string;
	academicYearId!: string;
	term!: z.infer<typeof gradebookTermSchema>;
	subjectId!: string;
	totalMarks!: number;
	obtainedMarks!: number;
	source?: z.infer<typeof gradebookSourceSchema>;
	sourceId?: string | null;
}

export class StudentReportQueryDto {
	static schema = studentReportQuerySchema;
	term?: z.infer<typeof gradebookTermSchema>;
}

export type GradebookGridQuery = z.infer<typeof gradebookGridQuerySchema>;
export type AddGradebookEntryInput = z.infer<typeof addGradebookEntrySchema>;
export type StudentReportQuery = z.infer<typeof studentReportQuerySchema>;
