import { ConflictException, Injectable, Logger } from '@nestjs/common';

import { PermissionCodes } from '@/modules/authorization/permission-codes';
import { MembershipsService } from '@/modules/memberships/memberships.service';
import {
	type AttendancePolicy,
	attendancePolicySchema,
	defaultAttendancePolicy,
	TEACHER_EDIT_WINDOWS,
} from './attendance-policy';
import { lateFromMinutes, fromMinutes } from './attendance-rules';
import { RulesRepository } from './rules.repository';

export type SchoolClock = {
	timeZone: string;
	quietHours: { start: string; end: string };
};

export type AttendancePolicyView = {
	policy: AttendancePolicy;
	/** 0 until the school saves its own rules; the defaults apply until then. */
	version: number;
	updatedAt: string | null;
	/** The first minute that counts as late: the bell plus the grace period. */
	lateFrom: string;
	timeZone: string;
	quietHours: { start: string; end: string };
	editWindowOptions: readonly number[];
};

const hhmm = (time: string | null | undefined, fallback: string) => (time ?? fallback).slice(0, 5);

@Injectable()
export class RulesService {
	private readonly logger = new Logger(RulesService.name);

	constructor(
		private readonly rules: RulesRepository,
		private readonly membershipAccess: MembershipsService,
	) {}

	async getAttendancePolicyView(userId: string, tenantId: string): Promise<AttendancePolicyView> {
		await this.membershipAccess.requirePermission(
			userId,
			tenantId,
			PermissionCodes.TENANT_SETTINGS_READ,
		);
		return this.buildView(tenantId);
	}

	async updateAttendancePolicy(
		userId: string,
		tenantId: string,
		policy: AttendancePolicy,
	): Promise<AttendancePolicyView> {
		const membership = await this.membershipAccess.requirePermission(
			userId,
			tenantId,
			PermissionCodes.TENANT_SETTINGS_WRITE,
		);
		const latest = await this.rules.findLatestAttendancePolicy(tenantId);
		try {
			await this.rules.insertAttendancePolicy({
				tenantId,
				version: (latest?.version ?? 0) + 1,
				policy,
				graceMinutes: policy.graceMinutes,
				membershipId: membership.id,
			});
		} catch (error) {
			if (isUniqueViolation(error)) {
				throw new ConflictException({
					code: 'ATTENDANCE_POLICY_CHANGED',
					message: 'Someone else saved the attendance rules just now. Reload and try again.',
				});
			}
			throw error;
		}
		return this.buildView(tenantId);
	}

	/** The rules in force for a school, for other modules; no permission check. */
	async getAttendancePolicy(
		tenantId: string,
	): Promise<{ policy: AttendancePolicy; clock: SchoolClock }> {
		const [latest, clock] = await Promise.all([
			this.rules.findLatestAttendancePolicy(tenantId),
			this.rules.findSchoolClock(tenantId),
		]);
		return {
			policy: this.parseOrDefault(latest?.policy, clock?.graceMinutes ?? undefined, tenantId),
			clock: {
				timeZone: clock?.timeZone ?? 'Asia/Karachi',
				quietHours: {
					start: hhmm(clock?.quietHoursStart, '22:00'),
					end: hhmm(clock?.quietHoursEnd, '07:00'),
				},
			},
		};
	}

	private async buildView(tenantId: string): Promise<AttendancePolicyView> {
		const [latest, { policy, clock }] = await Promise.all([
			this.rules.findLatestAttendancePolicy(tenantId),
			this.getAttendancePolicy(tenantId),
		]);
		return {
			policy,
			version: latest?.version ?? 0,
			updatedAt: latest?.createdAt.toISOString() ?? null,
			lateFrom: fromMinutes(lateFromMinutes(policy)),
			timeZone: clock.timeZone,
			quietHours: clock.quietHours,
			editWindowOptions: TEACHER_EDIT_WINDOWS,
		};
	}

	/** A stored policy that no longer validates falls back to the defaults rather than failing. */
	private parseOrDefault(
		stored: unknown,
		graceMinutes: number | undefined,
		tenantId: string,
	): AttendancePolicy {
		if (stored === undefined || stored === null) return defaultAttendancePolicy(graceMinutes);
		const parsed = attendancePolicySchema.safeParse(stored);
		if (parsed.success) return parsed.data;
		this.logger.warn(`Stored attendance policy for tenant ${tenantId} is invalid; using defaults`);
		return defaultAttendancePolicy(graceMinutes);
	}
}

function isUniqueViolation(error: unknown): boolean {
	const code = (error as { code?: string; cause?: { code?: string } } | null)?.code;
	const causeCode = (error as { cause?: { code?: string } } | null)?.cause?.code;
	return code === '23505' || causeCode === '23505';
}
