import {
	BadRequestException,
	ForbiddenException,
	Injectable,
	NotFoundException,
} from '@nestjs/common';

import type { MembershipRecord } from '@/database/schema';
import { PermissionCodes } from '@/modules/authorization/permission-codes';
import { GuardiansRepository } from '@/modules/guardians/guardians.repository';
import { hasManagementRole } from '@/modules/memberships/membership-roles';
import { MembershipsService } from '@/modules/memberships/memberships.service';
import { StaffRepository } from '@/modules/staff/staff.repository';
import { StudentsRepository } from '@/modules/students/students.repository';
import type { CreateHomeworkInput, ListHomeworkQuery, UpdateHomeworkInput } from './homework.dto';
import { HomeworkRepository } from './homework.repository';
import { type PublicHomeworkDetail, toPublicHomework } from './homework.types';

@Injectable()
export class HomeworkService {
	constructor(
		private readonly homework: HomeworkRepository,
		private readonly staff: StaffRepository,
		private readonly students: StudentsRepository,
		private readonly membershipAccess: MembershipsService,
		private readonly guardians: GuardiansRepository,
	) {}

	async list(userId: string, tenantId: string, filters: ListHomeworkQuery) {
		const membership = await this.requireRead(userId, tenantId);
		const roles = await this.membershipAccess.listRoleCodes(membership.id, membership.role);

		if (hasManagementRole(roles)) {
			const rows = await this.homework.list(tenantId, filters);
			return {
				assignments: await Promise.all(rows.map((row) => this.toPublicWithCount(tenantId, row))),
			};
		}

		if (roles.includes('parent') && !roles.includes('teacher')) {
			return this.listForLinkedStudents(tenantId, membership.id, filters);
		}

		if (roles.includes('student') && !roles.includes('teacher') && !hasManagementRole(roles)) {
			return this.listForLinkedStudents(tenantId, membership.id, filters);
		}

		const assignments = await this.staff.listSubjectAssignments(tenantId, membership.id);
		const sectionSubjectIds = assignments.map((row) => row.assignment.id);

		if (filters.sectionSubjectId) {
			await this.requireSectionSubjectAccess(tenantId, membership, roles, filters.sectionSubjectId);
		}

		const rows = await this.homework.listForSectionSubjects(tenantId, sectionSubjectIds, filters);
		return {
			assignments: await Promise.all(rows.map((row) => this.toPublicWithCount(tenantId, row))),
		};
	}

	async getById(userId: string, tenantId: string, homeworkId: string) {
		const membership = await this.requireRead(userId, tenantId);
		const roles = await this.membershipAccess.listRoleCodes(membership.id, membership.role);
		const row = await this.requireHomework(tenantId, homeworkId);

		if (roles.includes('parent') && !roles.includes('teacher') && !hasManagementRole(roles)) {
			const studentIds = await this.linkedStudentIds(tenantId, membership.id, undefined);
			const allowed = await this.homeworkAppliesToStudents(tenantId, row, studentIds);
			if (!allowed) {
				throw new ForbiddenException({
					code: 'HOMEWORK_ACCESS_DENIED',
					message: 'This assignment is not assigned to your linked students',
				});
			}
			return this.buildDetailResponse(tenantId, row, { omitRoster: true });
		}

		if (roles.includes('student') && !roles.includes('teacher') && !hasManagementRole(roles)) {
			const studentIds = await this.linkedStudentIds(tenantId, membership.id, undefined);
			const allowed = await this.homeworkAppliesToStudents(tenantId, row, studentIds);
			if (!allowed) {
				throw new ForbiddenException({
					code: 'HOMEWORK_ACCESS_DENIED',
					message: 'This assignment is not assigned to you',
				});
			}
			return this.buildDetailResponse(tenantId, row, { omitRoster: true });
		}

		await this.requireSectionSubjectAccess(
			tenantId,
			membership,
			roles,
			row.assignment.sectionSubjectId,
		);

		return this.buildDetailResponse(tenantId, row);
	}

