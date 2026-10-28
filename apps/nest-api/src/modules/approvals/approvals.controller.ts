import {
	Body,
	Controller,
	Get,
	HttpCode,
	Param,
	ParseUUIDPipe,
	Post,
	UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { ZodValidationPipe } from '@/common/pipes/zod-validation.pipe';
import type { AccessTokenPayload } from '@/modules/auth/auth.types';
import { CurrentUser } from '@/modules/auth/current-user.decorator';
import { JwtAuthGuard } from '@/modules/auth/jwt-auth.guard';
import { TenantGuard } from '@/modules/tenants/tenant.guard';
import {
	type CreateApprovalInput,
	createApprovalSchema,
	type DeclineApprovalInput,
	declineApprovalSchema,
} from './approvals.dto';
import { ApprovalsService } from './approvals.service';

const uuid = new ParseUUIDPipe({ version: '4' });

/** Leadership decides here; who may ask for what is checked by each request type's handler. */
@ApiTags('Approvals')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard)
@Controller({ path: 'tenants/:tenantId/approvals', version: '1' })
export class ApprovalsController {
	constructor(private readonly approvals: ApprovalsService) {}

	@Get()
	@ApiOperation({ summary: 'The pending queue, oldest first, with today’s decisions' })
	queue(@CurrentUser() user: AccessTokenPayload, @Param('tenantId', uuid) tenantId: string) {
		return this.approvals.getQueue(user.sub, tenantId);
	}

	@Get('mine')
	@ApiOperation({ summary: 'Requests the signed-in member made, newest first' })
	mine(@CurrentUser() user: AccessTokenPayload, @Param('tenantId', uuid) tenantId: string) {
		return this.approvals.listMine(user.sub, tenantId);
	}

	@Get(':approvalId')
	@ApiOperation({ summary: 'One request, for its requester or leadership' })
	get(
		@CurrentUser() user: AccessTokenPayload,
		@Param('tenantId', uuid) tenantId: string,
		@Param('approvalId', uuid) approvalId: string,
	) {
		return this.approvals.get(user.sub, tenantId, approvalId);
	}

	@Post()
	@ApiOperation({ summary: 'Ask leadership to decide something' })
	create(
		@CurrentUser() user: AccessTokenPayload,
		@Param('tenantId', uuid) tenantId: string,
		@Body(new ZodValidationPipe(createApprovalSchema)) body: CreateApprovalInput,
	) {
		return this.approvals.create(user.sub, tenantId, body);
	}

	@Post(':approvalId/approve')
	@HttpCode(200)
	@ApiOperation({ summary: 'Approve and apply, with a short undo window' })
	approve(
		@CurrentUser() user: AccessTokenPayload,
		@Param('tenantId', uuid) tenantId: string,
		@Param('approvalId', uuid) approvalId: string,
	) {
		return this.approvals.approve(user.sub, tenantId, approvalId);
	}

	@Post(':approvalId/decline')
	@HttpCode(200)
	@ApiOperation({ summary: 'Decline with a reason the requester sees' })
	decline(
		@CurrentUser() user: AccessTokenPayload,
		@Param('tenantId', uuid) tenantId: string,
		@Param('approvalId', uuid) approvalId: string,
		@Body(new ZodValidationPipe(declineApprovalSchema)) body: DeclineApprovalInput,
	) {
		return this.approvals.decline(user.sub, tenantId, approvalId, body.reason);
	}

	@Post(':approvalId/undo')
	@HttpCode(200)
	@ApiOperation({ summary: 'Undo an approval inside its window; it goes back to the queue' })
	undo(
		@CurrentUser() user: AccessTokenPayload,
		@Param('tenantId', uuid) tenantId: string,
		@Param('approvalId', uuid) approvalId: string,
	) {
		return this.approvals.undo(user.sub, tenantId, approvalId);
	}

	@Post(':approvalId/cancel')
	@HttpCode(200)
	@ApiOperation({ summary: 'The requester withdraws a request nobody decided yet' })
	cancel(
		@CurrentUser() user: AccessTokenPayload,
		@Param('tenantId', uuid) tenantId: string,
		@Param('approvalId', uuid) approvalId: string,
	) {
		return this.approvals.cancel(user.sub, tenantId, approvalId);
	}
}
