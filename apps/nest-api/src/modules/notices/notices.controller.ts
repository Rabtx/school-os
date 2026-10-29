import {
	Body,
	Controller,
	Delete,
	Get,
	HttpCode,
	Param,
	ParseUUIDPipe,
	Patch,
	Post,
	Query,
	UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { ZodValidationPipe } from '@/common/pipes/zod-validation.pipe';
import type { AccessTokenPayload } from '@/modules/auth/auth.types';
import { CurrentUser } from '@/modules/auth/current-user.decorator';
import { JwtAuthGuard } from '@/modules/auth/jwt-auth.guard';
import { TenantGuard } from '@/modules/tenants/tenant.guard';
import {
	type AudiencePreviewInput,
	audiencePreviewSchema,
	type ListNoticesQuery,
	listNoticesQuerySchema,
	type NoticeDraftInput,
	noticeDraftSchema,
	type UpdateNoticeInput,
	updateNoticeSchema,
} from './notices.dto';
import { NoticesService } from './notices.service';

const uuid = new ParseUUIDPipe({ version: '4' });

/** Staff write and send notices; anyone a notice reached reads it from the inbox. */
@ApiTags('Notices')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard)
@Controller({ path: 'tenants/:tenantId/notices', version: '1' })
export class NoticesController {
	constructor(private readonly notices: NoticesService) {}

	@Get()
	@ApiOperation({ summary: 'Sent notices or drafts the signed-in staff member can see' })
	list(
		@CurrentUser() user: AccessTokenPayload,
		@Param('tenantId', uuid) tenantId: string,
		@Query(new ZodValidationPipe(listNoticesQuerySchema)) query: ListNoticesQuery,
	) {
		return this.notices.list(user.sub, tenantId, query);
	}

	@Get('inbox')
	@ApiOperation({ summary: 'Notices that reached the signed-in member' })
	inbox(@CurrentUser() user: AccessTokenPayload, @Param('tenantId', uuid) tenantId: string) {
		return this.notices.inbox(user.sub, tenantId);
	}

	@Get('audience-options')
	@ApiOperation({ summary: 'Classes the author can address, with family counts' })
	audienceOptions(
		@CurrentUser() user: AccessTokenPayload,
		@Param('tenantId', uuid) tenantId: string,
	) {
		return this.notices.audienceOptions(user.sub, tenantId);
	}

	@Post('audience-preview')
	@HttpCode(200)
	@ApiOperation({ summary: 'How many people an audience reaches now' })
	preview(
		@CurrentUser() user: AccessTokenPayload,
		@Param('tenantId', uuid) tenantId: string,
		@Body(new ZodValidationPipe(audiencePreviewSchema)) body: AudiencePreviewInput,
	) {
		return this.notices.previewAudience(user.sub, tenantId, body.audience);
	}

	@Get(':noticeId')
	@ApiOperation({ summary: 'One notice with its reach' })
	get(
		@CurrentUser() user: AccessTokenPayload,
		@Param('tenantId', uuid) tenantId: string,
		@Param('noticeId', uuid) noticeId: string,
	) {
		return this.notices.get(user.sub, tenantId, noticeId);
	}

	@Post()
	@ApiOperation({ summary: 'Save a draft notice' })
	create(
		@CurrentUser() user: AccessTokenPayload,
		@Param('tenantId', uuid) tenantId: string,
		@Body(new ZodValidationPipe(noticeDraftSchema)) body: NoticeDraftInput,
	) {
		return this.notices.create(user.sub, tenantId, body);
	}

	@Patch(':noticeId')
	@ApiOperation({ summary: 'Change a draft' })
	update(
		@CurrentUser() user: AccessTokenPayload,
		@Param('tenantId', uuid) tenantId: string,
		@Param('noticeId', uuid) noticeId: string,
		@Body(new ZodValidationPipe(updateNoticeSchema)) body: UpdateNoticeInput,
	) {
		return this.notices.update(user.sub, tenantId, noticeId, body);
	}

	@Delete(':noticeId')
	@ApiOperation({ summary: 'Delete a draft' })
	remove(
		@CurrentUser() user: AccessTokenPayload,
		@Param('tenantId', uuid) tenantId: string,
		@Param('noticeId', uuid) noticeId: string,
	) {
		return this.notices.remove(user.sub, tenantId, noticeId);
	}

	@Post(':noticeId/send')
	@HttpCode(200)
	@ApiOperation({ summary: 'Leadership sends a draft now' })
	send(
		@CurrentUser() user: AccessTokenPayload,
		@Param('tenantId', uuid) tenantId: string,
		@Param('noticeId', uuid) noticeId: string,
	) {
		return this.notices.sendNow(user.sub, tenantId, noticeId);
	}

	@Post(':noticeId/read')
	@HttpCode(200)
	@ApiOperation({ summary: 'Mark a notice read for the signed-in member' })
	read(
		@CurrentUser() user: AccessTokenPayload,
		@Param('tenantId', uuid) tenantId: string,
		@Param('noticeId', uuid) noticeId: string,
	) {
		return this.notices.markRead(user.sub, tenantId, noticeId);
	}
}
