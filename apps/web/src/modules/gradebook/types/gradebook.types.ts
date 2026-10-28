export type GradebookTerm = "term1" | "term2" | "term3" | "final";
export type GradebookSource = "assessment" | "homework" | "manual";

export type GradebookCell = {
	grade: string;
	gradePoint: number;
	obtainedMarks: number;
	totalMarks: number;
	percentage: number;
	source: GradebookSource;
};

export type GradebookGridRow = {
	studentId: string;
	studentName: string;
	studentCode: string;
	cells: Record<string, GradebookCell>;
};

export type GradebookSubject = {
	id: string;
	code: string;
	name: string;
};

export type GradebookGrid = {
	sectionId: string;
	term: GradebookTerm;
	subjects: GradebookSubject[];
	rows: GradebookGridRow[];
	averages: Record<string, number | null>;
};

export type GradebookEntryInput = {
	studentId: string;
	sectionId: string;
	academicYearId: string;
	term: GradebookTerm;
	subjectId: string;
	totalMarks: number;
	obtainedMarks: number;
	source?: GradebookSource;
	sourceId?: string | null;
};

export type StudentReportEntry = {
	subjectId: string;
	subjectCode: string;
	subjectName: string;
	sectionId: string;
	sectionName: string;
	academicYearId: string;
	academicYearName: string;
	term: GradebookTerm;
	obtainedMarks: number;
	totalMarks: number;
	percentage: number;
	grade: string;
	gradePoint: number;
	source: GradebookSource;
};

export type StudentReport = {
	student: {
		id: string;
		name: string;
		studentCode: string;
	};
	entries: StudentReportEntry[];
	averageGradePoint: number | null;
};

export type MarksheetAssessment = {
	id: string;
	title: string;
	type: "quiz" | "test" | "exam";
	assessedOn: string;
	maxScore: number;
	status: "draft" | "published" | "closed";
};

export type MarksheetHomework = {
	id: string;
	title: string;
	dueAt: string | null;
	status: "draft" | "published" | "closed";
};

export type MarksheetAssessmentMark = {
	status: "pending" | "graded" | "absent";
	score: number | null;
	percentage: number | null;
};

export type MarksheetHomeworkMark = {
	status: "pending" | "submitted" | "late" | "graded" | "excused";
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
