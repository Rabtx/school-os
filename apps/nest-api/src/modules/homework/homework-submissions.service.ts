import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';

import type { MembershipRecord } from '@/database/schema';
import { AccessScopeService } from '@/modules/access-scope/access-scope.service';
import { PermissionCodes } from '@/modules/authorization/permission-codes';
import { hasManagementRole } from '@/modules/memberships/membership-roles';
import { MembershipsService } from '@/modules/memberships/memberships.service';
import { StaffRepository } from '@/modules/staff/staff.repository';
import { StudentsRepository } from '@/modules/students/students.repository';
import { HomeworkRepository } from './homework.repository';
import type { SubmissionUpdateItem, SubmitHomeworkInput } from './homework-submissions.dto';
import {
	HomeworkSubmissionsRepository,
	type SubmissionUpsertRow,
} from './homework-submissions.repository';
import {
	type HomeworkSubmissionSummary,
	type PublicHomeworkSubmissionWithStudent,
	toPublicHomeworkSubmission,
} from './homework-submissions.types';

@Injectable()
export class HomeworkSubmissionsService {
	constructor(
		private readonly submissions: HomeworkSubmissionsRepository,
		private readonly homework: HomeworkRepository,
		private readonly students: StudentsRepository,
		private readonly staff: StaffRepository,
		private readonly membershipAccess: MembershipsService,
		private readonly accessScope: AccessScopeService,
	) {}

	async getSubmissions(userId: string, tenantId: string, homeworkId: string) {
		const membership = await this.requireRead(userId, tenantId);
		const roles = await this.membershipAccess.listRoleCodes(membership.id, membership.role);
		const row = await this.requireHomework(tenantId, homeworkId);
		await this.requireSectionSubjectAccess(
			tenantId,
			membership,
			roles,
			row.assignment.sectionSubjectId,
		);

		const rows = await this.submissions.listForHomework(tenantId, homeworkId);
		const submissions = rows.map(({ submission, student }) =>
			Object.assign(toPublicHomeworkSubmission(submission), {
				studentName: `${student.firstName} ${student.lastName}`.trim(),
				studentCode: student.studentCode,
			}),
		);

		return {
			submissions,
			summary: this.buildSummary(submissions),
		};
	}

	async bulkUpdateSubmissions(
		userId: string,
		tenantId: string,
		homeworkId: string,
		updates: SubmissionUpdateItem[],
	) {
		const membership = await this.requireWrite(userId, tenantId);
		const roles = await this.membershipAccess.listRoleCodes(membership.id, membership.role);
		const row = await this.requireHomework(tenantId, homeworkId);
		await this.requireSectionSubjectWriteAccess(
			tenantId,
			membership,
			roles,
			row.assignment.sectionSubjectId,
		);

		const now = new Date();
		const upsertRows: SubmissionUpsertRow[] = updates.map((update) =>
			this.buildUpsertRow(tenantId, homeworkId, update, membership.id, now),
		);

		await this.submissions.upsertSubmissions(upsertRows);

		return this.getSubmissionsInternal(tenantId, homeworkId);
	}

	async markSubmitted(
		userId: string,
		tenantId: string,
		homeworkId: string,
		studentId: string,
		input: SubmitHomeworkInput,
	) {
		const membership = await this.requireWrite(userId, tenantId);
		const roles = await this.membershipAccess.listRoleCodes(membership.id, membership.role);
		const row = await this.requireHomework(tenantId, homeworkId);
		await this.requireSectionSubjectWriteAccess(
			tenantId,
			membership,
			roles,
			row.assignment.sectionSubjectId,
		);

		const student = await this.students.findStudentById(tenantId, studentId);
		if (!student) {
			throw new NotFoundException({
				code: 'STUDENT_NOT_FOUND',
				message: 'Student not found',
			});
		}

		const now = new Date();
		const submittedAt = input.submittedAt ? new Date(input.submittedAt) : now;

		await this.submissions.upsertSubmissions([
			{
				tenantId,
				homeworkId,
				studentId,
				status: 'submitted',
				submittedAt,
				grade: null,
				marksObtained: null,
				totalMarks: null,
				feedback: null,
				attachmentUrl: input.attachmentUrl ?? null,
				gradedBy: null,
				gradedAt: null,
			},
		]);

		return this.getSubmissionsInternal(tenantId, homeworkId);
	}

	async getStudentHomeworkHistory(userId: string, tenantId: string, studentId: string) {
		const membership = await this.membershipAccess.requirePermission(
			userId,
			tenantId,
			PermissionCodes.STUDENTS_READ,
		);

		const student = await this.students.findStudentById(tenantId, studentId);
		if (!student) {
			throw new NotFoundException({
				code: 'STUDENT_NOT_FOUND',
				message: 'Student not found',
			});
		}
		await this.accessScope.requireStudentAccess(tenantId, membership, studentId);

		const rows = await this.submissions.listForStudent(tenantId, studentId);
		const history = rows.map(({ submission, assignment, section, subject }) =>
			Object.assign(toPublicHomeworkSubmission(submission), {
				homeworkTitle: assignment.title,
				sectionName: section.name,
				subjectName: subject.name,
				dueAt: assignment.dueAt?.toISOString() ?? null,
			}),
		);

		return {
			student: {
				id: student.id,
				name: `${student.firstName} ${student.lastName}`.trim(),
				studentCode: student.studentCode,
			},
			history,
		};
	}

