import type { SchoolClass, Section } from "@/modules/academic/types/academic.types";
import type { MemberListSummary } from "@/modules/members/types/member.types";
import type { TeacherSummary } from "@/modules/staff/types/staff.types";
import type { Enrollment, Student } from "@/modules/students/types/student.types";
import type { Campus } from "@/modules/tenants/types/tenant.types";
import type {
	DashboardAdmission,
	DashboardMetrics,
	DashboardMonthEnrollment,
	DashboardOpsPulseItem,
	DashboardStatCard,
} from "../types/dashboard.types";

const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

const whole = (n: number) => Math.round(n).toLocaleString("en-US");

function studentAdmissionDate(student: Student): Date {
	const raw = student.admittedOn ?? student.createdAt;
	return new Date(raw);
}

function formatAdmissionDate(value: string | null): string {
	if (!value) return "—";
	return new Date(value).toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
		year: "numeric",
	});
}

function mapStudentStatus(status: Student["status"]): DashboardAdmission["status"] {
	if (status === "active") return "enrolled";
	if (status === "inactive") return "pending";
	if (status === "withdrawn") return "waitlisted";
	return "enrolled";
}

function mapStudentSource(student: Student): DashboardAdmission["source"] {
	if (student.previousSchool?.trim()) return "transfer";
	return "portal";
}

function sparkBars(values: number[]): number[] {
	if (values.length === 0) return [20, 30, 25, 40, 35, 45, 50];
	const max = Math.max(...values, 1);
	return values.map((value) => Math.max(12, Math.round((value / max) * 100)));
}

function computeMonthlyEnrollment(students: Student[], year: number): DashboardMonthEnrollment[] {
	const activeStudents = students.filter((student) => student.status === "active");

	return MONTHS.map((month, index) => {
		const monthStart = new Date(year, index, 1);
		const monthEnd = new Date(year, index + 1, 0, 23, 59, 59, 999);

		const newAdmissions = activeStudents.filter((student) => {
			const date = studentAdmissionDate(student);
			return date >= monthStart && date <= monthEnd;
		}).length;

		const returning = activeStudents.filter((student) => {
			const date = studentAdmissionDate(student);
			return date < monthStart;
		}).length;

		return {
			month,
			newAdmissions,
			returning,
			total: newAdmissions + returning,
		};
	});
}

function countNewThisMonth(students: Student[]): number {
	const now = new Date();
	const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
	const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

	return students.filter((student) => {
		if (student.status !== "active") return false;
		const date = studentAdmissionDate(student);
		return date >= monthStart && date <= monthEnd;
	}).length;
}

function buildRecentAdmissions(
	students: Student[],
	enrollments: Enrollment[],
	sections: Section[],
	classes: SchoolClass[],
	campuses: Campus[],
	limit = 12,
): DashboardAdmission[] {
	const sectionMap = new Map(sections.map((section) => [section.id, section]));
	const classMap = new Map(classes.map((schoolClass) => [schoolClass.id, schoolClass]));
	const campusMap = new Map(campuses.map((campus) => [campus.id, campus.name]));

	const enrollmentByStudent = new Map<string, Enrollment>();
	for (const enrollment of enrollments) {
		if (enrollment.status !== "active") continue;
		if (!enrollmentByStudent.has(enrollment.studentId)) {
			enrollmentByStudent.set(enrollment.studentId, enrollment);
		}
	}

	return [...students]
		.toSorted((a, b) => studentAdmissionDate(b).getTime() - studentAdmissionDate(a).getTime())
		.slice(0, limit)
		.map((student) => {
			const enrollment = enrollmentByStudent.get(student.id);
			const section = enrollment ? sectionMap.get(enrollment.sectionId) : undefined;
			const schoolClass = section ? classMap.get(section.classId) : undefined;

			return {
				id: student.studentCode,
				student: student.fullName,
				email: student.email ?? "—",
				grade: schoolClass?.name ?? "Unassigned",
				campus: campusMap.get(student.campusId) ?? "—",
				guardian: student.emergencyContactName ?? "—",
				guardianRelation: "Emergency contact",
				guardianPhone: student.emergencyContactPhone ?? "—",
				date: formatAdmissionDate(student.admittedOn ?? student.createdAt),
				status: mapStudentStatus(student.status),
				source: mapStudentSource(student),
				note: student.previousSchool?.trim()
					? `Transfer from ${student.previousSchool}`
					: student.medicalNotes?.trim()
						? student.medicalNotes
						: "Active student record",
			};
		});
}

