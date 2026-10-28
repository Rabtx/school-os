"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { useAuth } from "@/modules/auth/context/auth-context";
import { useMyTeacherProfileQuery } from "@/modules/staff/hooks/use-staff-queries";
import { staffService } from "@/modules/staff/services/staff.service";
import { PermissionCodes, usePermissions } from "@/modules/tenants";

export type SectionSubjectOption = {
	label: string;
	value: string;
	sectionId: string;
	sectionName: string;
	subjectId: string;
	subjectName: string;
};

export function useSectionSubjectOptions(tenantId: string | null, campusId?: string | null) {
	const { token } = useAuth();
	const { can, role } = usePermissions();
	const isTeacherScoped = role === "teacher" && !can(PermissionCodes.TENANT_MEMBERSHIP_READ);

	const myProfileQuery = useMyTeacherProfileQuery(tenantId, Boolean(tenantId && isTeacherScoped));

	const adminQuery = useQuery({
		queryKey: ["section-subjects", tenantId, campusId ?? "all"],
		queryFn: () => {
			if (!tenantId || !token) throw new Error("Tenant required");
			return staffService
				.listSectionSubjects(token, tenantId, campusId ?? undefined)
				.then((response) => response.sectionSubjects);
		},
		enabled: Boolean(token && tenantId && !isTeacherScoped),
	});

	const options = useMemo<SectionSubjectOption[]>(() => {
		if (isTeacherScoped) {
			return (myProfileQuery.data?.subjectAssignments ?? []).map((assignment) => ({
				label: `${assignment.sectionName} · ${assignment.subjectName}`,
				value: assignment.id,
				sectionId: assignment.sectionId,
				sectionName: assignment.sectionName,
				subjectId: assignment.subjectId,
				subjectName: assignment.subjectName,
			}));
		}

		return (adminQuery.data ?? []).map((item) => ({
			label: `${item.sectionName} · ${item.subjectName}`,
			value: item.id,
			sectionId: item.sectionId,
			sectionName: item.sectionName,
			subjectId: item.subjectId,
			subjectName: item.subjectName,
		}));
	}, [adminQuery.data, isTeacherScoped, myProfileQuery.data?.subjectAssignments]);

	return {
		options,
		isLoading: isTeacherScoped ? myProfileQuery.isLoading : adminQuery.isLoading,
	};
}
