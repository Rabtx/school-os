import { Injectable, NotFoundException } from '@nestjs/common';

import type { TimetablePeriodRecord } from '@/database/schema';
import { hasManagementRole } from '@/modules/memberships/membership-roles';
import { StaffRepository } from '@/modules/staff/staff.repository';
import type { TenantContext } from '@/modules/tenants/tenant-context.types';
import { TimetableRepository } from './timetable.repository';
import type {
	PublicSectionWeek,
	PublicTeacherDaySchedule,
	PublicTeacherWeekSchedule,
	PublicTimetablePeriod,
	PublicTimetableSlot,
} from './timetable.types';
import {
	addDaysToDate,
	formatTimeValue,
	isoDayOfWeekFromDate,
	startOfIsoWeek,
} from './timetable.utils';

@Injectable()
export class TimetableService {
	constructor(
		private readonly timetable: TimetableRepository,
		private readonly staff: StaffRepository,
	) {}

	/**
	 * A class's timetable for the ISO week containing `date`. Leadership see any class; teachers
	 * see classes they teach or are homeroom for. Anything else reads as not found.
	 */
	async getSectionWeek(
		tenant: TenantContext,
		sectionId: string,
		date: string,
	): Promise<PublicSectionWeek> {
		const section = await this.timetable.findSection(tenant.tenantId, sectionId);
		const allowed =
			section &&
			(hasManagementRole([...tenant.roles]) ||
				(await this.staff.teacherHasSectionAccess(
					tenant.tenantId,
					tenant.membershipId,
					sectionId,
				)));
		if (!section || !allowed) {
			throw new NotFoundException({
				code: 'SECTION_TIMETABLE_NOT_FOUND',
				message: 'Timetable not found for this class',
			});
		}

		const [periods, entries] = await Promise.all([
			this.timetable.listPeriods(tenant.tenantId),
			this.timetable.listSectionEntries(tenant.tenantId, sectionId),
		]);
		const weekStart = startOfIsoWeek(date);

		return {
			weekStart,
			section: {
				id: section.section.id,
				name: section.section.name,
				className: section.className,
			},
			periods: periods.map(toPublicPeriod),
			days: Array.from({ length: 5 }, (_, offset) => {
				const dayDate = addDaysToDate(weekStart, offset);
				const dayOfWeek = isoDayOfWeekFromDate(dayDate);
				return {
					date: dayDate,
					dayOfWeek,
					lessons: entries
						.filter((row) => row.entry.dayOfWeek === dayOfWeek)
						.map((row) => ({
							periodId: row.entry.periodId,
							subjectId: row.subject?.id ?? null,
							subjectName: row.subject?.name ?? null,
							subjectCode: row.subject?.code ?? null,
							teacherName: row.teacherName,
							roomName: row.entry.roomName,
						})),
				};
			}),
		};
	}

	async getMyDaySchedule(tenant: TenantContext, date: string): Promise<PublicTeacherDaySchedule> {
		this.requireTeacher(tenant);
		return this.buildDaySchedule(tenant.tenantId, tenant.membershipId, date);
	}

	async getMyWeekSchedule(tenant: TenantContext, date: string): Promise<PublicTeacherWeekSchedule> {
		this.requireTeacher(tenant);
		const weekStart = startOfIsoWeek(date);
		const days: PublicTeacherDaySchedule[] = await Promise.all(
			Array.from({ length: 5 }, (_, offset) =>
				this.buildDaySchedule(
					tenant.tenantId,
					tenant.membershipId,
					addDaysToDate(weekStart, offset),
				),
			),
		);

		return { weekStart, days };
	}

	private async buildDaySchedule(
		tenantId: string,
		teacherMembershipId: string,
		date: string,
	): Promise<PublicTeacherDaySchedule> {
		const dayOfWeek = isoDayOfWeekFromDate(date);
		const [periods, entries] = await Promise.all([
			this.timetable.listPeriods(tenantId),
			this.timetable.listTeacherEntriesForDay(tenantId, teacherMembershipId, dayOfWeek),
		]);

		const entryByPeriodId = new Map(entries.map((row) => [row.period.id, row]));
		const slots: PublicTimetableSlot[] = periods.map((period) => {
			const publicPeriod = toPublicPeriod(period);
			if (period.kind === 'break') {
				return { type: 'break', period: publicPeriod };
			}

			const entry = entryByPeriodId.get(period.id);
			if (!entry) {
				return { type: 'free', period: publicPeriod };
			}

			return {
				type: 'class',
				period: publicPeriod,
				sectionId: entry.section.id,
				sectionName: entry.section.name,
				classId: entry.section.classId,
				subjectId: entry.subject?.id ?? null,
				subjectName: entry.subject?.name ?? null,
				subjectCode: entry.subject?.code ?? null,
				roomName: entry.entry.roomName,
			};
		});

		return {
			date,
			dayOfWeek,
			slots,
			classCount: slots.filter((slot) => slot.type === 'class').length,
		};
	}

	private requireTeacher(tenant: TenantContext): void {
		if (!tenant.roles.includes('teacher')) {
			throw new NotFoundException({
				code: 'TEACHER_TIMETABLE_NOT_FOUND',
				message: 'Timetable is only available for teacher accounts',
			});
		}
	}
}

function toPublicPeriod(period: TimetablePeriodRecord): PublicTimetablePeriod {
	return {
		id: period.id,
		name: period.name,
		startsAt: formatTimeValue(period.startsAt),
		endsAt: formatTimeValue(period.endsAt),
		kind: period.kind,
		sortOrder: period.sortOrder,
	};
}
