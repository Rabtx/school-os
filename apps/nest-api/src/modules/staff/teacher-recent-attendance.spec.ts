import { describe, expect, it } from 'vitest';

import { summarizeRecentAttendance } from './teacher-recent-attendance';

describe('summarizeRecentAttendance', () => {
	it('gives a rate per marked day, oldest first, and one across the window', () => {
		const result = summarizeRecentAttendance([
			{ sectionId: 's-1', sessionDate: '2026-10-28', status: 'present', count: 9 },
			{ sectionId: 's-1', sessionDate: '2026-10-28', status: 'absent', count: 1 },
			{ sectionId: 's-1', sessionDate: '2026-10-27', status: 'late', count: 4 },
			{ sectionId: 's-1', sessionDate: '2026-10-27', status: 'excused', count: 1 },
			{ sectionId: 's-2', sessionDate: '2026-10-28', status: 'absent', count: 2 },
			{ sectionId: null, sessionDate: '2026-10-28', status: 'present', count: 5 },
		]);

		expect(result.get('s-1')).toEqual({
			rate: 93.3,
			days: [
				{ date: '2026-10-27', rate: 100 },
				{ date: '2026-10-28', rate: 90 },
			],
		});
		expect(result.get('s-2')).toEqual({ rate: 0, days: [{ date: '2026-10-28', rate: 0 }] });
		expect(result.size).toBe(2);
	});
});
