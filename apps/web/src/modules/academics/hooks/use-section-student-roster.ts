"use client";

import { useMemo } from "react";
import { useMySectionStudentsQuery } from "@/modules/staff/hooks/use-staff-queries";
import { useSectionEnrollmentsQuery, useStudentsQuery } from "@/modules/students";
import { PermissionCodes, usePermissions } from "@/modules/tenants";

export type SectionStudentOption = {
	id: string;
	name: string;
	code: string;
};

export function useSectionStudentRoster(
	tenantId: string | null,
	sectionId: string | null,
	campusId: string | null,
	enabled = true,
) {
	const { can, role } = usePermissions();
	const isTeacherScoped = role === "teacher" && !can(PermissionCodes.TENANT_MEMBERSHIP_READ);

	const teacherStudentsQuery = useMySectionStudentsQuery(
		tenantId,
		sectionId,
		enabled && isTeacherScoped,
	);
	const enrollmentsQuery = useSectionEnrollmentsQuery(
		tenantId,
		sectionId,
		enabled && !isTeacherScoped,
	);
	const studentsQuery = useStudentsQuery(tenantId, campusId, enabled && !isTeacherScoped);

	const students = useMemo<SectionStudentOption[]>(() => {
		if (isTeacherScoped) {
			return (teacherStudentsQuery.data ?? [])
				.map((row) => ({
					id: row.student.id,
					name: row.student.fullName,
					code: row.student.studentCode,
				}))
				.toSorted((a, b) => a.name.localeCompare(b.name));
		}

		const studentMap = new Map((studentsQuery.data ?? []).map((student) => [student.id, student]));
		return (enrollmentsQuery.data ?? [])
			.filter((enrollment) => enrollment.status === "active")
			.map((enrollment) => studentMap.get(enrollment.studentId))
			.filter((student): student is NonNullable<typeof student> => Boolean(student))
			.map((student) => ({
				id: student.id,
				name: `${student.firstName} ${student.lastName}`.trim(),
				code: student.studentCode,
			}))
			.toSorted((a, b) => a.name.localeCompare(b.name));
	}, [enrollmentsQuery.data, isTeacherScoped, studentsQuery.data, teacherStudentsQuery.data]);

	return {
		students,
		isLoading: isTeacherScoped
			? teacherStudentsQuery.isLoading
			: enrollmentsQuery.isLoading || studentsQuery.isLoading,
	};
}
