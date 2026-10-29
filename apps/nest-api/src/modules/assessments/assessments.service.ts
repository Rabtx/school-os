import {
	BadRequestException,
	ForbiddenException,
	Injectable,
	NotFoundException,
} from '@nestjs/common';

import type { MembershipRecord } from '@/database/schema';
import { AccessScopeService } from '@/modules/access-scope/access-scope.service';
import { PermissionCodes } from '@/modules/authorization/permission-codes';
import { hasManagementRole } from '@/modules/memberships/membership-roles';
import { MembershipsService } from '@/modules/memberships/memberships.service';
import { StaffRepository } from '@/modules/staff/staff.repository';
import { StudentsRepository } from '@/modules/students/students.repository';
import type {
	AssessmentResultStatus as ResultStatus,
	CreateAssessmentInput,
	ListAssessmentsQuery,
	PlannerAssessmentsQuery,
	UpdateAssessmentInput,
	UpsertAssessmentResultsInput,
} from './assessments.dto';
import { AssessmentsRepository } from './assessments.repository';
import {
	computeAssessmentSummary,
	type PublicAssessmentDetail,
	type PublicAssessmentResult,
	type PublicAssessmentListItem,
	toPublicAssessment,
} from './assessments.types';

@Injectable()
export class AssessmentsService {
	constructor(
		private readonly assessments: AssessmentsRepository,
		private readonly staff: StaffRepository,
		private readonly students: StudentsRepository,
		private readonly membershipAccess: MembershipsService,
		private readonly accessScope: AccessScopeService,
	) {}

	async list(userId: string, tenantId: string, filters: ListAssessmentsQuery) {
		const membership = await this.requireRead(userId, tenantId);
		const roles = await this.membershipAccess.listRoleCodes(membership.id, membership.role);

		if (hasManagementRole(roles)) {
			const rows = await this.assessments.list(tenantId, filters);
			return { assessments: await this.toListItems(tenantId, rows) };
		}

		const assignments = await this.staff.listSubjectAssignments(tenantId, membership.id);
		const sectionSubjectIds = assignments.map((row) => row.assignment.id);

		if (filters.sectionSubjectId) {
			await this.requireSectionSubjectAccess(tenantId, membership, roles, filters.sectionSubjectId);
		}

		const rows = await this.assessments.listForSectionSubjects(
			tenantId,
			sectionSubjectIds,
			filters,
		);
		return { assessments: await this.toListItems(tenantId, rows) };
	}

	private async toListItems(
		tenantId: string,
		rows: Parameters<AssessmentsService['toPublicWithCount']>[1][],
	): Promise<PublicAssessmentListItem[]> {
		const [items, summaries] = await Promise.all([
			Promise.all(rows.map((row) => this.toPublicWithCount(tenantId, row))),
			this.assessments.summarizeResults(
				tenantId,
				rows.map((row) => row.assessment.id),
			),
		]);
		const summaryById = new Map(summaries.map((row) => [row.assessmentId, row]));
		return items.map((item) => {
			const summary = summaryById.get(item.id);
			const average = summary?.averageScore == null ? null : Number(summary.averageScore);
			return Object.assign(item, {
				results: {
					graded: summary?.graded ?? 0,
					absent: summary?.absent ?? 0,
					averagePercentage:
						average === null || item.maxScore <= 0
							? null
							: Math.round((average / item.maxScore) * 1000) / 10,
				},
			});
		});
	}

	async planner(userId: string, tenantId: string, filters: PlannerAssessmentsQuery) {
		const membership = await this.requireRead(userId, tenantId);
		const roles = await this.membershipAccess.listRoleCodes(membership.id, membership.role);

		if (hasManagementRole(roles)) {
			const rows = await this.assessments.listForPlanner(tenantId, filters);
			return {
				assessments: await Promise.all(rows.map((row) => this.toPublicWithCount(tenantId, row))),
			};
		}

		const assignments = await this.staff.listSubjectAssignments(tenantId, membership.id);
		const sectionSubjectIds = assignments.map((row) => row.assignment.id);
		const rows = await this.assessments.listForPlanner(tenantId, filters, sectionSubjectIds);
		return {
			assessments: await Promise.all(rows.map((row) => this.toPublicWithCount(tenantId, row))),
		};
	}

