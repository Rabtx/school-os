import {
	Body,
	Controller,
	Delete,
	Get,
	HttpCode,
	HttpStatus,
	Param,
	ParseUUIDPipe,
	Post,
	Query,
	Req,
	Res,
	UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { AcceptInviteDto } from '@/modules/members/members.dto';
import type { PublicUser } from '@/modules/users/users.types';
import { AuthService } from './auth.service';
import type {
	AccessTokenPayload,
	AuthChallengeResult,
	ClientAuthSession,
	ClientLoginResult,
	PublicAuthSession,
	RegistrationResult,
	SessionView,
} from './auth.types';
import { CsrfGuard } from './csrf.guard';
import { CurrentUser } from './current-user.decorator';
import {
	ChangePasswordBodyDto,
	EmailBodyDto,
	LoginBodyDto,
	RefreshBodyDto,
	RegisterBodyDto,
	ResetPasswordBodyDto,
	SwitchTenantBodyDto,
	VerifyEmailBodyDto,
} from './dto/auth.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import { isNativeClient } from './native-client';
import { RefreshCookieService } from './refresh-cookie.service';
import { presentLoginResult, presentSession, resolveRefreshToken } from './session-response';

@ApiTags('Auth')
@UseGuards(CsrfGuard)
@Controller({
	path: 'auth',
	version: '1',
})
export class AuthController {
	constructor(
		private readonly authService: AuthService,
		private readonly refreshCookie: RefreshCookieService,
	) {}

	@Post('register')
	@Throttle({ default: { limit: 5, ttl: 60_000 } })
	@HttpCode(HttpStatus.CREATED)
	@ApiOperation({ summary: 'Create an account and send an email verification code' })
	register(@Body() body: RegisterBodyDto): Promise<RegistrationResult> {
		return this.authService.register(body);
	}

	@Post('verify-email')
	@Throttle({ default: { limit: 8, ttl: 60_000 } })
	@HttpCode(HttpStatus.OK)
	@ApiOperation({ summary: 'Verify an account using a six-digit email code' })
	verifyEmail(@Body() body: VerifyEmailBodyDto): Promise<PublicUser> {
		return this.authService.verifyEmail(body);
	}

	@Post('resend-verification')
	@Throttle({ default: { limit: 3, ttl: 60_000 } })
	@HttpCode(HttpStatus.ACCEPTED)
	@ApiOperation({ summary: 'Send a new email verification code' })
	resendVerification(@Body() body: EmailBodyDto): Promise<AuthChallengeResult> {
		return this.authService.resendVerification(body);
	}

	@Post('login')
	@Throttle({ default: { limit: 8, ttl: 60_000 } })
	@HttpCode(HttpStatus.OK)
	@ApiOperation({ summary: 'Sign in and create a secure refresh-token session' })
	async login(
		@Body() body: LoginBodyDto,
		@Req() request: Request,
		@Res({ passthrough: true }) response: Response,
	): Promise<ClientLoginResult> {
		const result = await this.authService.login(body, getRequestMetadata(request));
		return presentLoginResult(this.authService, this.refreshCookie, request, response, result);
	}

	@Post('refresh')
	@Throttle({ default: { limit: 30, ttl: 60_000 } })
	@HttpCode(HttpStatus.OK)
	@ApiOperation({
		summary: 'Rotate the refresh token and issue a new access token',
		description:
			'Web clients send the refresh cookie. Native clients send `refreshToken` in the JSON body and `X-Client-Platform: native`.',
	})
	async refresh(
		@Req() request: Request,
		@Res({ passthrough: true }) response: Response,
		@Body() body: RefreshBodyDto,
	): Promise<ClientAuthSession> {
		const result = await this.authService.refresh(
			resolveRefreshToken(this.refreshCookie, request, body.refreshToken),
			getRequestMetadata(request),
		);
		return presentSession(this.authService, this.refreshCookie, request, response, result);
	}

	@Post('logout')
	@HttpCode(HttpStatus.NO_CONTENT)
	@ApiOperation({ summary: 'Revoke the current refresh-token session' })
	async logout(
		@Req() request: Request,
		@Res({ passthrough: true }) response: Response,
		@Body() body: RefreshBodyDto,
	): Promise<void> {
		await this.authService.logout(
			resolveRefreshToken(this.refreshCookie, request, body.refreshToken),
		);
		this.refreshCookie.clear(response);
	}

	@Post('logout-all')
	@UseGuards(JwtAuthGuard)
	@ApiBearerAuth()
	@HttpCode(HttpStatus.NO_CONTENT)
	@ApiOperation({ summary: 'Revoke every session for the current user' })
	async logoutAll(
		@CurrentUser() user: AccessTokenPayload,
		@Res({ passthrough: true }) response: Response,
	): Promise<void> {
		await this.authService.logoutAll(user.sub);
		this.refreshCookie.clear(response);
	}

	@Get('me')
	@UseGuards(JwtAuthGuard)
	@ApiBearerAuth()
	@ApiOperation({ summary: 'Get the authenticated user' })
	me(@CurrentUser() user: AccessTokenPayload): Promise<PublicUser> {
		return this.authService.me(user.sub);
	}

	@Post('switch-tenant')
	@UseGuards(JwtAuthGuard)
	@ApiBearerAuth()
	@HttpCode(HttpStatus.OK)
	@ApiOperation({
		summary: 'Switch the active organization for the current session',
		description:
			'Updates session tenant context and returns a new access token with tid/mid claims.',
	})
	switchTenant(
		@CurrentUser() user: AccessTokenPayload,
		@Body() body: SwitchTenantBodyDto,
	): Promise<PublicAuthSession> {
		return this.authService.switchTenant(user, body.tenantId);
	}

	@Get('invites/preview')
	@Throttle({ default: { limit: 20, ttl: 60_000 } })
	@ApiOperation({ summary: 'Preview a membership invite before accepting' })
	previewInvite(@Query('token') token: string) {
		return this.authService.previewInvite(token);
	}

	@Get('pending-invites')
	@UseGuards(JwtAuthGuard)
	@ApiBearerAuth()
	@ApiOperation({ summary: 'List pending membership invites for the current user' })
	listPendingInvites(@CurrentUser() user: AccessTokenPayload) {
		return this.authService.listPendingInvites(user.sub);
	}

	@Post('accept-invite')
	@UseGuards(JwtAuthGuard)
	@ApiBearerAuth()
	@HttpCode(HttpStatus.OK)
	@ApiOperation({ summary: 'Accept a membership invite' })
	acceptInvite(@CurrentUser() user: AccessTokenPayload, @Body() body: AcceptInviteDto) {
		return this.authService.acceptInvite(user.sub, {
			token: body.token,
			inviteId: body.inviteId,
		});
	}

	@Post('forgot-password')
	@Throttle({ default: { limit: 3, ttl: 60_000 } })
	@HttpCode(HttpStatus.ACCEPTED)
	@ApiOperation({ summary: 'Request a password-reset code without revealing account existence' })
	forgotPassword(@Body() body: EmailBodyDto): Promise<AuthChallengeResult> {
		return this.authService.forgotPassword(body);
	}

	@Post('reset-password')
	@Throttle({ default: { limit: 8, ttl: 60_000 } })
	@HttpCode(HttpStatus.OK)
	@ApiOperation({ summary: 'Reset a password using a six-digit code' })
	resetPassword(@Body() body: ResetPasswordBodyDto): Promise<AuthChallengeResult> {
		return this.authService.resetPassword(body);
	}

	@Post('change-password')
	@UseGuards(JwtAuthGuard)
	@ApiBearerAuth()
	@HttpCode(HttpStatus.OK)
	@ApiOperation({ summary: 'Change the current password and revoke other sessions' })
	async changePassword(
		@CurrentUser() user: AccessTokenPayload,
		@Body() body: ChangePasswordBodyDto,
		@Req() request: Request,
		@Res({ passthrough: true }) response: Response,
	): Promise<AuthChallengeResult & { refreshToken?: string }> {
		const { refreshToken, ...result } = await this.authService.changePassword(user, body);
		// The session's refresh token was rotated: web gets the cookie, native apps the body field.
		this.refreshCookie.set(response, refreshToken);
		return isNativeClient(request) ? { ...result, refreshToken } : result;
	}

	@Get('sessions')
	@UseGuards(JwtAuthGuard)
	@ApiBearerAuth()
	@ApiOperation({ summary: 'List active sessions for the current user' })
	listSessions(@CurrentUser() user: AccessTokenPayload): Promise<SessionView[]> {
		return this.authService.listSessions(user);
	}

	@Delete('sessions/:sessionId')
	@UseGuards(JwtAuthGuard)
	@ApiBearerAuth()
	@ApiOperation({ summary: 'Revoke one of the current user sessions' })
	async revokeSession(
		@CurrentUser() user: AccessTokenPayload,
		@Param('sessionId', new ParseUUIDPipe({ version: '4' })) sessionId: string,
		@Res({ passthrough: true }) response: Response,
	): Promise<{ revoked: true }> {
		const result = await this.authService.revokeSession(user, sessionId);
		if (result.current) {
			this.refreshCookie.clear(response);
		}
		return { revoked: true };
	}
}

function getRequestMetadata(request: Request): {
	ipAddress: string | null;
	userAgent: string | null;
} {
	return {
		ipAddress: request.ip || null,
		userAgent: request.get('user-agent')?.slice(0, 512) ?? null,
	};
}
