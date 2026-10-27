import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';

import { DatabaseService } from '@/database/database.service';
import {
	assessmentResults,
	assessments,
	type MembershipRecord,
	sectionSubjects,
	sections,
} from '@/database/schema';
import {
	gradeFromPercentage,
	gradePointFromPercentage,
} from '@/modules/assessments/assessments.types';
import { PermissionCodes } from '@/modules/authorization/permission-codes';
import { hasManagementRole } from '@/modules/memberships/membership-roles';
import { MembershipsService } from '@/modules/memberships/memberships.service';
import { StaffRepository } from '@/modules/staff/staff.repository';
import { StudentsRepository } from '@/modules/students/students.repository';
import type {
	AddGradebookEntryInput,
	GradebookGridQuery,
	StudentReportQuery,
} from './gradebook.dto';
import { GradebookRepository } from './gradebook.repository';

export type GradebookCell = {
	grade: string;
	gradePoint: number;
	obtainedMarks: number;
	totalMarks: number;
	percentage: number;
	source: string;
};

export type GradebookGridRow = {
	studentId: string;
	studentName: string;
	studentCode: string;
	cells: Record<string, GradebookCell>;
};

export type GradebookGrid = {
	sectionId: string;
	term: string;
	subjects: Array<{ id: string; code: string; name: string }>;
	rows: GradebookGridRow[];
	averages: Record<string, number | null>;
};

@Injectable()
export class GradebookService {
	constructor(
		private readonly database: DatabaseService,
		private readonly gradebook: GradebookRepository,
		private readonly staff: StaffRepository,
		private readonly students: StudentsRepository,
		private readonly membershipAccess: MembershipsService,
	) {}

	async getGradebookGrid(
		userId: string,
		tenantId: string,
		query: GradebookGridQuery,
	): Promise<GradebookGrid> {
		const membership = await this.requireRead(userId, tenantId);
		const roles = await this.membershipAccess.listRoleCodes(membership.id, membership.role);

		if (!hasManagementRole(roles)) {
			await this.requireSectionAccess(tenantId, membership, query.sectionId);
		}

		const [enrollments, subjectRows, entryRows] = await Promise.all([
			this.gradebook.listActiveEnrollmentsForSection(tenantId, query.sectionId),
			this.gradebook.listSectionSubjects(tenantId, query.sectionId),
			this.gradebook.listEntries(tenantId, {
				sectionId: query.sectionId,
				term: query.term,
				subjectId: query.subjectId,
			}),
		]);

		const subjects = subjectRows.map((row) => ({
			id: row.subject.id,
			code: row.subject.code,
			name: row.subject.name,
		}));

		const entryByStudentSubject = new Map<string, (typeof entryRows)[number]>();
		for (const row of entryRows) {
			entryByStudentSubject.set(`${row.entry.studentId}:${row.entry.subjectId}`, row);
		}

		const rows: GradebookGridRow[] = enrollments.map((enrollment) => {
			const cells: Record<string, GradebookCell> = {};
			for (const subject of subjects) {
				const entry = entryByStudentSubject.get(`${enrollment.student.id}:${subject.id}`);
				if (entry) {
					const obtained = Number(entry.entry.obtainedMarks);
					const total = Number(entry.entry.totalMarks);
					const percentage = total > 0 ? Math.round((obtained / total) * 10000) / 100 : 0;
					cells[subject.id] = {
						grade: entry.entry.grade,
						gradePoint: Number(entry.entry.gradePoint),
						obtainedMarks: obtained,
						totalMarks: total,
						percentage,
						source: entry.entry.source,
					};
				}
			}
			return {
				studentId: enrollment.student.id,
				studentName: `${enrollment.student.firstName} ${enrollment.student.lastName}`.trim(),
				studentCode: enrollment.student.studentCode,
				cells,
			};
		});

		const averages: Record<string, number | null> = {};
		for (const subject of subjects) {
			const percentages = rows
				.map((row) => row.cells[subject.id]?.percentage)
				.filter((value): value is number => value != null);
			averages[subject.id] =
				percentages.length > 0
					? Math.round(
							(percentages.reduce((sum, value) => sum + value, 0) / percentages.length) * 100,
						) / 100
					: null;
		}

		return {
			sectionId: query.sectionId,
			term: query.term,
			subjects,
			rows,
			averages,
		};
	}

	async addManualEntry(userId: string, tenantId: string, input: AddGradebookEntryInput) {
		const membership = await this.requireWrite(userId, tenantId);
		const roles = await this.membershipAccess.listRoleCodes(membership.id, membership.role);

		if (!hasManagementRole(roles)) {
			await this.requireSectionAccess(tenantId, membership, input.sectionId);
		}

		const percentage = input.totalMarks > 0 ? (input.obtainedMarks / input.totalMarks) * 100 : 0;

		const entry = await this.gradebook.upsertEntry({
			tenantId,
			studentId: input.studentId,
			sectionId: input.sectionId,
			academicYearId: input.academicYearId,
			term: input.term,
			subjectId: input.subjectId,
			totalMarks: String(input.totalMarks),
			obtainedMarks: String(input.obtainedMarks),
			grade: gradeFromPercentage(percentage),
			gradePoint: String(gradePointFromPercentage(percentage)),
			source: input.source ?? 'manual',
			sourceId: input.sourceId ?? null,
			createdByMembershipId: membership.id,
		});

		return { entry };
	}

