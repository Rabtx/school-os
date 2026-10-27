"use client";

import { Spinner } from "@school-os/ui/components/spinner";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { AttendanceReportPage, ReportsPage } from "@/modules/reports";
import { isSchoolLeadershipRole, usePermissions } from "@/modules/tenants";

const loading = (
	<div className="flex min-h-[240px] items-center justify-center">
		<Spinner className="size-6" />
	</div>
);

function Reports() {
	const searchParams = useSearchParams();
	const { role, isLoading } = usePermissions();
	if (isLoading) return loading;

	// Leadership get the school-wide attendance report; teachers keep per-section reports.
	const leadership = isSchoolLeadershipRole(role) || role === "owner" || role === "admin";
	const tab = searchParams.get("tab");
	if (leadership && (tab === "attendance" || !tab)) return <AttendanceReportPage />;
	return <ReportsPage />;
}

export default function Page() {
	return (
		<Suspense fallback={loading}>
			<Reports />
		</Suspense>
	);
}
