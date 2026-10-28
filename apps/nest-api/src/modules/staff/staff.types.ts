import type { SectionRecord, StaffProfileRecord, SubjectRecord } from '@/database/schema';

import type { PublicTeacherDaySchedule } from '@/modules/timetable/timetable.types';

export type PublicStaffProfile = {
	id: string | null;
	membershipId: string;
	employeeCode: string | null;
	phone: string | null;
	qualification: string | null;
	specialization: string | null;
	hireDate: string | null;
	status: StaffProfileRecord['status'] | 'active';
	notes: string | null;
};

export type PublicTeacher = {
	membershipId: string;
	userId: string;
	email: string;
	username: string;
	role: string;
	campusId: string | null;
	profile: PublicStaffProfile;
	homeroomSectionCount: number;
	subjectAssignmentCount: number;
};

export type PublicSectionSubjectOption = {
	id: string;
	sectionId: string;
	sectionName: string;
	subjectId: string;
	subjectCode: string;
	subjectName: string;
	teacherMembershipId: string | null;
};

export function toPublicSectionSubjectOption(row: {
	assignment: { id: string; sectionId: string; teacherMembershipId: string | null };
	section: { id: string; name: string };
	subject: { id: string; code: string; name: string };
}): PublicSectionSubjectOption {
	return {
		id: row.assignment.id,
		sectionId: row.section.id,
		sectionName: row.section.name,
		subjectId: row.subject.id,
		subjectCode: row.subject.code,
		subjectName: row.subject.name,
		teacherMembershipId: row.assignment.teacherMembershipId,
	};
}

export type PublicSubjectAssignment = {
	id: string;
	sectionId: string;
	sectionName: string;
	subjectId: string;
	subjectCode: string;
	subjectName: string;
};

export type PublicTeacherAccessibleSection = {
	id: string;
	name: string;
	campusId: string;
	classId: string;
	academicYearId: string;
	accessType: 'homeroom' | 'subject';
	subjectId: string | null;
	subjectName: string | null;
	subjectCode: string | null;
};

export type PublicTeacherDashboardAttendanceSummary = {
	present: number;
	absent: number;
	late: number;
	excused: number;
	leftEarly: number;
	unknown: number;
	total: number;
	attendanceRate: number | null;
};

export type PublicTeacherDashboardSection = {
	section: PublicTeacherAccessibleSection;
	studentCount: number;
	/**
	 * The class's daily roll call over the last 10 school days: one point per day it was marked,
	 * oldest first, and the rate across them all (attended ÷ marked, one decimal).
	 */
	recentAttendance: {
		rate: number | null;
		days: { date: string; rate: number }[];
	};
	todayAttendance: {
		sessionId: string | null;
		isComplete: boolean;
		summary: PublicTeacherDashboardAttendanceSummary | null;
	};
};

export type PublicTeacherDashboardPriorityAction = {
	type: 'mark_attendance' | 'review_absences';
	sectionId: string;
	label: string;
	reason: string;
};

export type PublicTeacherDashboardAlert = {
	type: 'consecutive_absence';
	studentId: string;
	studentName: string;
	sectionId: string;
	sectionLabel: string;
	consecutiveDays: number;
};

export type PublicTeacherDashboardUpcomingPeriod = {
	periodName: string;
	startsAt: string;
	endsAt: string;
	sectionId: string;
	sectionName: string;
	subjectName: string | null;
	subjectCode: string | null;
	roomName: string | null;
};

export type PublicTeacherDashboardYesterdaySection = {
	sectionId: string;
	sectionName: string;
	classId: string;
};

export type PublicTeacherDashboardDigest = {
	draftHomeworkCount: number;
	/** Submissions handed in and not graded yet, across this teacher's subject classes. */
	toReviewCount: number;
	dueTodayHomeworkCount: number;
	upcomingPeriod: PublicTeacherDashboardUpcomingPeriod | null;
	yesterdayUnmarkedSections: PublicTeacherDashboardYesterdaySection[];
};

export type PublicTeacherDashboard = {
	sessionDate: string;
	teacher: PublicTeacher;
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
	sections: PublicTeacherDashboardSection[];
	priorityActions: PublicTeacherDashboardPriorityAction[];
	alerts: PublicTeacherDashboardAlert[];
	todaySchedule: PublicTeacherDaySchedule | null;
	morningDigest: PublicTeacherDashboardDigest;
};

export type PublicSubject = {
	id: string;
	code: string;
	name: string;
	description: string | null;
};

export function toPublicStaffProfile(
	membershipId: string,
	profile: StaffProfileRecord | null,
): PublicStaffProfile {
	if (!profile) {
		return {
			id: null,
			membershipId,
			employeeCode: null,
			phone: null,
			qualification: null,
			specialization: null,
			hireDate: null,
			status: 'active',
			notes: null,
		};
	}
	return {
		id: profile.id,
		membershipId: profile.membershipId,
		employeeCode: profile.employeeCode,
		phone: profile.phone,
		qualification: profile.qualification,
		specialization: profile.specialization,
		hireDate: profile.hireDate,
		status: profile.status,
		notes: profile.notes,
	};
}

export function toPublicSubject(subject: SubjectRecord): PublicSubject {
	return {
		id: subject.id,
		code: subject.code,
		name: subject.name,
		description: subject.description,
	};
}

export function toPublicSubjectAssignment(input: {
	assignment: { id: string; sectionId: string; subjectId: string };
	section: SectionRecord;
	subject: SubjectRecord;
}): PublicSubjectAssignment {
	return {
		id: input.assignment.id,
		sectionId: input.section.id,
		sectionName: input.section.name,
		subjectId: input.subject.id,
		subjectCode: input.subject.code,
		subjectName: input.subject.name,
	};
}
