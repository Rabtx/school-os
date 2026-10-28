import type {
	AssessmentRecord,
	AssessmentResultRecord,
	HomeworkAssignmentRecord,
	HomeworkSubmissionRecord,
} from '@/database/schema';
import { gradeFromPercentage } from '@/modules/assessments/assessments.types';

export type MarksheetAssessment = {
	id: string;
	title: string;
	type: AssessmentRecord['type'];
	assessedOn: string;
	maxScore: number;
	status: AssessmentRecord['status'];
};

export type MarksheetHomework = {
	id: string;
	title: string;
	dueAt: string | null;
	status: HomeworkAssignmentRecord['status'];
};

export type MarksheetAssessmentMark = {
	status: AssessmentResultRecord['status'];
	score: number | null;
	percentage: number | null;
};

export type MarksheetHomeworkMark = {
	status: HomeworkSubmissionRecord['status'];
	marksObtained: number | null;
	totalMarks: number | null;
	percentage: number | null;
};

export type MarksheetRow = {
	studentId: string;
	studentName: string;
	studentCode: string;
	/** Keyed by assessment id; absent when the student was not set that assessment. */
	assessments: Record<string, MarksheetAssessmentMark>;
	/** Keyed by homework id; absent when the student was not set that homework. */
	homework: Record<string, MarksheetHomeworkMark>;
	homeworkAverage: number | null;
	/** Every marked test and homework as a percentage, oldest first. */
	trend: number[];
	/** Mean of every marked test and homework, each counted once. */
	overall: { percentage: number; grade: string } | null;
	/** Homework handed in that still needs marks. */
	waitingCount: number;
};

export type Marksheet = {
	sectionId: string;
	subject: { id: string; code: string; name: string };
	assessments: MarksheetAssessment[];
	homework: MarksheetHomework[];
	rows: MarksheetRow[];
	classAverage: number | null;
	waitingCount: number;
};

type Student = { id: string; firstName: string; lastName: string; studentCode: string };

export type MarksheetInput = {
	sectionId: string;
	subject: Marksheet['subject'];
	students: Student[];
	assessments: AssessmentRecord[];
	assessmentResults: AssessmentResultRecord[];
	assessmentRecipients: Array<{ assessmentId: string; studentId: string }>;
	homework: HomeworkAssignmentRecord[];
	submissions: HomeworkSubmissionRecord[];
	homeworkRecipients: Array<{ homeworkId: string; studentId: string }>;
};

const round1 = (value: number) => Math.round(value * 10) / 10;

function mean(values: number[]): number | null {
	if (values.length === 0) return null;
	return round1(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function percentageOf(obtained: number | null, total: number | null): number | null {
	if (obtained === null || total === null || total <= 0) return null;
	return round1((obtained / total) * 100);
}

function recipientsBy<K extends string>(
	rows: Array<Record<K, string> & { studentId: string }>,
	key: K,
): Map<string, Set<string>> {
	const map = new Map<string, Set<string>>();
	for (const row of rows) {
		const set = map.get(row[key]) ?? new Set<string>();
		set.add(row.studentId);
		map.set(row[key], set);
	}
	return map;
}

/** One class subject's marks: every test and homework per student, with averages and trend. */
export function buildMarksheet(input: MarksheetInput): Marksheet {
	const resultByKey = new Map(
		input.assessmentResults.map((result) => [`${result.assessmentId}:${result.studentId}`, result]),
	);
	const submissionByKey = new Map(
		input.submissions.map((row) => [`${row.homeworkId}:${row.studentId}`, row]),
	);
	const assessmentRecipients = recipientsBy(input.assessmentRecipients, 'assessmentId');
	const homeworkRecipients = recipientsBy(input.homeworkRecipients, 'homeworkId');

	// Tests and homework on one timeline so the trend reads oldest to newest.
	const timeline = [
		...input.assessments.map((row) => ({
			kind: 'assessment' as const,
			id: row.id,
			at: new Date(`${row.assessedOn}T00:00:00Z`).getTime(),
		})),
		...input.homework.map((row) => ({
			kind: 'homework' as const,
			id: row.id,
			at: (row.dueAt ?? row.createdAt).getTime(),
		})),
	].toSorted((a, b) => a.at - b.at);

	const rows = input.students.map((student): MarksheetRow => {
		const assessments: Record<string, MarksheetAssessmentMark> = {};
		for (const assessment of input.assessments) {
			const chosen = assessmentRecipients.get(assessment.id);
			if (assessment.assignMode === 'selected_students' && !chosen?.has(student.id)) continue;
			const result = resultByKey.get(`${assessment.id}:${student.id}`);
			const score = result?.score == null ? null : Number(result.score);
			const status = result?.status ?? 'pending';
			assessments[assessment.id] = {
				status,
				score,
				percentage: status === 'graded' ? percentageOf(score, Number(assessment.maxScore)) : null,
			};
		}

		const homework: Record<string, MarksheetHomeworkMark> = {};
		for (const assignment of input.homework) {
			const chosen = homeworkRecipients.get(assignment.id);
			if (assignment.assignMode === 'selected_students' && !chosen?.has(student.id)) continue;
			const submission = submissionByKey.get(`${assignment.id}:${student.id}`);
			const marksObtained =
				submission?.marksObtained == null ? null : Number(submission.marksObtained);
			const totalMarks = submission?.totalMarks == null ? null : Number(submission.totalMarks);
			const status = submission?.status ?? 'pending';
			homework[assignment.id] = {
				status,
				marksObtained,
				totalMarks,
				percentage: status === 'graded' ? percentageOf(marksObtained, totalMarks) : null,
			};
		}

		const trend = timeline
			.map((item) =>
				item.kind === 'assessment'
					? assessments[item.id]?.percentage
					: homework[item.id]?.percentage,
			)
			.filter((value): value is number => value != null);
		const overall = mean(trend);
		const homeworkAverage = mean(
			Object.values(homework)
				.map((mark) => mark.percentage)
				.filter((value): value is number => value != null),
		);

		return {
			studentId: student.id,
			studentName: `${student.firstName} ${student.lastName}`.trim(),
			studentCode: student.studentCode,
			assessments,
			homework,
			homeworkAverage,
			trend,
			overall:
				overall === null ? null : { percentage: overall, grade: gradeFromPercentage(overall) },
			waitingCount: Object.values(homework).filter(
				(mark) => mark.status === 'submitted' || mark.status === 'late',
			).length,
		};
	});

	return {
		sectionId: input.sectionId,
		subject: input.subject,
		assessments: input.assessments.map((row) => ({
			id: row.id,
			title: row.title,
			type: row.type,
			assessedOn: row.assessedOn,
			maxScore: Number(row.maxScore),
			status: row.status,
		})),
		homework: input.homework.map((row) => ({
			id: row.id,
			title: row.title,
			dueAt: row.dueAt?.toISOString() ?? null,
			status: row.status,
		})),
		rows,
		classAverage: mean(
			rows.map((row) => row.overall?.percentage).filter((value): value is number => value != null),
		),
		waitingCount: rows.reduce((sum, row) => sum + row.waitingCount, 0),
	};
}
