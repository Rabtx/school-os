import type { Enrollment, Student } from "@/modules/students/types/student.types";
import type { TeacherDaySchedule } from "@/modules/timetable";

export type TeacherProfile = {
	id: string | null;
	membershipId: string;
	employeeCode: string | null;
	phone: string | null;
	qualification: string | null;
	specialization: string | null;
	hireDate: string | null;
	status: "active" | "inactive" | "on_leave";
	notes: string | null;
};

export type TeacherSummary = {
	membershipId: string;
	userId: string;
	email: string;
	username: string;
	role: string;
	campusId: string | null;
	profile: TeacherProfile;
	homeroomSectionCount: number;
	subjectAssignmentCount: number;
};

export type TeacherDetail = {
	teacher: Omit<TeacherSummary, "homeroomSectionCount" | "subjectAssignmentCount"> & {
		homeroomSectionCount: number;
		subjectAssignmentCount: number;
	};
	homeroomSections: Array<{
		id: string;
		name: string;
		campusId: string;
		classId: string;
		academicYearId: string;
	}>;
	subjectAssignments: Array<{
		id: string;
		sectionId: string;
		sectionName: string;
		subjectId: string;
		subjectCode: string;
		subjectName: string;
	}>;
	accessibleSections: TeacherAccessibleSection[];
};

export type TeacherAccessibleSection = {
	id: string;
	name: string;
	campusId: string;
	classId: string;
	academicYearId: string;
	accessType: "homeroom" | "subject";
	subjectId: string | null;
	subjectName: string | null;
	subjectCode: string | null;
};

export type TeacherDashboardAttendanceSummary = {
	present: number;
	absent: number;
	late: number;
	excused: number;
	leftEarly: number;
	unknown: number;
	total: number;
	attendanceRate: number | null;
};

export type TeacherDashboardSection = {
	section: TeacherAccessibleSection;
	studentCount: number;
	/** Daily roll call over the last 10 school days, oldest first, and the rate across them. */
	recentAttendance: {
		rate: number | null;
		days: { date: string; rate: number }[];
	};
	todayAttendance: {
		sessionId: string | null;
		isComplete: boolean;
		summary: TeacherDashboardAttendanceSummary | null;
	};
};

export type TeacherDashboardPriorityAction = {
	type: "mark_attendance" | "review_absences";
	sectionId: string;
	label: string;
	reason: string;
};

export type TeacherDashboardAlert = {
	type: "consecutive_absence";
	studentId: string;
	studentName: string;
	sectionId: string;
	sectionLabel: string;
	consecutiveDays: number;
};

export type TeacherDashboardUpcomingPeriod = {
	periodName: string;
	startsAt: string;
	endsAt: string;
	sectionId: string;
	sectionName: string;
	subjectName: string | null;
	subjectCode: string | null;
	roomName: string | null;
};

export type TeacherDashboardYesterdaySection = {
	sectionId: string;
	sectionName: string;
	classId: string;
};

export type TeacherDashboardMorningDigest = {
	draftHomeworkCount: number;
	/** Submissions handed in and not graded yet. */
	toReviewCount: number;
	dueTodayHomeworkCount: number;
	upcomingPeriod: TeacherDashboardUpcomingPeriod | null;
	yesterdayUnmarkedSections: TeacherDashboardYesterdaySection[];
};

export type TeacherDashboard = {
	sessionDate: string;
	teacher: TeacherDetail["teacher"];
	stats: {
		totalClasses: number;
		homeroomCount: number;
		subjectCount: number;
		totalStudents: number;
		pendingAttendanceCount: number;
		todayPresent: number;
		todayAbsent: number;
		todayLate: number;
		todayAttendanceRate: number | null;
		todayPeriodCount: number;
		alertCount: number;
		pendingTaskCount: number;
	};
	sections: TeacherDashboardSection[];
	priorityActions: TeacherDashboardPriorityAction[];
	alerts: TeacherDashboardAlert[];
	todaySchedule: TeacherDaySchedule | null;
	morningDigest: TeacherDashboardMorningDigest;
};

export type TeacherSectionStudent = {
	student: Student;
	enrollment: Enrollment;
};

export type UpsertStaffProfileInput = {
	employeeCode?: string;
	phone?: string;
	qualification?: string;
	specialization?: string;
	hireDate?: string;
	status?: "active" | "inactive" | "on_leave";
	notes?: string;
};

export type Subject = {
	id: string;
	code: string;
	name: string;
	description: string | null;
};

export type CreateSubjectInput = {
	code: string;
	name: string;
	description?: string;
};

export type AssignSectionSubjectInput = {
	sectionId: string;
	subjectId: string;
	teacherMembershipId: string;
};
