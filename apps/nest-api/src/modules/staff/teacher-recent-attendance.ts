export const RECENT_ATTENDANCE_DAYS = 10;

function toRate(attended: number, marked: number): number {
	return Math.round((attended / marked) * 1000) / 10;
}

/** Per section: a rate per marked day (oldest first) and across the whole window. */
export function summarizeRecentAttendance(
	rows: ReadonlyArray<{
		sectionId: string | null;
		sessionDate: string;
		status: string;
		count: number;
	}>,
) {
	const totals = new Map<string, Map<string, { attended: number; marked: number }>>();
	for (const row of rows) {
		if (!row.sectionId) continue;
		const byDate = totals.get(row.sectionId) ?? new Map();
		const day = byDate.get(row.sessionDate) ?? { attended: 0, marked: 0 };
		day.marked += row.count;
		if (row.status === 'present' || row.status === 'late' || row.status === 'excused') {
			day.attended += row.count;
		}
		byDate.set(row.sessionDate, day);
		totals.set(row.sectionId, byDate);
	}
	const result = new Map<string, { rate: number | null; days: { date: string; rate: number }[] }>();
	for (const [sectionId, byDate] of totals) {
		const days = [...byDate.entries()]
			.filter(([, day]) => day.marked > 0)
			.toSorted(([a], [b]) => a.localeCompare(b))
			.map(([date, day]) => ({ date, rate: toRate(day.attended, day.marked) }));
		const sum = [...byDate.values()].reduce(
			(acc, day) => ({ attended: acc.attended + day.attended, marked: acc.marked + day.marked }),
			{ attended: 0, marked: 0 },
		);
		result.set(sectionId, { rate: sum.marked > 0 ? toRate(sum.attended, sum.marked) : null, days });
	}
	return result;
}