	async create(userId: string, tenantId: string, input: CreateHomeworkInput) {
		const membership = await this.requireWrite(userId, tenantId);
		const roles = await this.membershipAccess.listRoleCodes(membership.id, membership.role);
		await this.requireSectionSubjectWriteAccess(
			tenantId,
			membership,
			roles,
			input.sectionSubjectId,
		);

		const sectionSubject = await this.staff.findSectionSubjectById(
			tenantId,
			input.sectionSubjectId,
		);
		if (!sectionSubject) {
			throw new NotFoundException({
				code: 'SECTION_SUBJECT_NOT_FOUND',
				message: 'Class subject assignment not found',
			});
		}

		const assignMode = input.assignMode ?? 'whole_class';
		const studentIds = assignMode === 'selected_students' ? (input.studentIds ?? []) : [];
		await this.validateRecipientStudents(tenantId, sectionSubject.section.id, studentIds);

		const created = await this.homework.create({
			tenantId,
			sectionSubjectId: input.sectionSubjectId,
			title: input.title,
			description: input.description ?? null,
			dueAt: input.dueAt ? new Date(input.dueAt) : null,
			status: input.status ?? 'draft',
			assignMode,
			estimatedMinutes: input.estimatedMinutes ?? null,
			materials: input.materials ?? null,
			createdByMembershipId: membership.id,
		});

		if (!created) {
			throw new NotFoundException({
				code: 'HOMEWORK_CREATE_FAILED',
				message: 'Could not create homework assignment',
			});
		}

		if (assignMode === 'selected_students') {
			await this.homework.syncRecipients(tenantId, created.id, studentIds);
		}

		const row = await this.homework.findById(tenantId, created.id);
		if (!row) {
			throw new NotFoundException({
				code: 'HOMEWORK_NOT_FOUND',
				message: 'Homework assignment not found after creation',
			});
		}

		return this.buildDetailResponse(tenantId, row);
	}

	async update(userId: string, tenantId: string, homeworkId: string, input: UpdateHomeworkInput) {
		const membership = await this.requireWrite(userId, tenantId);
		const roles = await this.membershipAccess.listRoleCodes(membership.id, membership.role);
		const existing = await this.requireHomework(tenantId, homeworkId);
		await this.requireSectionSubjectWriteAccess(
			tenantId,
			membership,
			roles,
			existing.assignment.sectionSubjectId,
		);

		const nextAssignMode = input.assignMode ?? existing.assignment.assignMode;
		if (nextAssignMode === 'selected_students') {
			const studentIds =
				input.studentIds ?? (await this.homework.listRecipientStudentIds(tenantId, homeworkId));
			await this.validateRecipientStudents(tenantId, existing.section.id, studentIds);
			await this.homework.syncRecipients(tenantId, homeworkId, studentIds);
		} else if (input.assignMode === 'whole_class') {
			await this.homework.syncRecipients(tenantId, homeworkId, []);
		}

		const updated = await this.homework.update(tenantId, homeworkId, {
			title: input.title,
			description: input.description,
			dueAt:
				input.dueAt === undefined ? undefined : input.dueAt === null ? null : new Date(input.dueAt),
			status: input.status,
			assignMode: input.assignMode,
			estimatedMinutes: input.estimatedMinutes,
			materials: input.materials,
		});

		if (!updated) {
			throw new NotFoundException({
				code: 'HOMEWORK_NOT_FOUND',
				message: 'Homework assignment not found',
			});
		}

		const row = await this.homework.findById(tenantId, homeworkId);
		if (!row) {
			throw new NotFoundException({
				code: 'HOMEWORK_NOT_FOUND',
				message: 'Homework assignment not found',
			});
		}

		return this.buildDetailResponse(tenantId, row);
	}

	private async listForLinkedStudents(
		tenantId: string,
		membershipId: string,
		filters: ListHomeworkQuery,
	) {
		const studentIds = await this.linkedStudentIds(tenantId, membershipId, filters.studentId);
		if (studentIds.length === 0) {
			return { assignments: [] };
		}

		const statusFilter = filters.status ?? undefined;
		const rows = await this.homework.list(tenantId, {
			sectionSubjectId: filters.sectionSubjectId,
			status: statusFilter,
		});

		const visible: typeof rows = [];
		for (const row of rows) {
			if (row.assignment.status === 'draft') continue;
			if (statusFilter && row.assignment.status !== statusFilter) continue;
			// oxlint-disable-next-line no-await-in-loop -- known N+1 (audit S-21); fixed with the permission work
			if (await this.homeworkAppliesToStudents(tenantId, row, studentIds)) {
				visible.push(row);
			}
		}

		return {
			assignments: await Promise.all(visible.map((row) => this.toPublicWithCount(tenantId, row))),
		};
	}

