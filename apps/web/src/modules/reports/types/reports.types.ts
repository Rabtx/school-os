export type ReportTerm = "term1" | "term2" | "term3" | "final";

export type ReportOverview = {
	tenantId: string;
	sectionId: string | null;
	students: number;
	sections: number;
	subjects: number;
	assessments: number;
	attendance: {
		marked: number;
		present: number;
		rate: number | null;
	};
};

export type GradeDistributionBucket = {
	grade: string;
	count: number;
};

export type GradeSubjectSummary = {
	subjectId: string;
	subjectCode: string;
	subjectName: string;
	entryCount: number;
	studentCount: number;
	averagePercentage: number | null;
	distribution: GradeDistributionBucket[];
};

export type GradeStudentSummary = {
	studentId: string;
	studentName: string;
	studentCode: string;
	entryCount: number;
	averagePercentage: number | null;
	averageGradePoint: number | null;
};

export type GradesReport = {
	sectionId: string;
	term: string | null;
	overallAveragePercentage: number | null;
	subjects: GradeSubjectSummary[];
	students: GradeStudentSummary[];
};

export type AttendanceReport = {
	sectionId: string;
	from: string | null;
	to: string | null;
	sessionCount: number;
	marked: number;
	present: number;
	absent: number;
	late: number;
	excused: number;
	leftEarly: number;
	unknown: number;
	attendanceRate: number | null;
};

export type HomeworkReport = {
	sectionId: string;
	assignmentCount: number;
	submissionCount: number;
	pending: number;
	submitted: number;
	late: number;
	graded: number;
	excused: number;
	submissionRate: number | null;
	gradedRate: number | null;
};

export type SchoolReportPeriod = "week" | "month" | "year";

export type AttendanceCounts = {
	present: number;
	absent: number;
	late: number;
	excused: number;
	leftEarly: number;
	unknown: number;
	total: number;
};

export type SchoolAttendanceFollowUp = {
	studentId: string;
	studentCode: string;
	fullName: string;
	sectionName: string | null;
	className: string | null;
	absences: number;
	late: number;
	excused: number;
	guardianName: string | null;
	guardianPhone: string | null;
};

/** Leadership attendance report for a week, month or school year. */
export type SchoolAttendanceReport = {
	period: SchoolReportPeriod;
	from: string;
	to: string;
	previous: { from: string; to: string } | null;
	schoolDays: number;
	summary: AttendanceCounts;
	attendanceRate: number | null;
	previousSummary: AttendanceCounts | null;
	previousAttendanceRate: number | null;
	byClass: {
		sectionId: string;
		sectionName: string;
		className: string | null;
		summary: AttendanceCounts;
		attendanceRate: number | null;
	}[];
	lateByWeekday: { dayOfWeek: number; count: number }[];
	followUpRule: { absences: number; late: number };
	followUps: SchoolAttendanceFollowUp[];
};
