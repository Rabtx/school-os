import { NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { StaffRepository } from '@/modules/staff/staff.repository';
import type { TenantContext } from '@/modules/tenants/tenant-context.types';
import type { TimetableRepository } from './timetable.repository';
import { TimetableService } from './timetable.service';

const period = (id: string, sortOrder: number, kind: 'period' | 'break' = 'period') => ({
	id,
	tenantId: 'tenant-1',
	name: id,
	startsAt: '08:30:00',
	endsAt: '09:15:00',
	kind,
	sortOrder,
	createdAt: new Date(),
	updatedAt: new Date(),
});

const lesson = (dayOfWeek: number, periodId: string, subjectName: string) => ({
	entry: { dayOfWeek, periodId, roomName: 'Room 12' },
	subject: { id: `subject-${subjectName}`, name: subjectName, code: subjectName.slice(0, 3) },
	teacherName: 'Sana Iqbal',
});

const tenant = (roles: string[]) =>
	({
		tenantId: 'tenant-1',
		membershipId: 'membership-1',
		roles,
		permissions: [],
	}) as unknown as TenantContext;

describe('TimetableService.getSectionWeek', () => {
	let timetable: Record<string, ReturnType<typeof vi.fn>>;
	let staff: { teacherHasSectionAccess: ReturnType<typeof vi.fn> };
	let service: TimetableService;

	beforeEach(() => {
		timetable = {
			findSection: vi.fn().mockResolvedValue({
				section: { id: 'section-1', name: '7-B' },
				className: 'Grade 7',
			}),
			listPeriods: vi.fn().mockResolvedValue([period('P1', 1), period('Break', 2, 'break')]),
			listSectionEntries: vi
				.fn()
				.mockResolvedValue([lesson(1, 'P1', 'Maths'), lesson(4, 'P1', 'Science')]),
		};
		staff = { teacherHasSectionAccess: vi.fn().mockResolvedValue(false) };
		service = new TimetableService(
			timetable as unknown as TimetableRepository,
			staff as unknown as StaffRepository,
		);
	});

	it('returns Monday to Friday with each day its own lessons, for leadership', async () => {
		const week = await service.getSectionWeek(tenant(['principal']), 'section-1', '2026-10-08');

		expect(week.weekStart).toBe('2026-10-05');
		expect(week.days.map((day) => day.date)).toEqual([
			'2026-10-05',
			'2026-10-06',
			'2026-10-07',
			'2026-10-08',
			'2026-10-09',
		]);
		expect(week.days[0]?.lessons.map((item) => item.subjectName)).toEqual(['Maths']);
		expect(week.days[3]?.lessons.map((item) => item.subjectName)).toEqual(['Science']);
		expect(week.periods.map((item) => item.kind)).toEqual(['period', 'break']);
		expect(staff.teacherHasSectionAccess).not.toHaveBeenCalled();
	});

	it('lets a teacher see a class they teach', async () => {
		staff.teacherHasSectionAccess.mockResolvedValue(true);

		await expect(
			service.getSectionWeek(tenant(['teacher']), 'section-1', '2026-10-08'),
		).resolves.toMatchObject({ section: { id: 'section-1' } });
	});

	it('hides classes a teacher does not teach', async () => {
		await expect(
			service.getSectionWeek(tenant(['teacher']), 'section-1', '2026-10-08'),
		).rejects.toBeInstanceOf(NotFoundException);
	});

	it('reports an unknown class as not found', async () => {
		timetable.findSection?.mockResolvedValue(null);

		await expect(
			service.getSectionWeek(tenant(['principal']), 'missing', '2026-10-08'),
		).rejects.toBeInstanceOf(NotFoundException);
	});
});