	private async linkedStudentIds(
		tenantId: string,
		membershipId: string,
		filterStudentId?: string,
	): Promise<string[]> {
		const student = await this.students.findStudentByMembershipId(tenantId, membershipId);
		if (student) {
			if (filterStudentId && filterStudentId !== student.id) {
				throw new ForbiddenException({
					code: 'HOMEWORK_STUDENT_ACCESS_DENIED',
					message: 'You are not linked to this student',
				});
			}
			return [student.id];
		}

		const linked = await this.guardians.listLinkedStudentsForMembership(tenantId, membershipId);
		let studentIds = linked.map((row) => row.student.id);
		if (filterStudentId) {
			if (!studentIds.includes(filterStudentId)) {
				throw new ForbiddenException({
					code: 'HOMEWORK_STUDENT_ACCESS_DENIED',
					message: 'You are not linked to this student',
				});
			}
			studentIds = [filterStudentId];
		}
		return studentIds;
	}

	private async homeworkAppliesToStudents(
		tenantId: string,
		row: {
			assignment: { id: string; assignMode: 'whole_class' | 'selected_students'; status: string };
			section: { id: string };
		},
		studentIds: string[],
	): Promise<boolean> {
		if (row.assignment.status === 'draft') return false;

		const allEnrollments = await this.students.listEnrollmentsForStudents(tenantId, studentIds);
		const sectionIds = new Set(
			allEnrollments
				.filter((enrollment) => enrollment.status === 'active')
				.map((enrollment) => enrollment.sectionId),
		);

		if (!sectionIds.has(row.section.id)) return false;

		if (row.assignment.assignMode === 'whole_class') return true;

		const recipients = await this.homework.listRecipientStudentIds(tenantId, row.assignment.id);
		return studentIds.some((studentId) => recipients.includes(studentId));
	}

	private async buildDetailResponse(
		tenantId: string,
		row: {
			assignment: Parameters<typeof toPublicHomework>[0];
			section: { id: string; name: string };
			subject: { id: string; code: string; name: string };
		},
		options?: { omitRoster?: boolean },
	): Promise<{ assignment: PublicHomeworkDetail }> {
		const recipientStudentIds = await this.homework.listRecipientStudentIds(
			tenantId,
			row.assignment.id,
		);
		const recipientSet = new Set(recipientStudentIds);
		const studentRows = await this.students.listStudentsInSections(tenantId, [row.section.id], {
			status: 'active',
		});

		const base = toPublicHomework(row.assignment, {
			sectionId: row.section.id,
			sectionName: row.section.name,
			subjectId: row.subject.id,
			subjectCode: row.subject.code,
			subjectName: row.subject.name,
			recipientCount:
				row.assignment.assignMode === 'selected_students'
					? recipientStudentIds.length
					: studentRows.length,
		});

		return {
			assignment: {
				...base,
				recipientStudentIds: options?.omitRoster ? [] : recipientStudentIds,
				rosterStudents: options?.omitRoster
					? []
					: studentRows.map((student) => ({
							studentId: student.id,
							studentName: `${student.firstName} ${student.lastName}`.trim(),
							studentCode: student.studentCode,
							isAssigned:
								row.assignment.assignMode === 'whole_class' || recipientSet.has(student.id),
						})),
			},
		};
	}

	private async toPublicWithCount(
		tenantId: string,
		row: {
			assignment: Parameters<typeof toPublicHomework>[0];
			section: { id: string; name: string };
			subject: { id: string; code: string; name: string };
		},
	) {
		let recipientCount = 0;
		if (row.assignment.assignMode === 'selected_students') {
			recipientCount = await this.homework.countRecipients(tenantId, row.assignment.id);
		} else {
			const studentRows = await this.students.listStudentsInSections(tenantId, [row.section.id], {
				status: 'active',
			});
			recipientCount = studentRows.length;
		}

		return toPublicHomework(row.assignment, {
			sectionId: row.section.id,
			sectionName: row.section.name,
			subjectId: row.subject.id,
			subjectCode: row.subject.code,
			subjectName: row.subject.name,
			recipientCount,
		});
	}

	private async validateRecipientStudents(
		tenantId: string,
		sectionId: string,
		studentIds: string[],
	) {
		if (studentIds.length === 0) return;

		const enrolled = await this.students.listEnrollments(tenantId, { sectionId });
		const activeStudentIds = new Set(
			enrolled.filter((row) => row.status === 'active').map((row) => row.studentId),
		);

		for (const studentId of studentIds) {
			if (!activeStudentIds.has(studentId)) {
				throw new BadRequestException({
					code: 'HOMEWORK_STUDENT_NOT_ENROLLED',
					message: `Student ${studentId} is not enrolled in this section`,
				});
			}
		}
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