	/**
	 * Creates a 'pending' submission row for each recipient student.
	 * Called when homework is published. Idempotent — existing rows are left untouched.
	 */
	async initializeSubmissions(tenantId: string, homeworkId: string) {
		const row = await this.homework.findById(tenantId, homeworkId);
		if (!row) return;

		const studentIds = await this.resolveRecipientStudentIds(tenantId, row);
		if (studentIds.length === 0) return;

		await this.submissions.initializePending(tenantId, homeworkId, studentIds);
	}

	/**
	 * Returns submission progress counts grouped by homework id.
	 * Used to enrich the homework list with progress indicators.
	 */
	async getProgressByHomework(tenantId: string, homeworkIds: string[]) {
		const rows = await this.submissions.countByHomework(tenantId, homeworkIds);
		const progressMap = new Map<
			string,
			{ total: number; submitted: number; graded: number; pending: number }
		>();

		for (const row of rows) {
			const entry =
				progressMap.get(row.homeworkId) ??
				({ total: 0, submitted: 0, graded: 0, pending: 0 } as {
					total: number;
					submitted: number;
					graded: number;
					pending: number;
				});
			entry.total += row.value;
			if (row.status === 'submitted' || row.status === 'late' || row.status === 'graded') {
				entry.submitted += row.value;
			}
			if (row.status === 'graded') {
				entry.graded += row.value;
			}
			if (row.status === 'pending') {
				entry.pending += row.value;
			}
			progressMap.set(row.homeworkId, entry);
		}

		return progressMap;
	}

	private async getSubmissionsInternal(tenantId: string, homeworkId: string) {
		const rows = await this.submissions.listForHomework(tenantId, homeworkId);
		const submissions = rows.map(({ submission, student }) =>
			Object.assign(toPublicHomeworkSubmission(submission), {
				studentName: `${student.firstName} ${student.lastName}`.trim(),
				studentCode: student.studentCode,
			}),
		);

		return {
			submissions,
			summary: this.buildSummary(submissions),
		};
	}

	private buildSummary(
		submissions: PublicHomeworkSubmissionWithStudent[],
	): HomeworkSubmissionSummary {
		const summary: HomeworkSubmissionSummary = {
			total: submissions.length,
			submitted: 0,
			late: 0,
			graded: 0,
			pending: 0,
			excused: 0,
		};

		for (const submission of submissions) {
			if (submission.status === 'submitted') summary.submitted += 1;
			else if (submission.status === 'late') summary.late += 1;
			else if (submission.status === 'graded') summary.graded += 1;
			else if (submission.status === 'pending') summary.pending += 1;
			else if (submission.status === 'excused') summary.excused += 1;
		}

		return summary;
	}

	private buildUpsertRow(
		tenantId: string,
		homeworkId: string,
		update: SubmissionUpdateItem,
		gradedByMembershipId: string,
		now: Date,
	): SubmissionUpsertRow {
		const isGraded = update.status === 'graded';
		const isSubmitted = update.status === 'submitted' || update.status === 'late';
		const isCleared = update.status === 'pending' || update.status === 'excused';

		return {
			tenantId,
			homeworkId,
			studentId: update.studentId,
			status: update.status,
			submittedAt: isSubmitted ? now : isCleared ? null : null,
			grade: isCleared ? null : (update.grade ?? null),
			marksObtained: isCleared ? null : (update.marksObtained ?? null),
			totalMarks: isCleared ? null : (update.totalMarks ?? null),
			feedback: isCleared ? null : (update.feedback ?? null),
			attachmentUrl: null,
			gradedBy: isGraded ? gradedByMembershipId : null,
			gradedAt: isGraded ? now : null,
		};
	}

	private async resolveRecipientStudentIds(
		tenantId: string,
		row: {
			assignment: { id: string; assignMode: 'whole_class' | 'selected_students' };
			section: { id: string };
		},
	): Promise<string[]> {
		if (row.assignment.assignMode === 'selected_students') {
			return this.homework.listRecipientStudentIds(tenantId, row.assignment.id);
		}

		const studentRows = await this.students.listStudentsInSections(tenantId, [row.section.id], {
			status: 'active',
		});
		return studentRows.map((student) => student.id);
	}

	private async requireHomework(tenantId: string, homeworkId: string) {
		const row = await this.homework.findById(tenantId, homeworkId);
		if (!row) {
			throw new NotFoundException({
				code: 'HOMEWORK_NOT_FOUND',
				message: 'Homework assignment not found',
			});
		}
		return row;
	}

	private async requireSectionSubjectAccess(
		tenantId: string,
		membership: MembershipRecord,
		roles: MembershipRecord['role'][],
		sectionSubjectId: string,
	) {
		if (hasManagementRole(roles)) return;
		const allowed = await this.staff.teacherCanAccessSectionSubject(
			tenantId,
			membership.id,
			sectionSubjectId,
		);
		if (!allowed) {
			throw new ForbiddenException({
				code: 'HOMEWORK_SECTION_ACCESS_DENIED',
				message: 'You do not have access to this class subject',
			});
		}
	}

	private async requireSectionSubjectWriteAccess(
		tenantId: string,
		membership: MembershipRecord,
		roles: MembershipRecord['role'][],
		sectionSubjectId: string,
	) {
		await this.requireSectionSubjectAccess(tenantId, membership, roles, sectionSubjectId);
	}

	private async requireRead(userId: string, tenantId: string) {
		return this.membershipAccess.requirePermission(userId, tenantId, PermissionCodes.HOMEWORK_READ);
	}

	private async requireWrite(userId: string, tenantId: string) {
		return this.membershipAccess.requirePermission(
			userId,
			tenantId,
			PermissionCodes.HOMEWORK_WRITE,
		);
	}
}