function computeGradeRows(enrollments: Enrollment[], sections: Section[], classes: SchoolClass[]) {
	const sectionMap = new Map(sections.map((section) => [section.id, section]));
	const counts = new Map<string, number>();

	for (const enrollment of enrollments) {
		if (enrollment.status !== "active") continue;
		const section = sectionMap.get(enrollment.sectionId);
		if (!section) continue;
		counts.set(section.classId, (counts.get(section.classId) ?? 0) + 1);
	}

	return [...classes]
		.toSorted((a, b) => a.sortOrder - b.sortOrder)
		.map((schoolClass, index) => ({
			grade: index + 1,
			label: schoolClass.name,
			students: counts.get(schoolClass.id) ?? 0,
		}));
}

function studentsWithoutEnrollment(students: Student[], enrollments: Enrollment[]): number {
	const enrolledIds = new Set(
		enrollments.filter((row) => row.status === "active").map((row) => row.studentId),
	);
	return students.filter((student) => student.status === "active" && !enrolledIds.has(student.id))
		.length;
}

export type DashboardRawData = {
	students: Student[];
	enrollments: Enrollment[];
	classes: SchoolClass[];
	sections: Section[];
	teachers: TeacherSummary[];
	memberSummary: MemberListSummary | null;
	campuses: Campus[];
	activeYearLabel: string;
};

