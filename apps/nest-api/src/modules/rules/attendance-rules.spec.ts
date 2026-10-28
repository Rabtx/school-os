import { describe, expect, it } from 'vitest';

import { attendancePolicySchema, defaultAttendancePolicy } from './attendance-policy';
import {
	absenceAlertAt,
	canTeacherChangeMarks,
	classifyScan,
	fromMinutes,
	isAutoAbsentDue,
	isQuietTime,
	isRollCallOpen,
	lateFromMinutes,
	localClock,
	teacherEditDeadline,
	toMinutes,
	zonedInstant,
} from './attendance-rules';

const policy = defaultAttendancePolicy();
const KARACHI = 'Asia/Karachi'; // UTC+5, no daylight saving

describe('attendance policy schema', () => {
	it('accepts the defaults', () => {
		expect(attendancePolicySchema.safeParse(policy).success).toBe(true);
	});

	it('rejects a late time after roll call closes and auto-absent before it', () => {
		const result = attendancePolicySchema.safeParse({
			...policy,
			lateAfter: '09:10',
			autoMarkAbsent: { enabled: true, at: '08:45' },
		});
		expect(result.success).toBe(false);
		expect(result.error?.issues.map((issue) => issue.path.join('.'))).toEqual([
			'lateAfter',
			'autoMarkAbsent.at',
		]);
	});

	it('rejects bad clock times, edit windows and unknown keys', () => {
		expect(attendancePolicySchema.safeParse({ ...policy, rollCallClosesAt: '9:00' }).success).toBe(
			false,
		);
		expect(attendancePolicySchema.safeParse({ ...policy, teacherEditWindowHours: 5 }).success).toBe(
			false,
		);
		expect(attendancePolicySchema.safeParse({ ...policy, extra: true }).success).toBe(false);
	});
});

describe('clock helpers', () => {
	it('converts both ways and wraps past midnight', () => {
		expect(toMinutes('08:15')).toBe(495);
		expect(fromMinutes(495)).toBe('08:15');
		expect(fromMinutes(1440 + 30)).toBe('00:30');
	});

	it('maps school-local times to instants and back', () => {
		const instant = zonedInstant('2026-10-28', toMinutes('09:00'), KARACHI);
		expect(instant.toISOString()).toBe('2026-10-28T04:00:00.000Z');
		expect(localClock(instant, KARACHI)).toEqual({ date: '2026-10-28', minutes: 540 });
	});
});

describe('marking rules', () => {
	it('is late only after the bell plus the grace period', () => {
		expect(lateFromMinutes(policy)).toBe(toMinutes('08:30'));
		expect(classifyScan(policy, toMinutes('08:30'))).toBe('present');
		expect(classifyScan(policy, toMinutes('08:31'))).toBe('late');
	});

	it('leaves the mark to the teacher when scans do not mark, and never late when that is off', () => {
		expect(
			classifyScan(
				{ ...policy, gate: { scanMarksPresent: false, scanAfterBellIsLate: true } },
				600,
			),
		).toBeNull();
		expect(
			classifyScan(
				{ ...policy, gate: { scanMarksPresent: true, scanAfterBellIsLate: false } },
				toMinutes('10:00'),
			),
		).toBe('present');
	});

	it('closes roll call and marks absent on time', () => {
		expect(isRollCallOpen(policy, toMinutes('08:59'))).toBe(true);
		expect(isRollCallOpen(policy, toMinutes('09:00'))).toBe(false);
		expect(isAutoAbsentDue(policy, toMinutes('09:29'))).toBe(false);
		expect(isAutoAbsentDue(policy, toMinutes('09:30'))).toBe(true);
		expect(
			isAutoAbsentDue({ ...policy, autoMarkAbsent: { enabled: false, at: '09:30' } }, 900),
		).toBe(false);
	});
});

describe('teacher edit window', () => {
	it('runs from roll call close for the window, in the school time zone', () => {
		expect(teacherEditDeadline(policy, '2026-10-28', KARACHI)?.toISOString()).toBe(
			'2026-10-29T04:00:00.000Z',
		);
		expect(
			canTeacherChangeMarks(policy, '2026-10-28', new Date('2026-10-29T03:59:00Z'), KARACHI),
		).toBe(true);
		expect(
			canTeacherChangeMarks(policy, '2026-10-28', new Date('2026-10-29T04:01:00Z'), KARACHI),
		).toBe(false);
	});

	it('never closes without a limit', () => {
		const open = { ...policy, teacherEditWindowHours: null };
		expect(teacherEditDeadline(open, '2026-01-01', KARACHI)).toBeNull();
		expect(
			canTeacherChangeMarks(open, '2026-01-01', new Date('2027-01-01T00:00:00Z'), KARACHI),
		).toBe(true);
	});
});

describe('absence alerts', () => {
	const quiet = { start: '22:00', end: '07:00' };

	it('sends after roll call closes plus the delay', () => {
		expect(absenceAlertAt(policy, '2026-10-28', KARACHI, quiet)?.toISOString()).toBe(
			'2026-10-28T04:15:00.000Z',
		);
	});

	it('waits for quiet hours to end, overnight included', () => {
		const late = {
			...policy,
			rollCallClosesAt: '21:30',
			lateAfter: '21:00',
			autoMarkAbsent: { enabled: false, at: '21:30' },
		};
		// 21:30 + 45 min = 22:15 local, inside quiet hours, so 07:00 local the next morning.
		expect(
			absenceAlertAt(
				{ ...late, absenceAlert: { enabled: true, delayMinutes: 45 } },
				'2026-10-28',
				KARACHI,
				quiet,
			)?.toISOString(),
		).toBe('2026-10-29T02:00:00.000Z');
		// Quiet hours in the morning push to their end the same day.
		expect(
			absenceAlertAt(policy, '2026-10-28', KARACHI, {
				start: '08:00',
				end: '10:00',
			})?.toISOString(),
		).toBe('2026-10-28T05:00:00.000Z');
	});

	it('is off when alerts are off', () => {
		expect(
			absenceAlertAt(
				{ ...policy, absenceAlert: { enabled: false, delayMinutes: 0 } },
				'2026-10-28',
				KARACHI,
				quiet,
			),
		).toBeNull();
	});

	it('reads quiet hours that run overnight', () => {
		expect(isQuietTime(toMinutes('23:00'), '22:00', '07:00')).toBe(true);
		expect(isQuietTime(toMinutes('06:59'), '22:00', '07:00')).toBe(true);
		expect(isQuietTime(toMinutes('07:00'), '22:00', '07:00')).toBe(false);
		expect(isQuietTime(toMinutes('12:00'), '12:00', '12:00')).toBe(false);
	});
});
