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
import { TenantGuard } from '@/modules/tenants/tenant.guard';
import {
	type ListThreadsQuery,
	listThreadsQuerySchema,
	type RecipientsQuery,
	recipientsQuerySchema,
	type ReplyInput,
	replySchema,
	type StartThreadInput,
	startThreadSchema,
} from './messages.dto';
import { MessagesService } from './messages.service';

const uuid = new ParseUUIDPipe({ version: '4' });

/** Who may read which thread is decided per viewer in the service (staff scope or own family). */
@ApiTags('Messages')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard)
@Controller({ path: 'tenants/:tenantId/messages', version: '1' })
export class MessagesController {
	constructor(private readonly messages: MessagesService) {}

	@Get('threads')
	@ApiOperation({ summary: 'Conversations the signed-in member can see, newest first' })
	list(
		@CurrentUser() user: AccessTokenPayload,
		@Param('tenantId', uuid) tenantId: string,
		@Query(new ZodValidationPipe(listThreadsQuerySchema)) query: ListThreadsQuery,
	) {
		return this.messages.listThreads(user.sub, tenantId, query);
	}

	@Get('recipients')
	@ApiOperation({ summary: 'Guardians staff can start a conversation with' })
	recipients(
		@CurrentUser() user: AccessTokenPayload,
		@Param('tenantId', uuid) tenantId: string,
		@Query(new ZodValidationPipe(recipientsQuerySchema)) query: RecipientsQuery,
	) {
		return this.messages.listRecipients(user.sub, tenantId, query.search);
	}

	@Get('threads/:threadId')
	@ApiOperation({ summary: 'One conversation; opening it marks the other side as read' })
	get(
		@CurrentUser() user: AccessTokenPayload,
		@Param('tenantId', uuid) tenantId: string,
		@Param('threadId', uuid) threadId: string,
	) {
		return this.messages.getThread(user.sub, tenantId, threadId);
	}

	@Post('threads')
	@ApiOperation({ summary: 'Write to a guardian (staff) or the school (guardian) about a child' })
	start(
		@CurrentUser() user: AccessTokenPayload,
		@Param('tenantId', uuid) tenantId: string,
		@Body(new ZodValidationPipe(startThreadSchema)) body: StartThreadInput,
	) {
		return this.messages.startThread(user.sub, tenantId, body);
	}

	@Post('threads/:threadId/messages')
	@ApiOperation({ summary: 'Reply in a conversation' })
	reply(
		@CurrentUser() user: AccessTokenPayload,
		@Param('tenantId', uuid) tenantId: string,
		@Param('threadId', uuid) threadId: string,
		@Body(new ZodValidationPipe(replySchema)) body: ReplyInput,
	) {
		return this.messages.reply(user.sub, tenantId, threadId, body.body);
	}
}
