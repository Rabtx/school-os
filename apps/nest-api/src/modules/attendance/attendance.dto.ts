import * as z from 'zod';

const dateSchema = z
	.string()
	.trim()
	.regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD');

export const markStatusSchema = z.enum([
	'present',
	'absent',
	'late',
	'excused',
	'left_early',
	'unknown',
]);

export const createAttendanceSessionSchema = z
	.object({
		sectionId: z.string().uuid(),
		sessionDate: dateSchema,
		sessionType: z.enum(['class', 'gate', 'bus']).optional(),
	})
	.strict();

export class CreateAttendanceSessionDto {
	static schema = createAttendanceSessionSchema;
	sectionId!: string;
	sessionDate!: string;
	sessionType?: 'class' | 'gate' | 'bus';
}

export const markAttendanceSchema = z
	.object({
		marks: z
			.array(
				z
					.object({
						studentId: z.string().uuid(),
						status: markStatusSchema,
					})
					.strict(),
			)
			.min(1)
			.max(200),
	})
	.strict();

export class MarkAttendanceDto {
	static schema = markAttendanceSchema;
	marks!: Array<{ studentId: string; status: z.infer<typeof markStatusSchema> }>;
}

export const confirmAllPresentSchema = z
	.object({
		exceptStudentIds: z.array(z.string().uuid()).max(200).optional(),
	})
	.strict();

export class ConfirmAllPresentDto {
	static schema = confirmAllPresentSchema;
	exceptStudentIds?: string[];
}

export const studentHistoryQuerySchema = z.object({
	limit: z.coerce.number().int().min(1).max(200).default(50).optional(),
});

export const sessionDateQuerySchema = z
	.object({
		sessionDate: z
			.string()
			.trim()
			.regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD')
			.optional(),
	})
	.strict();

export const attendanceReportQuerySchema = z
	.object({
		period: z.enum(['week', 'month', 'year']).default('month'),
		date: z
			.string()
			.trim()
			.regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD')
			.optional(),
	})
	.strict();

export const findSessionQuerySchema = z
	.object({
		sectionId: z.string().uuid(),
		sessionDate: z
			.string()
			.trim()
			.regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
	})
	.strict();

export type CreateAttendanceSessionInput = z.infer<typeof createAttendanceSessionSchema>;
export type MarkAttendanceInput = z.infer<typeof markAttendanceSchema>;
export type ConfirmAllPresentInput = z.infer<typeof confirmAllPresentSchema>;
export type StudentHistoryQuery = z.infer<typeof studentHistoryQuerySchema>;
export type SessionDateQuery = z.infer<typeof sessionDateQuerySchema>;
export type AttendanceReportQuery = z.infer<typeof attendanceReportQuerySchema>;
export type FindSessionQuery = z.infer<typeof findSessionQuerySchema>;
export type AttendanceMarkStatus = z.infer<typeof markStatusSchema>;
