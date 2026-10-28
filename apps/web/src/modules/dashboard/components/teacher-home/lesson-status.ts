import type { TimetableClassSlot } from "@/modules/timetable";

export type LessonStatus = "taught" | "now" | "next" | "later";

function minutesOf(time: string): number {
	const [hours = "0", minutes = "0"] = time.split(":");
	return Number(hours) * 60 + Number(minutes);
}

/** Where each of today's lessons stands against the clock: taught, now, next or later. */
export function lessonStatuses(slots: TimetableClassSlot[], now: Date): LessonStatus[] {
	const current = now.getHours() * 60 + now.getMinutes();
	let nextAssigned = false;
	return slots.map((slot) => {
		const start = minutesOf(slot.period.startsAt);
		const end = minutesOf(slot.period.endsAt);
		if (current >= end) return "taught";
		if (current >= start) return "now";
		if (!nextAssigned) {
			nextAssigned = true;
			return "next";
		}
		return "later";
	});
}

/** "in 1h 18m", "in 25m" until a HH:MM later today. */
export function timeUntil(time: string, now: Date): string {
	const minutes = minutesOf(time) - (now.getHours() * 60 + now.getMinutes());
	if (minutes <= 0) return "now";
	const hours = Math.floor(minutes / 60);
	return hours > 0 ? `in ${hours}h ${minutes % 60}m` : `in ${minutes}m`;
}

export function shortTime(time: string): string {
	const [hours = "0", minutes = "00"] = time.split(":");
	const hour = Number(hours);
	return `${hour % 12 === 0 ? 12 : hour % 12}:${minutes}`;
}