	async getById(userId: string, tenantId: string, assessmentId: string) {
		const membership = await this.requireRead(userId, tenantId);
		const roles = await this.membershipAccess.listRoleCodes(membership.id, membership.role);
		const row = await this.requireAssessment(tenantId, assessmentId);
		await this.requireSectionSubjectAccess(
			tenantId,
			membership,
			roles,
			row.assessment.sectionSubjectId,
		);

		return this.buildDetailResponse(tenantId, row);
	}

	async create(userId: string, tenantId: string, input: CreateAssessmentInput) {
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

		const created = await this.assessments.create({
			tenantId,
			sectionSubjectId: input.sectionSubjectId,
			type: input.type ?? 'test',
			title: input.title,
			assessedOn: input.assessedOn,
			maxScore: String(input.maxScore ?? 100),
			status: input.status ?? 'draft',
			assignMode,
			startsAt: input.startsAt ? new Date(input.startsAt) : null,
			durationMinutes: input.durationMinutes ?? null,
			room: input.room ?? null,
			instructions: input.instructions ?? null,
			createdByMembershipId: membership.id,
		});

		if (!created) {
			throw new NotFoundException({
				code: 'ASSESSMENT_CREATE_FAILED',
				message: 'Could not create assessment',
			});
		}

		if (assignMode === 'selected_students') {
			await this.assessments.syncRecipients(tenantId, created.id, studentIds);
		}

		const row = await this.assessments.findById(tenantId, created.id);
		if (!row) {
			throw new NotFoundException({
				code: 'ASSESSMENT_NOT_FOUND',
				message: 'Assessment not found after creation',
			});
		}

		return this.buildDetailResponse(tenantId, row);
	}

	async update(
		userId: string,
		tenantId: string,
		assessmentId: string,
		input: UpdateAssessmentInput,
	) {
		const membership = await this.requireWrite(userId, tenantId);
		const roles = await this.membershipAccess.listRoleCodes(membership.id, membership.role);
		const existing = await this.requireAssessment(tenantId, assessmentId);
		await this.requireSectionSubjectWriteAccess(
			tenantId,
			membership,
			roles,
			existing.assessment.sectionSubjectId,
		);

		const nextAssignMode = input.assignMode ?? existing.assessment.assignMode;
		if (nextAssignMode === 'selected_students') {
			const studentIds =
				input.studentIds ??
				(await this.assessments.listRecipientStudentIds(tenantId, assessmentId));
			await this.validateRecipientStudents(tenantId, existing.section.id, studentIds);
			await this.assessments.syncRecipients(tenantId, assessmentId, studentIds);
		} else if (input.assignMode === 'whole_class') {
			await this.assessments.syncRecipients(tenantId, assessmentId, []);
		}

		const updated = await this.assessments.update(tenantId, assessmentId, {
			type: input.type,
			title: input.title,
			assessedOn: input.assessedOn,
			maxScore: input.maxScore === undefined ? undefined : String(input.maxScore),
			status: input.status,
			assignMode: input.assignMode,
			startsAt:
				input.startsAt === undefined
					? undefined
					: input.startsAt === null
						? null
						: new Date(input.startsAt),
			durationMinutes: input.durationMinutes,
			room: input.room,
			instructions: input.instructions,
		});

		if (!updated) {
			throw new NotFoundException({
				code: 'ASSESSMENT_NOT_FOUND',
				message: 'Assessment not found',
			});
		}

		const row = await this.assessments.findById(tenantId, assessmentId);
		if (!row) {
			throw new NotFoundException({
				code: 'ASSESSMENT_NOT_FOUND',
				message: 'Assessment not found',
			});
		}

		return this.buildDetailResponse(tenantId, row);
	}

