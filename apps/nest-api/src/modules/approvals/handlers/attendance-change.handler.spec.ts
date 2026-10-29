import { BadRequestException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { AttendanceService } from '@/modules/attendance/attendance.service';
import { AttendanceChangeHandler, dayLabel } from './attendance-change.handler';

const input = { sessionId: 'session-1', studentId: 'student-1', status: 'present' as const };
const found = {
	membership: { id: 'teacher-m' },
	sessionDate: '2026-10-26',
	sectionId: 'section-1',
	sectionName: 'Grade 1-A',
	studentName: 'Ali Raza',
	previousStatus: 'absent' as const,
	canEditNow: false,
};

describe('AttendanceChangeHandler', () => {
	let attendance: Record<string, ReturnType<typeof vi.fn>>;
	let handler: AttendanceChangeHandler;

	beforeEach(() => {
		attendance = {
			prepareChangeRequest: vi.fn(async () => found),
			applyApprovedChange: vi.fn(async () => 'absent'),
		};
		handler = new AttendanceChangeHandler(attendance as unknown as AttendanceService);
	});

	it('reads the day in UTC', () => {
		expect(dayLabel('2026-10-26')).toBe('Mon 26 Oct');
	});

	it('snapshots the card and keys one request per student per day', async () => {
		const prepared = await handler.prepare({ userId: 'u', tenantId: 't' }, input);
		expect(prepared.dedupeKey).toBe('attendance:session-1:student-1');
		expect(prepared.payload).toMatchObject({ studentName: 'Ali Raza', previousStatus: 'absent' });
		expect(prepared.expiresAt?.getTime()).toBeGreaterThan(Date.now());
		expect(handler.describe(prepared.payload).title).toBe('Mark Ali Raza present');
	});

	it('sends the teacher back to the roll call while they can still edit', async () => {
		attendance.prepareChangeRequest.mockResolvedValue({ ...found, canEditNow: true });
		await expect(handler.prepare({ userId: 'u', tenantId: 't' }, input)).rejects.toBeInstanceOf(
			BadRequestException,
		);
	});

	it('refuses a change to the mark already there', async () => {
		attendance.prepareChangeRequest.mockResolvedValue({ ...found, previousStatus: 'present' });
		await expect(handler.prepare({ userId: 'u', tenantId: 't' }, input)).rejects.toMatchObject({
			response: { code: 'APPROVAL_NO_CHANGE' },
		});
	});

	it('applies as the approver and undoes to the mark it replaced', async () => {
		const prepared = await handler.prepare({ userId: 'u', tenantId: 't' }, input);
		const effect = await handler.apply({ tenantId: 't', approver: { id: 'p' } }, prepared.payload);
		expect(attendance.applyApprovedChange).toHaveBeenCalledWith(
			expect.objectContaining({ status: 'present', approverMembershipId: 'p' }),
		);
		expect(effect.facts[0]).toEqual({ label: 'Attendance', value: 'Absent → Present' });
		await handler.undo({ tenantId: 't', approver: { id: 'p' } }, prepared.payload, effect.undo);
		expect(attendance.applyApprovedChange).toHaveBeenLastCalledWith(
			expect.objectContaining({ status: 'absent' }),
		);
	});

	it('clears the mark on undo when there was none before', async () => {
		attendance.applyApprovedChange.mockResolvedValue(null);
		const prepared = await handler.prepare({ userId: 'u', tenantId: 't' }, input);
		const effect = await handler.apply({ tenantId: 't', approver: { id: 'p' } }, prepared.payload);
		expect(effect.facts[0]?.value).toBe('Not marked → Present');
		await handler.undo({ tenantId: 't', approver: { id: 'p' } }, prepared.payload, effect.undo);
		expect(attendance.applyApprovedChange).toHaveBeenLastCalledWith(
			expect.objectContaining({ status: null }),
		);
	});
});
