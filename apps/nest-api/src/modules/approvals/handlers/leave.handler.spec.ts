import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { AttendanceService } from '@/modules/attendance/attendance.service';
import type { MembershipsService } from '@/modules/memberships/memberships.service';
import type { LeaveContextRepository } from './leave-context.repository';
import { LeaveHandler } from './leave.handler';
import { rangeLabel, schoolDaysBetween } from './school-days';

const NOW = new Date('2026-10-28T09:00:00Z');
const input = {
	studentId: '11111111-1111-4111-8111-111111111111',
	fromDate: '2026-10-30',
	toDate: '2026-11-03',
	reason: 'family' as const,
};

describe('school days', () => {
	it('skips weekends and labels the range', () => {
		expect(schoolDaysBetween('2026-10-30', '2026-11-03')).toEqual([
			'2026-10-30',
			'2026-11-02',
			'2026-11-03',
		]);
		expect(schoolDaysBetween('2026-10-31', '2026-11-01')).toEqual([]);
		expect(rangeLabel('2026-10-12', '2026-10-14')).toBe('Mon 12 to Wed 14 Oct');
		expect(rangeLabel('2026-10-30', '2026-11-03')).toBe('Fri 30 Oct to Tue 3 Nov');
		expect(rangeLabel('2026-10-12', '2026-10-12')).toBe('Mon 12 Oct');
	});
});

describe('LeaveHandler', () => {
	let attendance: Record<string, ReturnType<typeof vi.fn>>;
	let context: Record<string, ReturnType<typeof vi.fn>>;
	let handler: LeaveHandler;

	beforeEach(() => {
		vi.useFakeTimers({ now: NOW, toFake: ['Date'] });
		attendance = {
			findStudentClass: vi.fn(async () => ({
				studentName: 'Ali Raza',
				sectionId: 'section-1',
				sectionName: 'Grade 8-A',
				campusId: 'campus-1',
			})),
			setMarkOnDay: vi.fn(async () => 'absent'),
		};
		context = {
			isGuardianOf: vi.fn(async () => true),
			attendanceSince: vi.fn(async () => ({ marked: 50, attended: 48, excused: 0 })),
			listTestsInRange: vi.fn(async () => []),
		};
		handler = new LeaveHandler(
			attendance as unknown as AttendanceService,
			context as unknown as LeaveContextRepository,
			{
				requireActiveMembership: vi.fn(async () => ({ id: 'parent-m' })),
			} as unknown as MembershipsService,
		);
	});

	afterEach(() => vi.useRealTimers());

	it('snapshots the class, school days and context, and expires after the last day', async () => {
		const prepared = await handler.prepare({ userId: 'u', tenantId: 't' }, input);
		expect(prepared.payload.days).toHaveLength(3);
		expect(prepared.risk).toBe('low');
		expect(prepared.expiresAt?.toISOString()).toBe('2026-11-04T00:00:00.000Z');
		const card = handler.describe(prepared.payload);
		expect(card.title).toBe('Leave for Ali Raza');
		expect(card.subtitle).toBe('Grade 8-A · Fri 30 Oct to Tue 3 Nov · 3 days');
		expect(card.facts[0]).toEqual({ label: 'Attendance', value: '96% recently, no leave before' });
	});

	it('flags leave over a test as worth a look', async () => {
		context.listTestsInRange.mockResolvedValue([
			{ title: 'Mid-term', subject: 'English', on: '2026-11-02' },
		]);
		const prepared = await handler.prepare({ userId: 'u', tenantId: 't' }, input);
		expect(prepared.risk).toBe('medium');
		expect(handler.describe(prepared.payload).facts[1]?.value).toBe('English: Mid-term');
	});

	it('only lets a guardian of the child ask', async () => {
		context.isGuardianOf.mockResolvedValue(false);
		await expect(handler.prepare({ userId: 'u', tenantId: 't' }, input)).rejects.toMatchObject({
			response: { code: 'LEAVE_NOT_GUARDIAN' },
		});
	});

	it('refuses weekends only, old days and long leave', async () => {
		await expect(
			handler.prepare(
				{ userId: 'u', tenantId: 't' },
				{ ...input, fromDate: '2026-10-31', toDate: '2026-11-01' },
			),
		).rejects.toMatchObject({ response: { code: 'LEAVE_NO_SCHOOL_DAYS' } });
		await expect(
			handler.prepare({ userId: 'u', tenantId: 't' }, { ...input, fromDate: '2026-10-01' }),
		).rejects.toMatchObject({ response: { code: 'LEAVE_TOO_LATE' } });
		await expect(
			handler.prepare({ userId: 'u', tenantId: 't' }, { ...input, toDate: '2026-11-30' }),
		).rejects.toMatchObject({ response: { code: 'LEAVE_TOO_LONG' } });
	});

	it('excuses each day as the approver and undoes to the marks it replaced', async () => {
		const prepared = await handler.prepare({ userId: 'u', tenantId: 't' }, input);
		const effect = await handler.apply({ tenantId: 't', approver: { id: 'p' } }, prepared.payload);
		expect(attendance.setMarkOnDay).toHaveBeenCalledTimes(3);
		expect(attendance.setMarkOnDay).toHaveBeenCalledWith(
			expect.objectContaining({
				sessionDate: '2026-11-02',
				status: 'excused',
				approverMembershipId: 'p',
			}),
		);
		expect(effect.facts[0]).toEqual({ label: 'Attendance', value: '3 days marked excused' });
		attendance.setMarkOnDay.mockClear();
		await handler.undo({ tenantId: 't', approver: { id: 'p' } }, prepared.payload, effect.undo);
		expect(attendance.setMarkOnDay).toHaveBeenCalledTimes(3);
		expect(attendance.setMarkOnDay).toHaveBeenLastCalledWith(
			expect.objectContaining({ sessionDate: '2026-11-03', status: 'absent' }),
		);
	});

	it('clears marks on undo where the leave created them', async () => {
		attendance.setMarkOnDay.mockResolvedValue(null);
		const prepared = await handler.prepare({ userId: 'u', tenantId: 't' }, input);
		const effect = await handler.apply({ tenantId: 't', approver: { id: 'p' } }, prepared.payload);
		attendance.setMarkOnDay.mockClear();
		await handler.undo({ tenantId: 't', approver: { id: 'p' } }, prepared.payload, effect.undo);
		expect(attendance.setMarkOnDay).toHaveBeenCalledWith(expect.objectContaining({ status: null }));
	});
});