export function computeDashboardMetrics(data: DashboardRawData): DashboardMetrics {
	const activeStudents = data.students.filter((student) => student.status === "active");
	const year = new Date().getFullYear();
	const enrollmentMonths = computeMonthlyEnrollment(data.students, year);
	const monthlyTotals = enrollmentMonths.map((row) => row.total);
	const gradeRows = computeGradeRows(data.enrollments, data.sections, data.classes);
	const gradeCounts = gradeRows.map((row) => row.students).filter((count) => count > 0);
	const avgPerGrade =
		gradeCounts.length > 0
			? Math.round(gradeCounts.reduce((sum, count) => sum + count, 0) / gradeCounts.length)
			: 0;
	const gradeSpread =
		gradeCounts.length > 0 ? Math.max(...gradeCounts) - Math.min(...gradeCounts) : 0;
	const peakGrade = gradeRows.toSorted((a, b) => b.students - a.students)[0];
	const softestGrade = gradeRows.toSorted((a, b) => a.students - b.students)[0];

	const activeTeachers = data.teachers.filter((teacher) => teacher.profile.status === "active");
	const teachersOnLeave = data.teachers.filter(
		(teacher) => teacher.profile.status === "on_leave",
	).length;
	const unassignedStudents = studentsWithoutEnrollment(data.students, data.enrollments);
	const newThisMonth = countNewThisMonth(data.students);
	const recentAdmissions = buildRecentAdmissions(
		data.students,
		data.enrollments,
		data.sections,
		data.classes,
		data.campuses,
	);

	const stats: DashboardStatCard[] = [
		{
			id: "students",
			label: "Total Students",
			value: activeStudents.length,
			formatValue: whole,
			detail:
				data.campuses.length > 0
					? `Across ${data.campuses.length} campus${data.campuses.length === 1 ? "" : "es"} · ${unassignedStudents} without section`
					: `${unassignedStudents} active students without enrollment`,
			trend: newThisMonth > 0 ? "up" : "flat",
			trendDelta: newThisMonth > 0 ? `+${newThisMonth}` : "0",
			trendLabel: "new this month",
			bars: sparkBars(monthlyTotals),
			activeIndex: Math.max(0, new Date().getMonth()),
		},
		{
			id: "attendance",
			label: "Attendance Rate",
			value: 0,
			formatValue: () => "—",
			detail: "Open Smart attendance to mark today’s sessions",
			trend: "flat",
			trendDelta: "—",
			trendLabel: "live after first session",
			bars: sparkBars([0, 0, 0, 0, 0, 0, 0]),
			activeIndex: 6,
			unavailable: true,
		},
		{
			id: "staff",
			label: "Teaching Staff",
			value: activeTeachers.length,
			formatValue: whole,
			detail:
				teachersOnLeave > 0
					? `${activeTeachers.length} active · ${teachersOnLeave} on leave`
					: `${data.teachers.length} teacher profiles in directory`,
			trend: activeTeachers.length > 0 ? "up" : "flat",
			trendDelta: String(activeTeachers.length),
			trendLabel: "active teachers",
			bars: sparkBars([activeTeachers.length]),
			activeIndex: 0,
		},
		{
			id: "fees",
			label: "Fee Collection",
			value: 0,
			formatValue: () => "—",
			detail: "Fees module not enabled yet",
			trend: "flat",
			trendDelta: "—",
			trendLabel: "coming soon",
			bars: sparkBars([0, 0, 0, 0, 0, 0, 0]),
			activeIndex: 6,
			unavailable: true,
		},
	];

	const pendingInvites = data.memberSummary?.pendingEmailInvites ?? 0;
	const invitedMembers = data.memberSummary?.invited ?? 0;

	const opsPulse: DashboardOpsPulseItem[] = [
		{
			id: "students",
			label: "Active students",
			value: whole(activeStudents.length),
			hint:
				unassignedStudents > 0
					? `${unassignedStudents} need section assignment`
					: `${data.sections.length} sections this term`,
		},
		{
			id: "invites",
			label: "Pending invites",
			value: String(pendingInvites + invitedMembers),
			hint:
				pendingInvites > 0
					? `${pendingInvites} email invite${pendingInvites === 1 ? "" : "s"} outstanding`
					: "Team invites up to date",
		},
		{
			id: "sections",
			label: "Sections",
			value: String(data.sections.filter((section) => section.status === "active").length),
			hint: `${data.classes.length} grade levels · ${data.activeYearLabel}`,
		},
		{
			id: "staff",
			label: "Teachers active",
			value: `${activeTeachers.length}/${data.teachers.length}`,
			hint:
				teachersOnLeave > 0
					? `${teachersOnLeave} on leave today`
					: "Staff directory synced from memberships",
		},
	];

	return {
		stats,
		opsPulse,
		gradeRows,
		enrollmentMonths,
		recentAdmissions,
		admissionSummary: {
			total: data.students.length,
			pending: data.students.filter((student) => student.status === "inactive").length,
			waitlisted: data.students.filter((student) => student.status === "withdrawn").length,
			enrolled: data.students.filter((student) => student.status === "active").length,
		},
		insights: {
			totalStudents: activeStudents.length,
			newThisMonth,
			activeYearLabel: data.activeYearLabel,
			campusCount: data.campuses.length,
			sectionCount: data.sections.length,
			avgPerGrade,
			gradeSpread,
			enrolledThisTerm: gradeRows.reduce((sum, row) => sum + row.students, 0),
			peakGradeLabel: peakGrade?.label ?? "—",
			softestGradeLabel: softestGrade?.label ?? "—",
			updatedAt: new Date().toLocaleTimeString("en-US", {
				hour: "2-digit",
				minute: "2-digit",
			}),
		},
	};
}
