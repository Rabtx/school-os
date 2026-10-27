"use client";

import { Spinner } from "@school-os/ui/components/spinner";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { isSchoolLeadershipRole, PermissionCodes, usePermissions } from "@/modules/tenants";
import { AdminDashboard } from "./admin-dashboard";
import { PrincipalHome } from "./principal-home/principal-home";
import { StudentDashboard } from "./student-dashboard";
import { TeacherDashboard } from "./teacher-dashboard";

export function AdminHomePage() {
	const router = useRouter();
	const { role, can, isLoading } = usePermissions();
	const isOpsDashboard = can(PermissionCodes.TENANT_MEMBERSHIP_READ);
	const [redirectFailed, setRedirectFailed] = useState(false);

	useEffect(() => {
		if (isLoading || role !== "parent") return;
		const timeout = window.setTimeout(() => setRedirectFailed(true), 5000);
		router.replace("/admin/my-children");
		return () => window.clearTimeout(timeout);
	}, [isLoading, role, router]);

	if (isLoading) {
		return (
			<div className="flex min-h-[320px] items-center justify-center">
				<Spinner className="size-8" />
			</div>
		);
	}

	if (role === "parent") {
		if (redirectFailed) {
			return (
				<div className="flex min-h-[320px] flex-col items-center justify-center gap-3">
					<p className="text-muted-foreground text-sm">Redirecting…</p>
					<button
						type="button"
						className="text-primary text-sm underline"
						onClick={() => router.replace("/admin/my-children")}
					>
						Go to My Children
					</button>
				</div>
			);
		}
		return (
			<div className="flex min-h-[320px] items-center justify-center">
				<Spinner className="size-8" />
			</div>
		);
	}

	if (role === "student") {
		return <StudentDashboard />;
	}

	if (role === "teacher" && !isOpsDashboard) {
		return <TeacherDashboard />;
	}

	if (isSchoolLeadershipRole(role) || role === "owner" || role === "admin") {
		return <PrincipalHome />;
	}

	return <AdminDashboard enabled={isOpsDashboard} />;
}