	async upsertResults(
		userId: string,
		tenantId: string,
		assessmentId: string,
		input: UpsertAssessmentResultsInput,
	) {
		const membership = await this.requireWrite(userId, tenantId);
		const roles = await this.membershipAccess.listRoleCodes(membership.id, membership.role);
		const existing = await this.requireAssessment(tenantId, assessmentId);
		await this.requireSectionSubjectWriteAccess(
			tenantId,
			membership,
			roles,
			existing.assessment.sectionSubjectId,
		);
		// A closed test's marks feed report cards; after closing, teachers ask leadership instead.
		if (existing.assessment.status === 'closed' && !hasManagementRole(roles)) {
			throw new ForbiddenException({
				code: 'ASSESSMENT_CLOSED',
				message: 'This test is closed. Ask the principal to change a mark.',
			});
		}

		const maxScore = Number(existing.assessment.maxScore);
		const sectionId = existing.section.id;

		const enrolled = await this.students.listEnrollments(tenantId, { sectionId });
		const activeStudentIds = new Set(
			enrolled.filter((row) => row.status === 'active').map((row) => row.studentId),
		);
		const assignedStudentIds =
			existing.assessment.assignMode === 'selected_students'
				? new Set(await this.assessments.listRecipientStudentIds(tenantId, assessmentId))
				: activeStudentIds;

		for (const result of input.results) {
			if (!activeStudentIds.has(result.studentId)) {
				throw new BadRequestException({
					code: 'ASSESSMENT_STUDENT_NOT_ENROLLED',
					message: `Student ${result.studentId} is not enrolled in this section`,
				});
			}
			if (!assignedStudentIds.has(result.studentId)) {
				throw new BadRequestException({
					code: 'ASSESSMENT_STUDENT_NOT_ASSIGNED',
					message: `Student ${result.studentId} is not assigned to this assessment`,
				});
			}

			if (result.status === 'graded' && result.score != null && result.score > maxScore) {
				throw new BadRequestException({
					code: 'ASSESSMENT_SCORE_EXCEEDS_MAX',
					message: `Score cannot exceed max score of ${maxScore}`,
				});
			}
		}

		await this.assessments.upsertResults({
			tenantId,
			assessmentId,
			results: input.results.map((result) => ({
				studentId: result.studentId,
				score: result.status === 'graded' && result.score != null ? String(result.score) : null,
				status: result.status,
			})),
		});

		const row = await this.assessments.findById(tenantId, assessmentId);
		if (!row) {
			throw new NotFoundException({
				code: 'ASSESSMENT_NOT_FOUND',
				message: 'Assessment not found',
			});
		}

		return this.buildDetailResponse(tenantId, row);
	}

	async getStudentGrades(userId: string, tenantId: string, studentId: string) {
		const membership = await this.requireRead(userId, tenantId);
		await this.accessScope.requireStudentAccess(tenantId, membership, studentId);
		const rows = await this.assessments.listResultsForStudent(tenantId, studentId);

		return {
			grades: rows.map((row) => ({
				assessmentId: row.assessment.id,
				assessmentTitle: row.assessment.title,
				assessmentType: row.assessment.type,
				assessedOn: row.assessment.assessedOn,
				maxScore: Number(row.assessment.maxScore),
				sectionName: row.section.name,
				subjectName: row.subject.name,
				subjectCode: row.subject.code,
				score: row.result.score != null ? Number(row.result.score) : null,
				status: row.result.status,
			})),
		};
	}

	private async buildDetailResponse(
		tenantId: string,
		row: {
			assessment: Parameters<typeof toPublicAssessment>[0];
			section: { id: string; name: string };
			subject: { id: string; code: string; name: string };
			sectionSubject: { sectionId: string };
		},
	): Promise<{ assessment: PublicAssessmentDetail }> {
		const recipientStudentIds = await this.assessments.listRecipientStudentIds(
			tenantId,
			row.assessment.id,
		);
		const recipientSet = new Set(recipientStudentIds);
		const base = toPublicAssessment(row.assessment, {
			sectionId: row.section.id,
			sectionName: row.section.name,
			subjectId: row.subject.id,
			subjectCode: row.subject.code,
			subjectName: row.subject.name,
			recipientCount: 0,
		});

		const studentRows = await this.students.listStudentsInSections(tenantId, [row.section.id], {
			status: 'active',
		});
		const rosterStudents =
			row.assessment.assignMode === 'selected_students'
				? studentRows.filter((student) => recipientSet.has(student.id))
				: studentRows;

		base.recipientCount =
			row.assessment.assignMode === 'selected_students'
				? recipientStudentIds.length
				: studentRows.length;

		const savedResults = await this.assessments.listResults(tenantId, row.assessment.id);
		const resultByStudentId = new Map(savedResults.map((entry) => [entry.student.id, entry]));

		const results: PublicAssessmentResult[] = rosterStudents.map((student) => {
			const saved = resultByStudentId.get(student.id);
			return {
				id: saved?.result.id ?? null,
				studentId: student.id,
				studentName: `${student.firstName} ${student.lastName}`.trim(),
				studentCode: student.studentCode,
				score: saved?.result.score != null ? Number(saved.result.score) : null,
				status: saved?.result.status ?? 'pending',
			};
		});

		return {
			assessment: {
				...base,
				recipientStudentIds,
				results,
				summary: computeAssessmentSummary(results, base.maxScore),
			},
		};
	}

