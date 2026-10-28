export type AssessmentStatus = "draft" | "published" | "closed";
export type AssessmentType = "quiz" | "test" | "exam";
export type AssessmentResultStatus = "pending" | "graded" | "absent";
export type AssignMode = "whole_class" | "selected_students";

export type Assessment = {
	id: string;
	sectionSubjectId: string;
	sectionId: string;
	sectionName: string;
	subjectId: string;
	subjectCode: string;
	subjectName: string;
	type: AssessmentType;
	title: string;
	assessedOn: string;
	maxScore: number;
	status: AssessmentStatus;
	assignMode: AssignMode;
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

export type AssessmentListItem = Assessment & { results: AssessmentResultsSummary };

export type AssessmentResult = {
	id: string | null;
	studentId: string;
	studentName: string;
	studentCode: string;
	score: number | null;
	status: AssessmentResultStatus;
};

export type AssessmentDetail = Assessment & {
	recipientStudentIds: string[];
	results: AssessmentResult[];
	summary: {
		graded: number;
		pending: number;
		absent: number;
		total: number;
		averageScore: number | null;
	};
};

export type CreateAssessmentInput = {
	sectionSubjectId: string;
	type?: AssessmentType;
	title: string;
	assessedOn: string;
	maxScore?: number;
	status?: AssessmentStatus;
	assignMode?: AssignMode;
	studentIds?: string[];
	startsAt?: string | null;
	durationMinutes?: number | null;
	room?: string | null;
	instructions?: string | null;
};

export type UpdateAssessmentInput = {
	type?: AssessmentType;
	title?: string;
	assessedOn?: string;
	maxScore?: number;
	status?: AssessmentStatus;
	assignMode?: AssignMode;
	studentIds?: string[];
	startsAt?: string | null;
	durationMinutes?: number | null;
	room?: string | null;
	instructions?: string | null;
};

export type UpsertAssessmentResultsInput = {
	results: Array<{
		studentId: string;
		score?: number | null;
		status: AssessmentResultStatus;
	}>;
};
