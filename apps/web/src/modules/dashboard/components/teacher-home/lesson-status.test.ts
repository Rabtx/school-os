import { describe, expect, it } from "vitest";
import type { TimetableClassSlot } from "@/modules/timetable";
import { lessonStatuses, shortTime, timeUntil } from "./lesson-status";

function slot(startsAt: string, endsAt: string): TimetableClassSlot {
	return {
		type: "class",
		period: { id: startsAt, name: startsAt, startsAt, endsAt, kind: "period", sortOrder: 0 },
		sectionId: "s",
		sectionName: "7-B",
		classId: "c",
		subjectId: null,
		subjectName: "Maths",
		subjectCode: null,
		roomName: null,
	};
}

describe("lessonStatuses", () => {
	it("marks past lessons taught, the current one now, the first upcoming next", () => {
		const slots = [
			slot("08:00", "08:45"),
			slot("09:00", "09:45"),
			slot("10:00", "10:45"),
			slot("11:00", "11:45"),
		];
		expect(lessonStatuses(slots, new Date(2026, 9, 28, 9, 10))).toEqual([
			"taught",
			"now",
			"next",
			"later",
		]);
	});

	it("has no next once the day is over", () => {
		expect(lessonStatuses([slot("08:00", "08:45")], new Date(2026, 9, 28, 15, 0))).toEqual([
			"taught",
		]);
	});
});

describe("timeUntil and shortTime", () => {
	it("counts hours and minutes until a later time", () => {
		expect(timeUntil("10:00", new Date(2026, 9, 28, 8, 42))).toBe("in 1h 18m");
		expect(timeUntil("10:00", new Date(2026, 9, 28, 9, 35))).toBe("in 25m");
	});

	it("shows a 12-hour clock without the period", () => {
		expect(shortTime("13:05")).toBe("1:05");
		expect(shortTime("08:30")).toBe("8:30");
	});
});
