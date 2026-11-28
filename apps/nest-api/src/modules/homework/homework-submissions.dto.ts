import * as z from 'zod';

import { httpUrlSchema } from '@/common/validation/http-url.schema';

export const homeworkSubmissionStatusSchema = z.enum([
	'pending',
	'submitted',
	'late',
	'graded',
	'excused',
]);

export type HomeworkSubmissionStatus = z.infer<typeof homeworkSubmissionStatusSchema>;

const nullableNumber = z.number().min(0).max(100000).nullable();
const nullableGrade = z.string().trim().min(1).max(16).nullable();
const nullableFeedback = z.string().trim().max(5000).nullable();

export const homeworkSubmissionSchema = z
	.object({
		id: z.string().uuid(),
		tenantId: z.string().uuid(),
		homeworkId: z.string().uuid(),
		studentId: z.string().uuid(),
		status: homeworkSubmissionStatusSchema,
		submittedAt: z.string().nullable(),
		grade: z.string().nullable(),
		marksObtained: z.number().nullable(),
		totalMarks: z.number().nullable(),
		feedback: z.string().nullable(),
		attachmentUrl: z.string().nullable(),
		gradedBy: z.string().uuid().nullable(),
		gradedAt: z.string().nullable(),
		createdAt: z.string(),
		updatedAt: z.string(),
	})
	.strict();

export type HomeworkSubmissionResponse = z.infer<typeof homeworkSubmissionSchema>;

export const submissionUpdateItemSchema = z
	.object({
		studentId: z.string().uuid(),
		status: homeworkSubmissionStatusSchema,
		grade: nullableGrade.optional(),
		marksObtained: nullableNumber.optional(),
		totalMarks: nullableNumber.optional(),
		feedback: nullableFeedback.optional(),
	})
	.strict();

export const bulkUpdateSubmissionsSchema = z
	.object({
		submissions: z.array(submissionUpdateItemSchema).min(1).max(500),
	})
	.strict();

export class BulkUpdateSubmissionsDto {
	static schema = bulkUpdateSubmissionsSchema;
	submissions!: z.infer<typeof submissionUpdateItemSchema>[];
}

export const submitHomeworkSchema = z
	.object({
		submittedAt: z.string().datetime().optional(),
		// Rendered as a clickable "Open their work" link: http(s) only, never a
		// script-capable `javascript:`/`data:` URL (stored XSS).
		attachmentUrl: httpUrlSchema.optional(),
	})
	.strict();

export class SubmitHomeworkDto {
	static schema = submitHomeworkSchema;
	submittedAt?: string;
	attachmentUrl?: string;
}

export type SubmissionUpdateItem = z.infer<typeof submissionUpdateItemSchema>;
export type SubmitHomeworkInput = z.infer<typeof submitHomeworkSchema>;
