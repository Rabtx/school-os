import { isQuietTime, localClock, toMinutes, zonedInstant } from '@/modules/rules/attendance-rules';

/** Shifts a YYYY-MM-DD date by whole days. */
function nextDate(isoDate: string): string {
	const date = new Date(`${isoDate}T00:00:00Z`);
	date.setUTCDate(date.getUTCDate() + 1);
	return date.toISOString().slice(0, 10);
}

/**
 * The first moment at or after `instant` outside the school's quiet hours, in its time zone.
 * Quiet hours may cross midnight (22:00 to 07:00).
 */
export function afterQuietHours(
	instant: Date,
	timeZone: string,
	quietHours: { start: string; end: string },
): Date {
	const local = localClock(instant, timeZone);
	if (!isQuietTime(local.minutes, quietHours.start, quietHours.end)) return instant;
	const end = toMinutes(quietHours.end);
	// Late evening in an overnight window: quiet hours end tomorrow morning.
	const endDate = local.minutes >= end ? nextDate(local.date) : local.date;
	return zonedInstant(endDate, end, timeZone);
}
