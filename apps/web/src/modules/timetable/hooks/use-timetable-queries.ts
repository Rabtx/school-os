"use client";

import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/modules/auth/context/auth-context";
import { timetableService } from "../services/timetable.service";

export function useMyDayTimetableQuery(tenantId: string | null, date: string, enabled = true) {
	const { token } = useAuth();

	return useQuery({
		queryKey: ["timetable", "me", "day", tenantId, date],
		enabled: enabled && Boolean(token && tenantId),
		queryFn: () => {
			if (!token || !tenantId) throw new Error("Auth required");
			return timetableService.getMyDaySchedule(token, tenantId, date);
		},
	});
}

export function useMyWeekTimetableQuery(tenantId: string | null, date: string, enabled = true) {
	const { token } = useAuth();

	return useQuery({
		queryKey: ["timetable", "me", "week", tenantId, date],
		enabled: enabled && Boolean(token && tenantId),
		queryFn: () => {
			if (!token || !tenantId) throw new Error("Auth required");
			return timetableService.getMyWeekSchedule(token, tenantId, date);
		},
	});
}

export function useSectionWeekTimetableQuery(
	tenantId: string | null,
	sectionId: string | null,
	date: string,
	enabled = true,
) {
	const { token } = useAuth();

	return useQuery({
		queryKey: ["timetable", "section", "week", tenantId, sectionId, date],
		enabled: enabled && Boolean(token && tenantId && sectionId),
		queryFn: () => {
			if (!token || !tenantId || !sectionId) throw new Error("Auth required");
			return timetableService.getSectionWeek(token, tenantId, sectionId, date);
		},
	});
}