	private async toPublicWithCount(
		tenantId: string,
		row: {
			assessment: Parameters<typeof toPublicAssessment>[0];
			section: { id: string; name: string };
			subject: { id: string; code: string; name: string };
		},
	) {
		let recipientCount = 0;
		if (row.assessment.assignMode === 'selected_students') {
			recipientCount = await this.assessments.countRecipients(tenantId, row.assessment.id);
		} else {
			const studentRows = await this.students.listStudentsInSections(tenantId, [row.section.id], {
				status: 'active',
			});
			recipientCount = studentRows.length;
		}

		return toPublicAssessment(row.assessment, {
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
					code: 'ASSESSMENT_STUDENT_NOT_ENROLLED',
					message: `Student ${studentId} is not enrolled in this section`,
				});
			}
		}
	}

	/**
	 * Checks a teacher may ask leadership to change one mark on a test, and returns what the
	 * approval card shows. Used by the approvals engine.
	 */
	async prepareMarkChange(
		userId: string,
		tenantId: string,
		input: { assessmentId: string; studentId: string; status: ResultStatus; score: number | null },
	) {
		const membership = await this.requireWrite(userId, tenantId);
		const roles = await this.membershipAccess.listRoleCodes(membership.id, membership.role);
		const existing = await this.requireAssessment(tenantId, input.assessmentId);
		await this.requireSectionSubjectWriteAccess(
			tenantId,
			membership,
			roles,
			existing.assessment.sectionSubjectId,
		);
		const maxScore = Number(existing.assessment.maxScore);
		if (input.status === 'graded' && (input.score === null || input.score > maxScore)) {
			throw new BadRequestException({
				code: 'ASSESSMENT_SCORE_EXCEEDS_MAX',
				message: `Give a mark between 0 and ${maxScore}`,
			});
		}
		const results = await this.assessments.listResults(tenantId, input.assessmentId);
		const current = results.find((row) => row.result.studentId === input.studentId);
		if (!current) {
			throw new BadRequestException({
				code: 'ASSESSMENT_STUDENT_NOT_ASSIGNED',
				message: 'Student is not assigned to this assessment',
			});
		}
		return {
			assessmentTitle: existing.assessment.title,
			sectionName: existing.section.name,
			subjectName: existing.subject.name,
			maxScore,
			studentName: `${current.student.firstName} ${current.student.lastName}`.trim(),
			previous: {
				status: current.result.status,
				score: current.result.score === null ? null : Number(current.result.score),
			},
			canEditNow: existing.assessment.status !== 'closed' || hasManagementRole(roles),
		};
	}

	/** Sets one mark for the leader who approved it, on a closed test. Returns the mark replaced. */
	async applyMarkChange(input: {
		tenantId: string;
		assessmentId: string;
		studentId: string;
		status: ResultStatus;
		score: number | null;
	}): Promise<{ status: ResultStatus; score: number | null }> {
		const results = await this.assessments.listResults(input.tenantId, input.assessmentId);
		const current = results.find((row) => row.result.studentId === input.studentId);
		await this.assessments.upsertResults({
			tenantId: input.tenantId,
			assessmentId: input.assessmentId,
			results: [
				{
					studentId: input.studentId,
					status: input.status,
					score: input.status === 'graded' && input.score !== null ? String(input.score) : null,
				},
			],
		});
		return {
			status: current?.result.status ?? 'pending',
			score: current?.result.score == null ? null : Number(current.result.score),
		};
	}

	private async requireAssessment(tenantId: string, assessmentId: string) {
		const row = await this.assessments.findById(tenantId, assessmentId);
		if (!row) {
			throw new NotFoundException({
				code: 'ASSESSMENT_NOT_FOUND',
				message: 'Assessment not found',
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
				code: 'ASSESSMENT_SECTION_ACCESS_DENIED',
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