	async getStudentReport(
		userId: string,
		tenantId: string,
		studentId: string,
		query: StudentReportQuery,
	) {
		await this.requireRead(userId, tenantId);

		const student = await this.students.findStudentById(tenantId, studentId);
		if (!student) {
			throw new NotFoundException({
				code: 'STUDENT_NOT_FOUND',
				message: 'Student not found',
			});
		}

		const entryRows = await this.gradebook.listEntriesForStudent(tenantId, studentId, query.term);

		const entries = entryRows.map((row) => {
			const obtained = Number(row.entry.obtainedMarks);
			const total = Number(row.entry.totalMarks);
			const percentage = total > 0 ? Math.round((obtained / total) * 10000) / 100 : 0;
			return {
				subjectId: row.subject.id,
				subjectCode: row.subject.code,
				subjectName: row.subject.name,
				sectionId: row.section.id,
				sectionName: row.section.name,
				academicYearId: row.academicYear.id,
				academicYearName: row.academicYear.name,
				term: row.entry.term,
				obtainedMarks: obtained,
				totalMarks: total,
				percentage,
				grade: row.entry.grade,
				gradePoint: Number(row.entry.gradePoint),
				source: row.entry.source,
			};
		});

		const gradePoints = entries.map((entry) => entry.gradePoint);
		const averageGradePoint =
			gradePoints.length > 0
				? Math.round(
						(gradePoints.reduce((sum, value) => sum + value, 0) / gradePoints.length) * 100,
					) / 100
				: null;

		return {
			student: {
				id: student.id,
				name: `${student.firstName} ${student.lastName}`.trim(),
				studentCode: student.studentCode,
			},
			entries,
			averageGradePoint,
		};
	}

	async syncFromAssessment(tenantId: string, assessmentId: string, markedByMembershipId: string) {
		const [assessmentRow] = await this.database.db
			.select({
				assessment: assessments,
				sectionSubject: sectionSubjects,
				section: sections,
			})
			.from(assessments)
			.innerJoin(sectionSubjects, eq(assessments.sectionSubjectId, sectionSubjects.id))
			.innerJoin(sections, eq(sectionSubjects.sectionId, sections.id))
			.where(and(eq(assessments.tenantId, tenantId), eq(assessments.id, assessmentId)))
			.limit(1);

		if (!assessmentRow) return { synced: 0 };

		const results = await this.database.db
			.select()
			.from(assessmentResults)
			.where(
				and(
					eq(assessmentResults.tenantId, tenantId),
					eq(assessmentResults.assessmentId, assessmentId),
					eq(assessmentResults.status, 'graded'),
				),
			);

		let synced = 0;
		for (const result of results) {
			if (result.score == null) continue;
			const totalMarks = Number(assessmentRow.assessment.maxScore);
			const obtained = Number(result.score);
			const percentage = totalMarks > 0 ? (obtained / totalMarks) * 100 : 0;

			// oxlint-disable-next-line no-await-in-loop -- entries are upserted in order so a failure stops cleanly
			await this.gradebook.upsertEntry({
				tenantId,
				studentId: result.studentId,
				sectionId: assessmentRow.section.id,
				academicYearId: assessmentRow.section.academicYearId,
				term: 'term1',
				subjectId: assessmentRow.sectionSubject.subjectId,
				totalMarks: String(totalMarks),
				obtainedMarks: String(obtained),
				grade: gradeFromPercentage(percentage),
				gradePoint: String(gradePointFromPercentage(percentage)),
				source: 'assessment',
				sourceId: assessmentId,
				createdByMembershipId: markedByMembershipId,
			});
			synced += 1;
		}

		return { synced };
	}

	private async requireSectionAccess(
		tenantId: string,
		membership: MembershipRecord,
		sectionId: string,
	) {
		const assignments = await this.staff.listSubjectAssignments(tenantId, membership.id);
		const hasAccess = assignments.some((row) => row.assignment.sectionId === sectionId);
		if (!hasAccess) {
			throw new ForbiddenException({
				code: 'GRADEBOOK_SECTION_ACCESS_DENIED',
				message: 'You do not have access to this section',
			});
		}
	}

	private async requireRead(userId: string, tenantId: string) {
		return this.membershipAccess.requirePermission(
			userId,
			tenantId,
			PermissionCodes.ASSESSMENTS_READ,
		);
	}

	private async requireWrite(userId: string, tenantId: string) {
		return this.membershipAccess.requirePermission(
			userId,
			tenantId,
			PermissionCodes.ASSESSMENTS_WRITE,
		);
	}
}
