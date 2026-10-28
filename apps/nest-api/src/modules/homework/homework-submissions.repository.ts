import { Injectable } from '@nestjs/common';
import { and, asc, count, desc, eq, inArray, isNull, sql } from 'drizzle-orm';

import { DatabaseService } from '@/database/database.service';
import {
	type HomeworkSubmissionRecord,
	homeworkAssignments,
	homeworkSubmissions,
	sectionSubjects,
	sections,
	students,
	subjects,
} from '@/database/schema';

export type SubmissionUpsertRow = {
	tenantId: string;
	homeworkId: string;
	studentId: string;
	status: HomeworkSubmissionRecord['status'];
	submittedAt: Date | null;
	grade: string | null;
	marksObtained: number | null;
	totalMarks: number | null;
	feedback: string | null;
	attachmentUrl: string | null;
	gradedBy: string | null;
	gradedAt: Date | null;
};

@Injectable()
export class HomeworkSubmissionsRepository {
	constructor(private readonly database: DatabaseService) {}

	async listForHomework(tenantId: string, homeworkId: string) {
		return this.database.db
			.select({ submission: homeworkSubmissions, student: students })
			.from(homeworkSubmissions)
			.innerJoin(students, eq(homeworkSubmissions.studentId, students.id))
			.where(
				and(
					eq(homeworkSubmissions.tenantId, tenantId),
					eq(homeworkSubmissions.homeworkId, homeworkId),
					isNull(students.deletedAt),
				),
			)
			.orderBy(asc(students.lastName), asc(students.firstName));
	}

	async listForStudent(tenantId: string, studentId: string) {
		return this.database.db
			.select({
				submission: homeworkSubmissions,
				assignment: homeworkAssignments,
				section: sections,
				subject: subjects,
			})
			.from(homeworkSubmissions)
			.innerJoin(homeworkAssignments, eq(homeworkSubmissions.homeworkId, homeworkAssignments.id))
			.innerJoin(sectionSubjects, eq(homeworkAssignments.sectionSubjectId, sectionSubjects.id))
			.innerJoin(sections, eq(sectionSubjects.sectionId, sections.id))
			.innerJoin(subjects, eq(sectionSubjects.subjectId, subjects.id))
			.where(
				and(
					eq(homeworkSubmissions.tenantId, tenantId),
					eq(homeworkSubmissions.studentId, studentId),
					isNull(sections.deletedAt),
					isNull(subjects.deletedAt),
				),
			)
			.orderBy(desc(homeworkAssignments.dueAt), desc(homeworkSubmissions.createdAt));
	}

	async findForStudents(tenantId: string, homeworkId: string, studentIds: string[]) {
		if (studentIds.length === 0) return [];
		return this.database.db
			.select()
			.from(homeworkSubmissions)
			.where(
				and(
					eq(homeworkSubmissions.tenantId, tenantId),
					eq(homeworkSubmissions.homeworkId, homeworkId),
					inArray(homeworkSubmissions.studentId, studentIds),
				),
			);
	}

	async upsertSubmissions(rows: SubmissionUpsertRow[]) {
		if (rows.length === 0) return;
		const now = new Date();
		await this.database.db
			.insert(homeworkSubmissions)
			.values(
				rows.map((row) => ({
					tenantId: row.tenantId,
					homeworkId: row.homeworkId,
					studentId: row.studentId,
					status: row.status,
					submittedAt: row.submittedAt,
					grade: row.grade,
					marksObtained: row.marksObtained === null ? null : String(row.marksObtained),
					totalMarks: row.totalMarks === null ? null : String(row.totalMarks),
					feedback: row.feedback,
					attachmentUrl: row.attachmentUrl,
					gradedBy: row.gradedBy,
					gradedAt: row.gradedAt,
				})),
			)
			.onConflictDoUpdate({
				target: [homeworkSubmissions.homeworkId, homeworkSubmissions.studentId],
				set: {
					status: sql`excluded.status`,
					// Keep the original hand-in time; only "not handed in" and "excused" clear it.
					submittedAt: sql`case when excluded.status in ('pending', 'excused') then null else coalesce("homework_submissions"."submitted_at", excluded.submitted_at) end`,
					grade: sql`excluded.grade`,
					marksObtained: sql`excluded.marks_obtained`,
					totalMarks: sql`excluded.total_marks`,
					feedback: sql`excluded.feedback`,
					// Teacher updates carry no attachment; never wipe the student's file.
					attachmentUrl: sql`coalesce(excluded.attachment_url, "homework_submissions"."attachment_url")`,
					gradedBy: sql`excluded.graded_by`,
					gradedAt: sql`excluded.graded_at`,
					updatedAt: now,
				},
			});
	}

	async initializePending(tenantId: string, homeworkId: string, studentIds: string[]) {
		if (studentIds.length === 0) return;
		await this.database.db
			.insert(homeworkSubmissions)
			.values(
				studentIds.map((studentId) => ({
					tenantId,
					homeworkId,
					studentId,
					status: 'pending' as const,
				})),
			)
			.onConflictDoNothing({
				target: [homeworkSubmissions.homeworkId, homeworkSubmissions.studentId],
			});
	}

	async countByHomework(tenantId: string, homeworkIds: string[]) {
		if (homeworkIds.length === 0) return [];
		return this.database.db
			.select({
				homeworkId: homeworkSubmissions.homeworkId,
				status: homeworkSubmissions.status,
				value: count(),
			})
			.from(homeworkSubmissions)
			.where(
				and(
					eq(homeworkSubmissions.tenantId, tenantId),
					inArray(homeworkSubmissions.homeworkId, homeworkIds),
				),
			)
			.groupBy(homeworkSubmissions.homeworkId, homeworkSubmissions.status);
	}
}
