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
	ConfirmAllPresentDto,
	CreateAttendanceSessionDto,
	type FindSessionQuery,
	findSessionQuerySchema,
	MarkAttendanceDto,
	type SessionDateQuery,
	type StudentHistoryQuery,
	sessionDateQuerySchema,
	studentHistoryQuerySchema,
} from './attendance.dto';
import { AttendanceService } from './attendance.service';

@ApiTags('Attendance')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
@Controller({ path: 'tenants/:tenantId/attendance', version: '1' })
export class AttendanceController {
	constructor(private readonly attendance: AttendanceService) {}

	@Post('sessions')
	@RequirePermissions(PermissionCodes.ATTENDANCE_READ)
	@ApiOperation({ summary: 'Get or create an attendance session for a section and date' })
	getOrCreateSession(
		@CurrentUser() user: AccessTokenPayload,
		@Param('tenantId', new ParseUUIDPipe({ version: '4' })) tenantId: string,
		@Body() body: CreateAttendanceSessionDto,
	) {
		return this.attendance.getOrCreateSession(user.sub, tenantId, body);
	}

	@Get('sessions')
	@RequirePermissions(PermissionCodes.ATTENDANCE_READ)
	@ApiOperation({ summary: 'Find an attendance session by section and date' })
	findSession(
		@CurrentUser() user: AccessTokenPayload,
		@Param('tenantId', new ParseUUIDPipe({ version: '4' })) tenantId: string,
		@Query(new ZodValidationPipe(findSessionQuerySchema)) query: FindSessionQuery,
	) {
		return this.attendance.findSession(user.sub, tenantId, query);
	}

	@Get('sessions/:sessionId')
	@RequirePermissions(PermissionCodes.ATTENDANCE_READ)
	@ApiOperation({ summary: 'Get an attendance session with marks and summary' })
	getSession(
		@CurrentUser() user: AccessTokenPayload,
		@Param('tenantId', new ParseUUIDPipe({ version: '4' })) tenantId: string,
		@Param('sessionId', new ParseUUIDPipe({ version: '4' })) sessionId: string,
	) {
		return this.attendance.getSession(user.sub, tenantId, sessionId);
	}

	@Post('sessions/:sessionId/marks')
	@RequirePermissions(PermissionCodes.ATTENDANCE_MARK)
	@ApiOperation({ summary: 'Mark attendance for students in a session' })
	markAttendance(
		@CurrentUser() user: AccessTokenPayload,
		@Param('tenantId', new ParseUUIDPipe({ version: '4' })) tenantId: string,
		@Param('sessionId', new ParseUUIDPipe({ version: '4' })) sessionId: string,
		@Body() body: MarkAttendanceDto,
	) {
		return this.attendance.markAttendance(user.sub, tenantId, sessionId, body);
	}

	@Post('sessions/:sessionId/confirm-all-present')
	@RequirePermissions(PermissionCodes.ATTENDANCE_MARK)
	@ApiOperation({ summary: 'Mark all enrolled students present (optional exceptions)' })
	confirmAllPresent(
		@CurrentUser() user: AccessTokenPayload,
		@Param('tenantId', new ParseUUIDPipe({ version: '4' })) tenantId: string,
		@Param('sessionId', new ParseUUIDPipe({ version: '4' })) sessionId: string,
		@Body() body: ConfirmAllPresentDto,
	) {
		return this.attendance.confirmAllPresent(user.sub, tenantId, sessionId, body);
	}

	@Get('overview')
	@RequirePermissions(PermissionCodes.ATTENDANCE_READ)
	@ApiOperation({
		summary: 'Leadership attendance overview: 14 days, check-in sources, latest marks',
	})
	getOverview(
		@CurrentUser() user: AccessTokenPayload,
		@Param('tenantId', new ParseUUIDPipe({ version: '4' })) tenantId: string,
		@Query(new ZodValidationPipe(sessionDateQuerySchema)) query: SessionDateQuery,
	) {
		const date = query.sessionDate ?? new Date().toISOString().slice(0, 10);
		return this.attendance.getOverview(user.sub, tenantId, date);
	}

	@Get('school-pulse')
	@RequirePermissions(PermissionCodes.ATTENDANCE_READ)
	@ApiOperation({ summary: 'School-wide attendance pulse for a calendar date' })
	getSchoolDayPulse(
		@CurrentUser() user: AccessTokenPayload,
		@Param('tenantId', new ParseUUIDPipe({ version: '4' })) tenantId: string,
		@Query(new ZodValidationPipe(sessionDateQuerySchema)) query: SessionDateQuery,
	) {
		const date = query.sessionDate ?? new Date().toISOString().slice(0, 10);
		return this.attendance.getSchoolDayPulse(user.sub, tenantId, date);
	}

	@Get('students/:studentId/history')
	@RequirePermissions(PermissionCodes.ATTENDANCE_READ)
	@ApiOperation({ summary: 'Get attendance history for a student' })
	getStudentHistory(
		@CurrentUser() user: AccessTokenPayload,
		@Param('tenantId', new ParseUUIDPipe({ version: '4' })) tenantId: string,
		@Param('studentId', new ParseUUIDPipe({ version: '4' })) studentId: string,
		@Query(new ZodValidationPipe(studentHistoryQuerySchema)) query: StudentHistoryQuery,
	) {
		return this.attendance.getStudentHistory(user.sub, tenantId, studentId, query.limit ?? 50);
	}
}
