import type { AssessmentRecord, AssessmentResultRecord } from '@/database/schema';

export type PublicAssessment = {
	id: string;
	sectionSubjectId: string;
	sectionId: string;
	sectionName: string;
	subjectId: string;
	subjectCode: string;
	subjectName: string;
	type: AssessmentRecord['type'];
	title: string;
	assessedOn: string;
	maxScore: number;
	status: AssessmentRecord['status'];
	assignMode: AssessmentRecord['assignMode'];
	startsAt: string | null;
	durationMinutes: number | null;
	room: string | null;
	instructions: string | null;
	recipientCount: number;
	createdByMembershipId: string;
	createdAt: string;
	updatedAt: string;
};

/** Results so far, on list rows: how many are marked and their mean as a percentage. */
export type AssessmentResultsSummary = {
	graded: number;
	absent: number;
	averagePercentage: number | null;
};

export type PublicAssessmentListItem = PublicAssessment & { results: AssessmentResultsSummary };

export type PublicAssessmentResult = {
	id: string | null;
	studentId: string;
	studentName: string;
	studentCode: string;
	score: number | null;
	status: AssessmentResultRecord['status'];
};

export type PublicAssessmentDetail = PublicAssessment & {
	recipientStudentIds: string[];
	results: PublicAssessmentResult[];
	summary: {
		graded: number;
		pending: number;
		absent: number;
		total: number;
		averageScore: number | null;
	};
};

export function toPublicAssessment(
	record: AssessmentRecord,
	context: {
		sectionId: string;
		sectionName: string;
		subjectId: string;
		subjectCode: string;
		subjectName: string;
		recipientCount?: number;
	},
): PublicAssessment {
	return {
		id: record.id,
		sectionSubjectId: record.sectionSubjectId,
		sectionId: context.sectionId,
		sectionName: context.sectionName,
		subjectId: context.subjectId,
		subjectCode: context.subjectCode,
		subjectName: context.subjectName,
		type: record.type,
		title: record.title,
		assessedOn: record.assessedOn,
		maxScore: Number(record.maxScore),
		status: record.status,
		assignMode: record.assignMode,
		startsAt: record.startsAt?.toISOString() ?? null,
		durationMinutes: record.durationMinutes,
		room: record.room,
		instructions: record.instructions,
		recipientCount: context.recipientCount ?? 0,
		createdByMembershipId: record.createdByMembershipId,
		createdAt: record.createdAt.toISOString(),
		updatedAt: record.updatedAt.toISOString(),
	};
}

export function computeAssessmentSummary(
	results: PublicAssessmentResult[],
	_maxScore: number,
): PublicAssessmentDetail['summary'] {
	let graded = 0;
	let pending = 0;
	let absent = 0;
	let scoreSum = 0;
	let scoreCount = 0;

	for (const result of results) {
		if (result.status === 'graded') {
			graded += 1;
			if (result.score !== null) {
				scoreSum += result.score;
				scoreCount += 1;
			}
		} else if (result.status === 'absent') {
			absent += 1;
		} else {
			pending += 1;
		}
	}

	return {
		graded,
		pending,
		absent,
		total: results.length,
		averageScore: scoreCount > 0 ? Math.round((scoreSum / scoreCount) * 100) / 100 : null,
	};
}

export function gradeFromPercentage(percentage: number): string {
	if (percentage >= 90) return 'A+';
	if (percentage >= 80) return 'A';
	if (percentage >= 70) return 'B';
	if (percentage >= 60) return 'C';
	if (percentage >= 50) return 'D';
	if (percentage >= 40) return 'E';
	return 'F';
}

export function gradePointFromPercentage(percentage: number): number {
	if (percentage >= 90) return 4.0;
	if (percentage >= 80) return 3.7;
	if (percentage >= 70) return 3.0;
	if (percentage >= 60) return 2.3;
	if (percentage >= 50) return 1.7;
	if (percentage >= 40) return 1.0;
	return 0.0;
}
