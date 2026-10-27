import { apiClient } from "@/lib/api/client";
import type {
	SectionWeek,
	TeacherDaySchedule,
	TeacherWeekSchedule,
} from "../types/timetable.types";

export const timetableService = {
	getMyDaySchedule: (accessToken: string, tenantId: string, date: string) =>
		apiClient.get<TeacherDaySchedule>(
			`/tenants/${tenantId}/timetable/me/day?date=${encodeURIComponent(date)}`,
			{ accessToken },
		),
	getMyWeekSchedule: (accessToken: string, tenantId: string, date: string) =>
		apiClient.get<TeacherWeekSchedule>(
			`/tenants/${tenantId}/timetable/me/week?date=${encodeURIComponent(date)}`,
			{ accessToken },
		),
	getSectionWeek: (accessToken: string, tenantId: string, sectionId: string, date: string) =>
		apiClient.get<SectionWeek>(
			`/tenants/${tenantId}/timetable/sections/${sectionId}/week?date=${encodeURIComponent(date)}`,
			{ accessToken },
		),
};
