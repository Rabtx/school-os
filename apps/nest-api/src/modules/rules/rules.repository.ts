import { Injectable } from '@nestjs/common';
import { desc, eq } from 'drizzle-orm';

import { DatabaseService } from '@/database/database.service';
import { attendancePolicies, auditLogs, tenantSettings, tenants } from '@/database/schema';

@Injectable()
export class RulesRepository {
	constructor(private readonly database: DatabaseService) {}

	async findLatestAttendancePolicy(tenantId: string) {
		const [row] = await this.database.db
			.select()
			.from(attendancePolicies)
			.where(eq(attendancePolicies.tenantId, tenantId))
			.orderBy(desc(attendancePolicies.version))
			.limit(1);
		return row ?? null;
	}

	async listAttendancePolicyVersions(tenantId: string, limit: number) {
		return this.database.db
			.select({
				version: attendancePolicies.version,
				createdAt: attendancePolicies.createdAt,
				createdByMembershipId: attendancePolicies.createdByMembershipId,
			})
			.from(attendancePolicies)
			.where(eq(attendancePolicies.tenantId, tenantId))
			.orderBy(desc(attendancePolicies.version))
			.limit(limit);
	}

	/**
	 * Saves the next version. The unique (tenant, version) index turns a concurrent save into an
	 * error instead of a silent overwrite. The grace period is mirrored to tenant settings so older
	 * readers agree with the policy.
	 */
	async insertAttendancePolicy(input: {
		tenantId: string;
		version: number;
		policy: unknown;
		graceMinutes: number;
		membershipId: string;
	}) {
		return this.database.db.transaction(async (transaction) => {
			const [row] = await transaction
				.insert(attendancePolicies)
				.values({
					tenantId: input.tenantId,
					version: input.version,
					policy: input.policy,
					createdByMembershipId: input.membershipId,
				})
				.returning();
			if (!row) throw new Error('Attendance policy insert returned no row');
			await transaction
				.update(tenantSettings)
				.set({ attendanceGraceMinutes: input.graceMinutes, updatedAt: new Date() })
				.where(eq(tenantSettings.tenantId, input.tenantId));
			await transaction.insert(auditLogs).values({
				tenantId: input.tenantId,
				actorMembershipId: input.membershipId,
				action: 'rules.attendance_policy.updated',
				resourceType: 'attendance_policy',
				resourceId: row.id,
				metadata: { version: input.version },
			});
			return row;
		});
	}

	/** The school's time zone, quiet hours and legacy grace period, used to evaluate rules. */
	async findSchoolClock(tenantId: string) {
		const [row] = await this.database.db
			.select({
				timeZone: tenants.timezone,
				graceMinutes: tenantSettings.attendanceGraceMinutes,
				quietHoursStart: tenantSettings.quietHoursStart,
				quietHoursEnd: tenantSettings.quietHoursEnd,
			})
			.from(tenants)
			.leftJoin(tenantSettings, eq(tenantSettings.tenantId, tenants.id))
			.where(eq(tenants.id, tenantId))
			.limit(1);
		return row ?? null;
	}
}
