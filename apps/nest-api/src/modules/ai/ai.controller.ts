import { Body, Controller, Get, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';

import { ZodValidationPipe } from '@/common/pipes/zod-validation.pipe';
import { JwtAuthGuard } from '@/modules/auth/jwt-auth.guard';
import { CurrentTenant } from '@/modules/tenants/current-tenant.decorator';
import type { TenantContext } from '@/modules/tenants/tenant-context.types';
import { TenantGuard } from '@/modules/tenants/tenant.guard';
import {
	AcademicDraftRequestDto,
	AssistRequestDto,
	academicDraftRequestSchema,
	assistRequestSchema,
} from './ai.dto';
import { AiService } from './ai.service';

@ApiTags('AI')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard)
@Throttle({ default: { limit: 10, ttl: 60_000 } })
@Controller({ path: 'tenants/:tenantId/ai', version: '1' })
export class AiController {
	constructor(private readonly ai: AiService) {}

	@Get('status')
	@ApiOperation({ summary: 'Check AI assistance upstream availability' })
	status() {
		return this.ai.status();
	}

	@Post('assist')
	@HttpCode(HttpStatus.OK)
	@ApiOperation({ summary: 'In-app AI assistance (proxied to FastAPI)' })
	assist(
		@CurrentTenant() tenant: TenantContext,
		@Body(new ZodValidationPipe(assistRequestSchema)) body: AssistRequestDto,
	) {
		return this.ai.assist(tenant.tenantId, tenant.userId, body);
	}

	@Post('academics/draft')
	@HttpCode(HttpStatus.OK)
	@ApiOperation({ summary: 'Draft homework or assessment content with AI assist' })
	draftAcademics(
		@CurrentTenant() tenant: TenantContext,
		@Body(new ZodValidationPipe(academicDraftRequestSchema)) body: AcademicDraftRequestDto,
	) {
		return this.ai.draftAcademics(tenant.tenantId, tenant.userId, body);
	}
}
