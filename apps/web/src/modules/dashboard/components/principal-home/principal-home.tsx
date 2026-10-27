"use client";

import {
	CheckmarkCircle02Icon,
	Clock01Icon,
	FileEditIcon,
	Message01Icon,
	UserGroupIcon,
} from "@hugeicons/core-free-icons";
import { DatePicker } from "@school-os/ui/components/date-picker";
import { useMemo, useState } from "react";
import { StatCard } from "@/app/admin/_components/dashboard/stat-card";
import { userFirstName } from "@/lib/user-display";
import { useAttendanceOverviewQuery } from "@/modules/attendance/hooks/use-attendance-queries";
import { useAdminNavigationQuery } from "@/modules/navigation";
import { PermissionCodes, usePermissions, useTenantContext } from "@/modules/tenants";
import { useSessionStore } from "@/store";
import { AttendanceOverviewCard } from "./attendance-overview-card";
import { CheckInMethodCard } from "./check-in-method-card";
import { ParentAlertsCard } from "./parent-alerts-card";
import { TodaysCheckInsCard } from "./todays-check-ins-card";

function localIsoDate(date: Date): string {
	const month = String(date.getMonth() + 1).padStart(2, "0");
	const day = String(date.getDate()).padStart(2, "0");
	return `${date.getFullYear()}-${month}-${day}`;
}

const dash = () => "—";
const plain = (value: number) => value.toLocaleString();

/** Principal and owner home, rebuilt to the Figma dashboard frame (`76:54336`). */
export function PrincipalHome() {
	const user = useSessionStore((state) => state.user);
	const { activeTenant, activeCampus } = useTenantContext();
	const { can } = usePermissions();
	const tenantId = activeTenant?.id ?? null;
	const [todayIso] = useState(() => localIsoDate(new Date()));
	const [sessionDate, setSessionDate] = useState(todayIso);
	const canReadAttendance = can(PermissionCodes.ATTENDANCE_READ);

	const navigationQuery = useAdminNavigationQuery(tenantId);
	const overviewQuery = useAttendanceOverviewQuery(tenantId, sessionDate, canReadAttendance);

	const counts = useMemo(() => {
		const items = (navigationQuery.data?.sections ?? []).flatMap((section) => section.items);
		const countOf = (key: string) => items.find((item) => item.key === key)?.count;
		const classes = (navigationQuery.data?.classes ?? []).filter(
			(item) => !activeCampus || item.campusId === activeCampus.id,
		);
		return {
			students: countOf("students"),
			homework: countOf("homework"),
			classes: classes.length,
		};
	}, [activeCampus, navigationQuery.data]);

	const overview = overviewQuery.data;
	const today = overview?.today.summary;
	const attended = today ? today.present + today.late + today.excused : 0;
	const isToday = sessionDate === todayIso;
	const dayWord = isToday ? "today" : "that day";
	const schoolName = activeTenant?.name ?? "your school";

	return (
		<div className="mx-auto flex w-full min-w-0 max-w-[1600px] flex-col gap-4 px-4 py-5 sm:px-6">
			<header className="flex flex-wrap items-end gap-3 tracking-[-0.15px]">
				<div className="min-w-0 flex-1">
					<h1 className="font-medium text-[24px] text-dashboard-text-primary leading-8">
						Welcome back, {user ? userFirstName(user.username) : "there"}
					</h1>
					<p className="text-[14px] text-dashboard-text-dim leading-5">
						Attendance, alerts and homework across {schoolName}
					</p>
				</div>
				<DatePicker
					value={sessionDate}
					onValueChange={(next) => next && setSessionDate(next)}
					align="end"
					className="h-7 w-auto rounded-full border-dashboard-border-strong"
				/>
			</header>

			<section
				aria-label="Today at a glance"
				className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5"
			>
				<StatCard
					label="Students"
					value={counts.students ?? 0}
					formatValue={counts.students === undefined ? dash : plain}
					unavailable={counts.students === undefined}
					detail={`${counts.classes} classes`}
					icon={UserGroupIcon}
				/>
				<StatCard
					label={isToday ? "Attendance today" : "Attendance"}
					value={overview?.today.attendanceRate ?? 0}
					formatValue={
						overview?.today.attendanceRate == null ? dash : (value) => `${value.toFixed(1)}%`
					}
					unavailable={overview?.today.attendanceRate == null}
					detail={today?.total ? `${attended} / ${today.total} marked` : `Not marked ${dayWord}`}
					icon={CheckmarkCircle02Icon}
				/>
				<StatCard
					label={isToday ? "Late today" : "Late"}
					value={today?.late ?? 0}
					formatValue={today ? plain : dash}
					unavailable={!today}
					detail={today?.total ? `of ${today.total} marked` : `Not marked ${dayWord}`}
					icon={Clock01Icon}
				/>
				<StatCard
					label="Parent alerts"
					value={0}
					formatValue={dash}
					unavailable
					detail="WhatsApp not connected"
					icon={Message01Icon}
				/>
				<StatCard
					label="Homework due"
					value={counts.homework ?? 0}
					formatValue={counts.homework === undefined ? dash : plain}
					unavailable={counts.homework === undefined}
					detail="Published, still due"
					icon={FileEditIcon}
				/>
			</section>

			{canReadAttendance ? (
				<>
					<div className="grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-3">
						<AttendanceOverviewCard
							days={overview?.days ?? []}
							sessionDate={sessionDate}
							todayRate={overview?.today.attendanceRate ?? null}
							loading={overviewQuery.isLoading}
						/>
						<div className="flex min-w-0 flex-col gap-4">
							<CheckInMethodCard
								sources={overview?.checkInSources ?? []}
								loading={overviewQuery.isLoading}
							/>
							<ParentAlertsCard />
						</div>
					</div>
					<TodaysCheckInsCard
						checkIns={overview?.checkIns ?? []}
						markedTotal={today?.total ?? 0}
						loading={overviewQuery.isLoading}
					/>
				</>
			) : null}
		</div>
	);
}
