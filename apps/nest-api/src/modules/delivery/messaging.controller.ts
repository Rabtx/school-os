import { Controller, Get, HttpCode, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import type { AccessTokenPayload } from '@/modules/auth/auth.types';
import { CurrentUser } from '@/modules/auth/current-user.decorator';
import { JwtAuthGuard } from '@/modules/auth/jwt-auth.guard';
import { MembershipsService } from '@/modules/memberships/memberships.service';
import { TenantGuard } from '@/modules/tenants/tenant.guard';
import { DeliveryService } from './delivery.service';

const uuid = new ParseUUIDPipe({ version: '4' });

/** The school's WhatsApp connection: status for every member, switching it for leadership. */
@ApiTags('Messaging')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard)
@Controller({ path: 'tenants/:tenantId/messaging', version: '1' })
export class MessagingController {
	constructor(
		private readonly delivery: DeliveryService,
		private readonly membershipAccess: MembershipsService,
	) {}

	@Get('status')
	@ApiOperation({ summary: 'WhatsApp connection and the last 24 hours of deliveries' })
	async status(@CurrentUser() user: AccessTokenPayload, @Param('tenantId', uuid) tenantId: string) {
		await this.membershipAccess.requireActiveMembership(user.sub, tenantId);
		return this.delivery.status(tenantId);
	}

	@Get('deliveries')
	@ApiOperation({ summary: 'Recent WhatsApp and SMS deliveries, for leadership' })
	async deliveries(
		@CurrentUser() user: AccessTokenPayload,
		@Param('tenantId', uuid) tenantId: string,
	) {
		await this.membershipAccess.requireManagementAccess(user.sub, tenantId);
		const rows = await this.delivery.recent(tenantId);
		return {
			deliveries: rows.map((row) => ({
				id: row.id,
				sourceType: row.sourceType,
				channel: row.channel,
				status: row.status,
				language: row.language,
				body: row.body,
				error: row.error,
				toPhone: row.toPhone ? `••••${row.toPhone.slice(-4)}` : '',
				createdAt: row.createdAt.toISOString(),
				sentAt: row.sentAt?.toISOString() ?? null,
				readAt: row.readAt?.toISOString() ?? null,
			})),
		};
	}

	@Post('whatsapp/connect')
	@HttpCode(200)
	@ApiOperation({ summary: 'Switch WhatsApp on for the school' })
	async connect(
		@CurrentUser() user: AccessTokenPayload,
		@Param('tenantId', uuid) tenantId: string,
	) {
		const membership = await this.membershipAccess.requireManagementAccess(user.sub, tenantId);
		await this.delivery.setConnected(tenantId, true, membership.id);
		return this.delivery.status(tenantId);
	}

	@Post('whatsapp/disconnect')
	@HttpCode(200)
	@ApiOperation({ summary: 'Switch WhatsApp off for the school' })
	async disconnect(
		@CurrentUser() user: AccessTokenPayload,
		@Param('tenantId', uuid) tenantId: string,
	) {
		const membership = await this.membershipAccess.requireManagementAccess(user.sub, tenantId);
		await this.delivery.setConnected(tenantId, false, membership.id);
		return this.delivery.status(tenantId);
	}
}
