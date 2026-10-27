import type { HomeworkAssignmentRecord } from '@/database/schema';

export type PublicHomeworkAssignment = {
	id: string;
	sectionSubjectId: string;
	sectionId: string;
	sectionName: string;
	subjectId: string;
	subjectCode: string;
	subjectName: string;
	title: string;
	description: string | null;
	dueAt: string | null;
	status: HomeworkAssignmentRecord['status'];
	assignMode: HomeworkAssignmentRecord['assignMode'];
	estimatedMinutes: number | null;
	materials: string | null;
	recipientCount: number;
	/** Recipients who handed it in (submitted, late or graded). */
	submittedCount: number;
	createdByMembershipId: string;
	teacherName: string | null;
	createdAt: string;
	updatedAt: string;
};

export type PublicHomeworkDetail = PublicHomeworkAssignment & {
	recipientStudentIds: string[];
	rosterStudents: Array<{
		studentId: string;
		studentName: string;
		studentCode: string;
		isAssigned: boolean;
	}>;
};

export function toPublicHomework(
	record: HomeworkAssignmentRecord,
	context: {
		sectionId: string;
		sectionName: string;
		subjectId: string;
		subjectCode: string;
		subjectName: string;
		recipientCount?: number;
		submittedCount?: number;
		teacherName?: string | null;
	},
): PublicHomeworkAssignment {
	return {
		id: record.id,
		sectionSubjectId: record.sectionSubjectId,
		sectionId: context.sectionId,
		sectionName: context.sectionName,
		subjectId: context.subjectId,
		subjectCode: context.subjectCode,
		subjectName: context.subjectName,
		title: record.title,
		description: record.description,
		dueAt: record.dueAt?.toISOString() ?? null,
		status: record.status,
		assignMode: record.assignMode,
		estimatedMinutes: record.estimatedMinutes,
		materials: record.materials,
		recipientCount: context.recipientCount ?? 0,
		submittedCount: context.submittedCount ?? 0,
		createdByMembershipId: record.createdByMembershipId,
		teacherName: context.teacherName ?? null,
		createdAt: record.createdAt.toISOString(),
		updatedAt: record.updatedAt.toISOString(),
	};
}
