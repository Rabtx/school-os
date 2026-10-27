export type TimetablePeriod = {
	id: string;
	name: string;
	startsAt: string;
	endsAt: string;
	kind: "period" | "break";
	sortOrder: number;
};

export type TimetableClassSlot = {
	type: "class";
	period: TimetablePeriod;
	sectionId: string;
	sectionName: string;
	classId: string;
	subjectId: string | null;
	subjectName: string | null;
	subjectCode: string | null;
	roomName: string | null;
};

export type TimetableBreakSlot = {
	type: "break";
	period: TimetablePeriod;
};

export type TimetableFreeSlot = {
	type: "free";
	period: TimetablePeriod;
};

export type TimetableSlot = TimetableClassSlot | TimetableBreakSlot | TimetableFreeSlot;

export type TeacherDaySchedule = {
	date: string;
	dayOfWeek: number;
	slots: TimetableSlot[];
	classCount: number;
};

export type TeacherWeekSchedule = {
	weekStart: string;
	days: TeacherDaySchedule[];
};

export type SectionLesson = {
	periodId: string;
	subjectId: string | null;
	subjectName: string | null;
	subjectCode: string | null;
	teacherName: string | null;
	roomName: string | null;
};

export type SectionWeek = {
	weekStart: string;
	section: { id: string; name: string; className: string };
	periods: TimetablePeriod[];
	days: Array<{ date: string; dayOfWeek: number; lessons: SectionLesson[] }>;
};
