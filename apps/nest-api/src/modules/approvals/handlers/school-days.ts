/** Shifts a YYYY-MM-DD date by whole days, in UTC so the date never moves. */
export function shiftDate(isoDate: string, days: number): string {
	const date = new Date(`${isoDate}T00:00:00Z`);
	date.setUTCDate(date.getUTCDate() + days);
	return date.toISOString().slice(0, 10);
}

/** Monday to Friday between two dates, inclusive. Schools here do not open at weekends. */
export function schoolDaysBetween(fromDate: string, toDate: string): string[] {
	const days: string[] = [];
	for (let day = fromDate; day <= toDate; day = shiftDate(day, 1)) {
		const weekday = new Date(`${day}T00:00:00Z`).getUTCDay();
		if (weekday !== 0 && weekday !== 6) days.push(day);
	}
	return days;
}

function dayLabel(isoDate: string, withMonth: boolean): string {
	return new Date(`${isoDate}T00:00:00Z`).toLocaleDateString('en-GB', {
		weekday: 'short',
		day: 'numeric',
		...(withMonth ? { month: 'short' } : {}),
		timeZone: 'UTC',
	});
}

/** "Mon 12 to Wed 14 Oct", or "Mon 12 Oct" for one day. */
export function rangeLabel(fromDate: string, toDate: string): string {
	if (fromDate === toDate) return dayLabel(fromDate, true);
	const sameMonth = fromDate.slice(0, 7) === toDate.slice(0, 7);
	return `${dayLabel(fromDate, !sameMonth)} to ${dayLabel(toDate, true)}`;
}
