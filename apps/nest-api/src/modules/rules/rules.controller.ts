import { Body, Controller, Get, Param, ParseUUIDPipe, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { ZodValidationPipe } from '@/common/pipes/zod-validation.pipe';
import type { AccessTokenPayload } from '@/modules/auth/auth.types';
import { CurrentUser } from '@/modules/auth/current-user.decorator';
import { JwtAuthGuard } from '@/modules/auth/jwt-auth.guard';
import { PermissionCodes } from '@/modules/authorization/permission-codes';
import { PermissionsGuard } from '@/modules/authorization/permissions.guard';
import { RequirePermissions } from '@/modules/authorization/require-permissions.decorator';
import { TenantGuard } from '@/modules/tenants/tenant.guard';
import type { AttendancePolicy } from './attendance-policy';
import { updateAttendancePolicySchema } from './rules.dto';
import { RulesService } from './rules.service';

@ApiTags('Rules')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
@Controller({ path: 'tenants/:tenantId/rules', version: '1' })
export class RulesController {
	constructor(private readonly rules: RulesService) {}

	@Get('attendance')
	@RequirePermissions(PermissionCodes.TENANT_SETTINGS_READ)
	@ApiOperation({ summary: 'The attendance rules in force, with the school time zone' })
	getAttendance(
		@CurrentUser() user: AccessTokenPayload,
		@Param('tenantId', new ParseUUIDPipe({ version: '4' })) tenantId: string,
	) {
		return this.rules.getAttendancePolicyView(user.sub, tenantId);
	}

	@Put('attendance')
	@RequirePermissions(PermissionCodes.TENANT_SETTINGS_WRITE)
	@ApiOperation({ summary: 'Save a new version of the attendance rules' })
	updateAttendance(
		@CurrentUser() user: AccessTokenPayload,
		@Param('tenantId', new ParseUUIDPipe({ version: '4' })) tenantId: string,
		@Body(new ZodValidationPipe(updateAttendancePolicySchema)) body: AttendancePolicy,
	) {
		return this.rules.updateAttendancePolicy(user.sub, tenantId, body);
	}
}
