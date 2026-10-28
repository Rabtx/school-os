import {
	Body,
	Controller,
	Get,
	Param,
	ParseUUIDPipe,
	Post,
	Query,
	UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { ZodValidationPipe } from '@/common/pipes/zod-validation.pipe';
import type { AccessTokenPayload } from '@/modules/auth/auth.types';
import { CurrentUser } from '@/modules/auth/current-user.decorator';
import { JwtAuthGuard } from '@/modules/auth/jwt-auth.guard';
import { PermissionCodes } from '@/modules/authorization/permission-codes';
import { PermissionsGuard } from '@/modules/authorization/permissions.guard';
import { RequirePermissions } from '@/modules/authorization/require-permissions.decorator';
import { TenantGuard } from '@/modules/tenants/tenant.guard';
import {
	AddGradebookEntryDto,
	type GradebookGridQuery,
	gradebookGridQuerySchema,
	type MarksheetQuery,
	marksheetQuerySchema,
	type StudentReportQuery,
	studentReportQuerySchema,
} from './gradebook.dto';
import { GradebookService } from './gradebook.service';

@ApiTags('Gradebook')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
@Controller({ path: 'tenants/:tenantId/gradebook', version: '1' })
export class GradebookController {
	constructor(private readonly gradebook: GradebookService) {}

	@Get()
	@RequirePermissions(PermissionCodes.ASSESSMENTS_READ)
	@ApiOperation({ summary: 'Gradebook grid for a section and term' })
	grid(
		@CurrentUser() user: AccessTokenPayload,
		@Param('tenantId', new ParseUUIDPipe({ version: '4' })) tenantId: string,
		@Query(new ZodValidationPipe(gradebookGridQuerySchema)) query: GradebookGridQuery,
	) {
		return this.gradebook.getGradebookGrid(user.sub, tenantId, query);
	}

	@Get('marks')
	@RequirePermissions(PermissionCodes.ASSESSMENTS_READ)
	@ApiOperation({ summary: 'Every test and homework mark for one class subject' })
	marks(
		@CurrentUser() user: AccessTokenPayload,
		@Param('tenantId', new ParseUUIDPipe({ version: '4' })) tenantId: string,
		@Query(new ZodValidationPipe(marksheetQuerySchema)) query: MarksheetQuery,
	) {
		return this.gradebook.getMarksheet(user.sub, tenantId, query);
	}

	@Post('entries')
	@RequirePermissions(PermissionCodes.ASSESSMENTS_WRITE)
	@ApiOperation({ summary: 'Add a manual gradebook entry' })
	addEntry(
		@CurrentUser() user: AccessTokenPayload,
		@Param('tenantId', new ParseUUIDPipe({ version: '4' })) tenantId: string,
		@Body() body: AddGradebookEntryDto,
	) {
		return this.gradebook.addManualEntry(user.sub, tenantId, body);
	}

	@Get('student/:studentId')
	@RequirePermissions(PermissionCodes.ASSESSMENTS_READ)
	@ApiOperation({ summary: 'Student report card data' })
	studentReport(
		@CurrentUser() user: AccessTokenPayload,
		@Param('tenantId', new ParseUUIDPipe({ version: '4' })) tenantId: string,
		@Param('studentId', new ParseUUIDPipe({ version: '4' })) studentId: string,
		@Query(new ZodValidationPipe(studentReportQuerySchema)) query: StudentReportQuery,
	) {
		return this.gradebook.getStudentReport(user.sub, tenantId, studentId, query);
	}
}
