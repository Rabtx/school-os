"use client";

import { Spinner } from "@school-os/ui/components/spinner";
import { Suspense } from "react";
import { ClassTimetablePage, TeacherTimetablePage } from "@/modules/timetable";
import { isSchoolLeadershipRole, usePermissions } from "@/modules/tenants";

export default function TimetablePage() {
	const { role, isLoading } = usePermissions();

	if (isLoading) {
		return (
			<div className="flex min-h-[240px] items-center justify-center">
				<Spinner className="size-6" />
			</div>
		);
	}

	// Leadership read class timetables; teachers keep their own week.
	const leadership = isSchoolLeadershipRole(role) || role === "owner" || role === "admin";
	return (
		<Suspense fallback={null}>
			{leadership ? <ClassTimetablePage /> : <TeacherTimetablePage />}
		</Suspense>
	);
}
