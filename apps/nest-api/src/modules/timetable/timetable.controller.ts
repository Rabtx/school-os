import { Controller, Get, Param, ParseUUIDPipe, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import * as z from 'zod';
import { ZodValidationPipe } from '@/common/pipes/zod-validation.pipe';
import { JwtAuthGuard } from '@/modules/auth/jwt-auth.guard';
import { PermissionCodes } from '@/modules/authorization/permission-codes';
import { RequirePermissions } from '@/modules/authorization/require-permissions.decorator';
import { PermissionsGuard } from '@/modules/authorization/permissions.guard';
import { CurrentTenant } from '@/modules/tenants/current-tenant.decorator';
import { TenantGuard } from '@/modules/tenants/tenant.guard';
import type { TenantContext } from '@/modules/tenants/tenant-context.types';
import { TimetableService } from './timetable.service';

const dateQuerySchema = z
	.object({
		date: z
			.string()
			.trim()
			.regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD')
			.optional(),
	})
	.strict();

type DateQuery = z.infer<typeof dateQuerySchema>;

@ApiTags('Timetable')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
@Controller({ path: 'tenants/:tenantId/timetable', version: '1' })
export class TimetableController {
	constructor(private readonly timetable: TimetableService) {}

	@Get('me/day')
	@ApiOperation({ summary: 'Get the current teacher schedule for a single day' })
	getMyDay(
		@CurrentTenant() tenant: TenantContext,
		@Param('tenantId', new ParseUUIDPipe({ version: '4' })) _tenantId: string,
		@Query(new ZodValidationPipe(dateQuerySchema)) query: DateQuery,
	) {
		const resolvedDate = query.date ?? new Date().toISOString().slice(0, 10);
		return this.timetable.getMyDaySchedule(tenant, resolvedDate);
	}

	@Get('me/week')
	@ApiOperation({ summary: 'Get the current teacher schedule for the ISO week containing a date' })
	getMyWeek(
		@CurrentTenant() tenant: TenantContext,
		@Param('tenantId', new ParseUUIDPipe({ version: '4' })) _tenantId: string,
		@Query(new ZodValidationPipe(dateQuerySchema)) query: DateQuery,
	) {
		const resolvedDate = query.date ?? new Date().toISOString().slice(0, 10);
		return this.timetable.getMyWeekSchedule(tenant, resolvedDate);
	}

	@Get('sections/:sectionId/week')
	@RequirePermissions(PermissionCodes.ACADEMIC_READ)
	@ApiOperation({ summary: 'Get a class timetable for the ISO week containing a date' })
	getSectionWeek(
		@CurrentTenant() tenant: TenantContext,
		@Param('tenantId', new ParseUUIDPipe({ version: '4' })) _tenantId: string,
		@Param('sectionId', new ParseUUIDPipe({ version: '4' })) sectionId: string,
		@Query(new ZodValidationPipe(dateQuerySchema)) query: DateQuery,
	) {
		const resolvedDate = query.date ?? new Date().toISOString().slice(0, 10);
		return this.timetable.getSectionWeek(tenant, sectionId, resolvedDate);
	}
}
