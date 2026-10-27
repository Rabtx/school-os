import type { AttendanceMarkRecord } from '@/database/schema';

const CONSECUTIVE_ABSENCE_THRESHOLD = 3;

export type ConsecutiveAbsenceRow = {
	studentId: string;
	studentName: string;
	sectionId: string;
	sectionLabel: string;
	consecutiveDays: number;
};

type HistoryRow = {
	studentId: string;
	status: AttendanceMarkRecord['status'];
	sessionDate: string;
	sectionId: string;
	sectionName: string;
	className: string;
	firstName: string;
	lastName: string;
};

export function subtractWeekdays(endDate: string, weekdayCount: number): string {
	const cursor = new Date(`${endDate}T12:00:00`);
	let remaining = weekdayCount;

	while (remaining > 0) {
		cursor.setDate(cursor.getDate() - 1);
		const day = cursor.getDay();
		if (day === 0 || day === 6) continue;
		remaining -= 1;
	}

	return cursor.toLocaleDateString('en-CA');
}

export function findConsecutiveAbsenceAlerts(rows: HistoryRow[]): ConsecutiveAbsenceRow[] {
	const byStudent = new Map<string, HistoryRow[]>();

	for (const row of rows) {
		const bucket = byStudent.get(row.studentId) ?? [];
		bucket.push(row);
		byStudent.set(row.studentId, bucket);
	}

	const alerts: ConsecutiveAbsenceRow[] = [];

	for (const [studentId, studentRows] of byStudent) {
		const byDate = new Map<string, HistoryRow>();
		for (const row of studentRows) {
			if (!byDate.has(row.sessionDate)) {
				byDate.set(row.sessionDate, row);
			}
		}

		const sortedDates = [...byDate.keys()].toSorted((a, b) => b.localeCompare(a));
		let streak = 0;
		let anchor: HistoryRow | null = null;

		for (const date of sortedDates) {
			const row = byDate.get(date);
			if (!row) continue;
			if (row.status === 'absent') {
				streak += 1;
				anchor ??= row;
				continue;
			}
			break;
		}

		if (streak >= CONSECUTIVE_ABSENCE_THRESHOLD && anchor) {
			alerts.push({
				studentId,
				studentName: `${anchor.firstName} ${anchor.lastName}`.trim(),
				sectionId: anchor.sectionId,
				sectionLabel: `${anchor.className} ${anchor.sectionName}`.trim(),
				consecutiveDays: streak,
			});
		}
	}

	return alerts.toSorted((a, b) => b.consecutiveDays - a.consecutiveDays);
}
