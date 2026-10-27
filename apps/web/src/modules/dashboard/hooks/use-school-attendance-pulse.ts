"use client";

import { useQuery } from "@tanstack/react-query";
import { requireToken } from "@/lib/api/require-token";
import { attendanceService } from "@/modules/attendance/services/attendance.service";
import { useAuth } from "@/modules/auth/context/auth-context";
import { useNow } from "@/lib/use-now";

export function useSchoolDayPulseQuery(tenantId: string | null, enabled = true) {
	const { token } = useAuth();
	const sessionDate = useNow().toISOString().slice(0, 10);

	return useQuery({
		queryKey: ["school-day-pulse", tenantId, sessionDate],
		queryFn: () =>
			attendanceService.getSchoolDayPulse(requireToken(token), tenantId as string, sessionDate),
		enabled: enabled && Boolean(token && tenantId),
		staleTime: 60_000,
	});
}
