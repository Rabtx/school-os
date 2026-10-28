import type { AttendancePolicy } from './attendance-policy';

/** Minutes since local midnight for "HH:MM". */
export function toMinutes(time: string): number {
	const [hours = 0, minutes = 0] = time.split(':').map(Number);
	return hours * 60 + minutes;
}

export function fromMinutes(total: number): string {
	const wrapped = ((total % 1440) + 1440) % 1440;
	return `${String(Math.floor(wrapped / 60)).padStart(2, '0')}:${String(wrapped % 60).padStart(2, '0')}`;
}

/** The school-local date ("YYYY-MM-DD") and minutes since midnight for an instant. */
export function localClock(instant: Date, timeZone: string): { date: string; minutes: number } {
	const parts = new Intl.DateTimeFormat('en-CA', {
		timeZone,
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
		hour: '2-digit',
		minute: '2-digit',
		hourCycle: 'h23',
	}).formatToParts(instant);
	const part = (type: string) => parts.find((item) => item.type === type)?.value ?? '00';
	return {
		date: `${part('year')}-${part('month')}-${part('day')}`,
		minutes: Number(part('hour')) * 60 + Number(part('minute')),
	};
}

/** The instant a school-local date and time happens, in a time zone with no daylight saving gap. */
export function zonedInstant(date: string, minutes: number, timeZone: string): Date {
	const guess = new Date(`${date}T${fromMinutes(minutes)}:00Z`);
	const seen = localClock(guess, timeZone);
	const seenUtc = new Date(`${seen.date}T${fromMinutes(seen.minutes)}:00Z`).getTime();
	return new Date(guess.getTime() - (seenUtc - guess.getTime()));
}

/** Arrivals after this count as late: the bell plus the grace period. */
export function lateFromMinutes(policy: AttendancePolicy): number {
	return toMinutes(policy.lateAfter) + policy.graceMinutes;
}

export type ScanOutcome = 'present' | 'late' | null;

/** What a gate scan at a local time does to the student's mark; null leaves it for the teacher. */
export function classifyScan(policy: AttendancePolicy, scanMinutes: number): ScanOutcome {
	if (!policy.gate.scanMarksPresent) return null;
	if (policy.gate.scanAfterBellIsLate && scanMinutes > lateFromMinutes(policy)) return 'late';
	return 'present';
}

export function isRollCallOpen(policy: AttendancePolicy, nowMinutes: number): boolean {
	return nowMinutes < toMinutes(policy.rollCallClosesAt);
}

/** Whether students still unmarked should now be marked absent. */
export function isAutoAbsentDue(policy: AttendancePolicy, nowMinutes: number): boolean {
	return policy.autoMarkAbsent.enabled && nowMinutes >= toMinutes(policy.autoMarkAbsent.at);
}

/** The last moment a teacher may change a day's marks; null when there is no limit. */
export function teacherEditDeadline(
	policy: AttendancePolicy,
	sessionDate: string,
	timeZone: string,
): Date | null {
	if (policy.teacherEditWindowHours === null) return null;
	const closes = zonedInstant(sessionDate, toMinutes(policy.rollCallClosesAt), timeZone);
	return new Date(closes.getTime() + policy.teacherEditWindowHours * 3_600_000);
}

export function canTeacherChangeMarks(
	policy: AttendancePolicy,
	sessionDate: string,
	now: Date,
	timeZone: string,
): boolean {
	const deadline = teacherEditDeadline(policy, sessionDate, timeZone);
	return deadline === null || now.getTime() <= deadline.getTime();
}

/** Quiet hours may run overnight (22:00–07:00); the end is exclusive. */
export function isQuietTime(minutes: number, start: string, end: string): boolean {
	const from = toMinutes(start);
	const to = toMinutes(end);
	if (from === to) return false;
	return from < to ? minutes >= from && minutes < to : minutes >= from || minutes < to;
}

/**
 * When the guardian of a student absent on `sessionDate` is told: roll call close plus the delay,
 * moved to the end of quiet hours when it would land inside them. Null when alerts are off.
 */
export function absenceAlertAt(
	policy: AttendancePolicy,
	sessionDate: string,
	timeZone: string,
	quietHours: { start: string; end: string },
): Date | null {
	if (!policy.absenceAlert.enabled) return null;
	const sendMinutes = toMinutes(policy.rollCallClosesAt) + policy.absenceAlert.delayMinutes;
	const planned = zonedInstant(sessionDate, sendMinutes, timeZone);
	const local = localClock(planned, timeZone);
	if (!isQuietTime(local.minutes, quietHours.start, quietHours.end)) return planned;

	const endMinutes = toMinutes(quietHours.end);
	// Quiet hours that started this evening end tomorrow morning.
	const endDate = local.minutes >= endMinutes ? nextDate(local.date) : local.date;
	return zonedInstant(endDate, endMinutes, timeZone);
}

function nextDate(date: string): string {
	const next = new Date(`${date}T00:00:00Z`);
	next.setUTCDate(next.getUTCDate() + 1);
	return next.toISOString().slice(0, 10);
}
