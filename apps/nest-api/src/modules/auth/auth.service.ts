import { randomUUID } from 'node:crypto';
import {
	BadRequestException,
	ForbiddenException,
	HttpException,
	HttpStatus,
	Injectable,
	Logger,
	UnauthorizedException,
} from '@nestjs/common';

import { AppConfigService } from '@/config/app-config.service';
import type {
	AuthChallengePurpose,
	AuthChallengeRecord,
	SessionRecord,
	UserRecord,
} from '@/database/schema';
import { PermissionsService } from '@/modules/authorization/permissions.service';
import { EmailService } from '@/modules/email/email.service';
import { MembershipInvitesService } from '@/modules/memberships/membership-invites.service';
import { MembershipsRepository } from '@/modules/memberships/memberships.repository';
import { MembershipsService } from '@/modules/memberships/memberships.service';
import { MfaService } from '@/modules/mfa/mfa.service';
import { PasskeysService } from '@/modules/passkeys/passkeys.service';
import { SocialAuthService } from '@/modules/social-auth/social-auth.service';
import { UsersService } from '@/modules/users/users.service';
import { type PublicUser, toPublicUser } from '@/modules/users/users.types';
import { AuthRepository } from './auth.repository';
import type {
	AccessTokenPayload,
	AuthChallengeResult,
	AuthSessionResult,
	ChangePasswordResult,
	ClientAuthSession,
	ClientLoginResult,
	LoginResult,
	MfaLoginChallenge,
	PublicAuthSession,
	PublicTenantContext,
	RegistrationResult,
	RequestMetadata,
	SessionView,
} from './auth.types';
import { AuthCryptoService } from './auth-crypto.service';
import type {
	ChallengeTokenBody,
	ChangePasswordBody,
	EmailBody,
	LoginBody,
	RegisterBody,
	ResetPasswordBody,
	VerifyEmailBody,
} from './dto/auth.dto';

const DUMMY_BCRYPT_HASH = '$2b$12$LJ3m4sMKfRJf5TQ3GV8HYOsYfTX2v7mX5qW8pN6rK1cC0zN5m0V9e';

@Injectable()
export class AuthService {
	private readonly logger = new Logger(AuthService.name);

	constructor(
		private readonly config: AppConfigService,
		private readonly crypto: AuthCryptoService,
		private readonly email: EmailService,
		private readonly authRepository: AuthRepository,
		private readonly usersService: UsersService,
		private readonly memberships: MembershipsService,
		private readonly membershipsRepository: MembershipsRepository,
		private readonly permissions: PermissionsService,
		private readonly mfa: MfaService,
		private readonly passkeys: PasskeysService,
		private readonly socialAuth: SocialAuthService,
		private readonly membershipInvites: MembershipInvitesService,
	) {}

	async register(body: RegisterBody): Promise<RegistrationResult> {
		const passwordHash = await this.crypto.hashPassword(body.password);
		const user = await this.usersService.createUser({
			email: body.email,
			username: body.username,
			passwordHash,
		});
		const challenge = await this.issueChallenge(user, 'email_verification');
		return { ...challenge, user: toPublicUser(user) };
	}

	async verifyEmail(body: VerifyEmailBody): Promise<PublicUser> {
		const user = await this.usersService.findByEmail(body.email);
		if (!user) {
			throw invalidOtpException();
		}
		if (user.emailVerifiedAt) {
			return toPublicUser(user);
		}

		const challenge = await this.validateChallenge(body.email, 'email_verification', body.code);
		await this.authRepository.completeEmailVerification(challenge.id, user.id);
		const verifiedUser = await this.usersService.findById(user.id);
		if (!verifiedUser) {
			throw new Error('Verified user could not be loaded');
		}
		await this.membershipInvites.applyPendingInvitesForUser(verifiedUser);
		return toPublicUser(verifiedUser);
	}

	async resendVerification(body: EmailBody): Promise<AuthChallengeResult> {
		const user = await this.usersService.findByEmail(body.email);
		if (!user || user.emailVerifiedAt) {
			return acceptedChallenge('If the account requires verification, a code has been sent.');
		}
		return this.issueChallenge(user, 'email_verification');
	}

	async login(body: LoginBody, metadata: RequestMetadata): Promise<LoginResult> {
		const user = await this.usersService.findByEmail(body.email);
		if (!user) {
			await this.crypto.verifyPassword(body.password, DUMMY_BCRYPT_HASH);
			throw invalidCredentialsException();
		}

		if (user.lockedUntil && user.lockedUntil > new Date()) {
			throw new HttpException(
				{
					code: 'AUTH_ACCOUNT_LOCKED',
					message: 'Too many failed attempts. Try again later.',
				},
				HttpStatus.LOCKED,
			);
		}

		const passwordValid = user.passwordHash
			? await this.crypto.verifyPassword(body.password, user.passwordHash)
			: await this.consumePasswordTiming(body.password);
		if (!passwordValid) {
			await this.usersService.recordFailedLogin(
				user,
				this.config.maxLoginAttempts,
				this.config.loginLockMinutes,
			);
			throw invalidCredentialsException();
		}

		if (!user.isActive) {
			throw new UnauthorizedException({
				code: 'AUTH_ACCOUNT_INACTIVE',
				message: 'This account is inactive',
			});
		}
		if (!user.emailVerifiedAt) {
			throw new ForbiddenException({
				code: 'AUTH_EMAIL_NOT_VERIFIED',
				message: 'Verify your email before signing in',
			});
		}

		await this.usersService.resetFailedLogins(user.id);
		if (await this.mfa.isTotpEnabled(user.id)) {
			return this.createMfaChallenge(user);
		}
		return this.createSession(user, metadata);
	}

	async completeMfaLogin(
		body: ChallengeTokenBody,
		metadata: RequestMetadata,
	): Promise<AuthSessionResult> {
		const challenge = await this.requireTokenChallenge(body.challengeToken, 'mfa_login');
		if (!(await this.mfa.verifyLoginCode(challenge.userId, body.code))) {
			await this.recordInvalidChallengeAttempt(challenge);
			throw invalidOtpException();
		}
		if (!(await this.authRepository.consumeChallenge(challenge.id))) throw invalidOtpException();
		const user = await this.usersService.findById(challenge.userId);
		if (!user?.isActive) throw invalidCredentialsException();
		return this.createSession(user, metadata);
	}

	async requestMagicLink(body: EmailBody): Promise<AuthChallengeResult> {
		const user = await this.usersService.findByEmail(body.email);
		const accepted = acceptedChallenge(
			'If an account exists, a secure sign-in link has been sent.',
		);
		if (!user?.isActive || !user.emailVerifiedAt) return accepted;
		const challengeId = randomUUID();
		const token = this.crypto.createChallengeToken(challengeId);
		await this.authRepository.createChallenge({
			id: challengeId,
			userId: user.id,
			email: user.email,
			purpose: 'magic_link',
			codeHash: this.crypto.hashChallengeToken('magic_link', user.email, token),
			expiresAt: new Date(Date.now() + this.config.magicLinkTtlMinutes * 60_000),
		});
		const url = `${this.config.webAppUrl}/magic-link?token=${encodeURIComponent(token)}`;
		await this.email.sendMagicLink(user.email, url);
		return {
			...accepted,
			...(this.config.exposeAuthCodes ? { developmentToken: token } : {}),
		};
	}

	async consumeMagicLink(token: string, metadata: RequestMetadata): Promise<AuthSessionResult> {
		const challenge = await this.requireTokenChallenge(token, 'magic_link');
		if (!(await this.authRepository.consumeChallenge(challenge.id))) throw invalidMagicLink();
		const user = await this.usersService.findById(challenge.userId);
		if (!user?.isActive) throw invalidMagicLink();
		return this.createSession(user, metadata);
	}

	async googleLogin(credential: string, metadata: RequestMetadata): Promise<AuthSessionResult> {
		return this.createSession(await this.socialAuth.authenticateGoogle(credential), metadata);
	}

	getAuthProviders() {
		return this.socialAuth.getProviders();
	}

	beginPasskeyLogin(email?: string) {
		return this.passkeys.beginAuthentication(email);
	}

	async finishPasskeyLogin(
		input: Parameters<PasskeysService['finishAuthentication']>[0],
		metadata: RequestMetadata,
	): Promise<AuthSessionResult> {
		return this.createSession(await this.passkeys.finishAuthentication(input), metadata);
	}

	async refresh(refreshToken: string, metadata?: RequestMetadata): Promise<AuthSessionResult> {
		const sessionId = this.crypto.getSessionIdFromRefreshToken(refreshToken);
		if (!sessionId) {
			throw invalidRefreshTokenException();
		}

		const session = await this.authRepository.findSessionById(sessionId);
		if (!isSessionActive(session)) {
			throw invalidRefreshTokenException();
		}

		if (!this.crypto.verifyRefreshToken(refreshToken, session.refreshTokenHash)) {
			await this.authRepository.revokeAllSessions(session.userId, 'refresh_token_reuse_detected');
			throw invalidRefreshTokenException();
		}

		const user = await this.usersService.findById(session.userId);
		if (!user?.isActive) {
			await this.authRepository.revokeSession(session.id, session.userId, 'user_inactive');
			throw invalidRefreshTokenException();
		}

		// IPs change all the time on phones, so a new address is not treated as theft. A different
		// browser or app using the same refresh token is unusual enough to leave a trace.
		if (metadata?.userAgent && session.userAgent && metadata.userAgent !== session.userAgent) {
			this.logger.warn(
				`Session ${session.id} for user ${session.userId} refreshed from a different user agent`,
			);
		}

		const nextRefreshToken = this.crypto.createRefreshToken(session.id);
		const expiresAt = this.getSessionExpiry();
		const rotated = await this.authRepository.rotateSession(
			session.id,
			session.refreshTokenHash,
			this.crypto.hashRefreshToken(nextRefreshToken),
			expiresAt,
			metadata,
		);
		if (!rotated) {
			throw invalidRefreshTokenException();
		}

		const activeSession = await this.reconcileSessionTenantContext(rotated);
		return this.buildSessionResult(user, activeSession, nextRefreshToken);
	}

	async switchTenant(user: AccessTokenPayload, tenantId: string): Promise<PublicAuthSession> {
		const membership = await this.memberships.requireActiveMembership(user.sub, tenantId);
		const session = await this.authRepository.findSessionById(user.sid);
		if (!isSessionActive(session) || session.userId !== user.sub) {
			throw invalidRefreshTokenException();
		}

		const updated = await this.authRepository.updateActiveTenantContext({
			sessionId: user.sid,
			userId: user.sub,
			activeTenantId: membership.tenantId,
			activeMembershipId: membership.id,
		});
		if (!updated) {
			throw invalidRefreshTokenException();
		}

		return this.buildAccessSession(user.sub, updated);
	}

	async logout(refreshToken: string | null): Promise<void> {
		if (!refreshToken) {
			return;
		}
		const sessionId = this.crypto.getSessionIdFromRefreshToken(refreshToken);
		if (!sessionId) {
			return;
		}
		const session = await this.authRepository.findSessionById(sessionId);
		if (session && this.crypto.verifyRefreshToken(refreshToken, session.refreshTokenHash)) {
			await this.authRepository.revokeSession(session.id, session.userId, 'logout');
		}
	}

	async logoutAll(userId: string): Promise<void> {
		await this.authRepository.revokeAllSessions(userId, 'logout_all');
	}

	async me(userId: string): Promise<PublicUser> {
		return this.usersService.getCurrentUser(userId);
	}

	async previewInvite(token: string) {
		return this.membershipInvites.previewInvite(token);
	}

	async listPendingInvites(userId: string) {
		const user = await this.usersService.findById(userId);
		if (!user) {
			throw new UnauthorizedException({
				code: 'AUTH_USER_NOT_FOUND',
				message: 'User not found',
			});
		}
		return this.membershipInvites.listPendingInvitesForUser(user);
	}

	async acceptInvite(userId: string, input: { token?: string; inviteId?: string }) {
		const user = await this.usersService.findById(userId);
		if (!user) {
			throw new UnauthorizedException({
				code: 'AUTH_USER_NOT_FOUND',
				message: 'User not found',
			});
		}
		if (input.inviteId) {
			return this.membershipInvites.acceptInviteById(user, input.inviteId);
		}
		if (input.token) {
			return this.membershipInvites.acceptInvite(user, input.token);
		}
		throw new BadRequestException({
			code: 'VALIDATION_ERROR',
			message: 'Either token or inviteId is required',
		});
	}

	async forgotPassword(body: EmailBody): Promise<AuthChallengeResult> {
		const user = await this.usersService.findByEmail(body.email);
		if (!user?.isActive) {
			return acceptedChallenge('If an account exists, a password reset code has been sent.');
		}
		return this.issueChallenge(user, 'password_reset');
	}

	async resetPassword(body: ResetPasswordBody): Promise<AuthChallengeResult> {
		const user = await this.usersService.findByEmail(body.email);
		if (!user) {
			throw invalidOtpException();
		}
		const challenge = await this.validateChallenge(body.email, 'password_reset', body.code);
		const passwordHash = await this.crypto.hashPassword(body.newPassword);
		await this.authRepository.completePasswordReset({
			challengeId: challenge.id,
			userId: user.id,
			passwordHash,
		});
		return acceptedChallenge('Password reset successfully. Sign in with your new password.');
	}

	async changePassword(
		user: AccessTokenPayload,
		body: ChangePasswordBody,
	): Promise<ChangePasswordResult> {
		const record = await this.usersService.findById(user.sub);
		if (
			!record?.passwordHash ||
			!(await this.crypto.verifyPassword(body.currentPassword, record.passwordHash))
		) {
			throw new UnauthorizedException({
				code: 'AUTH_CURRENT_PASSWORD_INVALID',
				message: 'Current password is incorrect',
			});
		}
		const passwordHash = await this.crypto.hashPassword(body.newPassword);
		const refreshToken = this.crypto.createRefreshToken(user.sid);
		await this.authRepository.changePassword({
			userId: user.sub,
			currentSessionId: user.sid,
			passwordHash,
			refreshTokenHash: this.crypto.hashRefreshToken(refreshToken),
		});
		return {
			...acceptedChallenge('Password changed successfully. Other sessions were signed out.'),
			refreshToken,
		};
	}

	async authenticateAccessToken(token: string): Promise<AccessTokenPayload> {
		const payload = await this.crypto.verifyAccessToken(token);
		const session = await this.authRepository.findSessionById(payload.sid);
		if (!isSessionActive(session) || session.userId !== payload.sub) {
			throw new UnauthorizedException({
				code: 'AUTH_SESSION_INVALID',
				message: 'Session is no longer active',
			});
		}
		const user = await this.usersService.findById(payload.sub);
		if (!user?.isActive) {
			throw new UnauthorizedException({
				code: 'AUTH_SESSION_INVALID',
				message: 'Session is no longer active',
			});
		}

		if (!payload.tid || !payload.mid) {
			return payload;
		}

		if (session.activeTenantId !== payload.tid || session.activeMembershipId !== payload.mid) {
			throw invalidTenantContextException();
		}

		const membership = await this.membershipsRepository.findActiveById(payload.mid);
		if (!membership || membership.userId !== payload.sub || membership.tenantId !== payload.tid) {
			throw invalidTenantContextException();
		}

		return payload;
	}

	async listSessions(user: AccessTokenPayload): Promise<SessionView[]> {
		const sessions = await this.authRepository.listActiveSessions(user.sub);
		return sessions.map((session) => ({
			id: session.id,
			userAgent: session.userAgent,
			ipAddress: session.ipAddress,
			createdAt: session.createdAt.toISOString(),
			lastUsedAt: session.lastUsedAt.toISOString(),
			expiresAt: session.expiresAt.toISOString(),
			isCurrent: session.id === user.sid,
		}));
	}

	async revokeSession(user: AccessTokenPayload, sessionId: string): Promise<{ current: boolean }> {
		await this.authRepository.revokeSession(sessionId, user.sub, 'user_revoked');
		return { current: sessionId === user.sid };
	}

	toPublicSession(result: AuthSessionResult): PublicAuthSession {
		return {
			accessToken: result.accessToken,
			accessTokenExpiresAt: result.accessTokenExpiresAt,
			user: result.user,
			tenantContext: result.tenantContext ?? null,
		};
	}

	toClientSession(result: AuthSessionResult, includeRefreshToken: boolean): ClientAuthSession {
		return includeRefreshToken ? result : this.toPublicSession(result);
	}

	toPublicLoginResult(result: LoginResult): ClientLoginResult {
		return this.toClientLoginResult(result, false);
	}

	toClientLoginResult(result: LoginResult, includeRefreshToken: boolean): ClientLoginResult {
		return 'requiresTwoFactor' in result
			? result
			: this.toClientSession(result, includeRefreshToken);
	}

	private async createSession(
		user: UserRecord,
		metadata: RequestMetadata,
	): Promise<AuthSessionResult> {
		await this.membershipInvites.applyPendingInvitesForUser(user);
		const sessionId = randomUUID();
		const refreshToken = this.crypto.createRefreshToken(sessionId);
		const defaultTenant = await this.resolveDefaultTenantContext(user.id);
		const session = await this.authRepository.createSession({
			id: sessionId,
			userId: user.id,
			refreshTokenHash: this.crypto.hashRefreshToken(refreshToken),
			expiresAt: this.getSessionExpiry(),
			metadata,
			activeTenantId: defaultTenant?.tenantId ?? null,
			activeMembershipId: defaultTenant?.membershipId ?? null,
		});
		return this.buildSessionResult(user, session, refreshToken);
	}

	private async createMfaChallenge(user: UserRecord): Promise<MfaLoginChallenge> {
		const challengeId = randomUUID();
		const token = this.crypto.createChallengeToken(challengeId);
		const expiresAt = new Date(Date.now() + this.config.mfaChallengeTtlMinutes * 60_000);
		await this.authRepository.createChallenge({
			id: challengeId,
			userId: user.id,
			email: user.email,
			purpose: 'mfa_login',
			codeHash: this.crypto.hashChallengeToken('mfa_login', user.email, token),
			expiresAt,
		});
		return {
			requiresTwoFactor: true,
			challengeToken: token,
			expiresAt: expiresAt.toISOString(),
			methods: ['totp', 'recovery_code'],
		};
	}

	private async requireTokenChallenge(
		token: string,
		purpose: 'magic_link' | 'mfa_login',
	): Promise<AuthChallengeRecord> {
		const challengeId = this.crypto.getChallengeId(token);
		const challenge = challengeId ? await this.authRepository.findChallengeById(challengeId) : null;
		if (
			!challenge ||
			challenge.purpose !== purpose ||
			challenge.consumedAt ||
			challenge.expiresAt <= new Date() ||
			challenge.attempts >= this.config.otpMaxAttempts ||
			!this.crypto.verifyChallengeToken(purpose, challenge.email, token, challenge.codeHash)
		) {
			throw purpose === 'magic_link' ? invalidMagicLink() : invalidOtpException();
		}
		return challenge;
	}

	private async recordInvalidChallengeAttempt(challenge: AuthChallengeRecord): Promise<void> {
		const attempts = challenge.attempts + 1;
		await this.authRepository.recordChallengeAttempt(
			challenge.id,
			attempts,
			attempts >= this.config.otpMaxAttempts,
		);
	}

	private async buildSessionResult(
		user: UserRecord,
		session: SessionRecord,
		refreshToken: string,
	): Promise<AuthSessionResult> {
		const accessSession = await this.buildAccessSession(user.id, session);
		return {
			...accessSession,
			refreshToken,
			user: toPublicUser(user),
		};
	}

	private async buildAccessSession(
		userId: string,
		session: SessionRecord,
	): Promise<PublicAuthSession> {
		const payload: AccessTokenPayload = { sub: userId, sid: session.id };
		if (session.activeTenantId && session.activeMembershipId) {
			payload.tid = session.activeTenantId;
			payload.mid = session.activeMembershipId;
		}
		const accessToken = await this.crypto.signAccessToken(payload);
		const user = await this.usersService.findById(userId);
		if (!user) {
			throw new Error('User could not be loaded for session');
		}
		const tenantContext = await this.resolvePublicTenantContext(userId, session);
		return {
			accessToken: accessToken.token,
			accessTokenExpiresAt: accessToken.expiresAt.toISOString(),
			user: toPublicUser(user),
			tenantContext,
		};
	}

	private async resolvePublicTenantContext(
		userId: string,
		session: SessionRecord,
	): Promise<PublicTenantContext | null> {
		if (!session.activeTenantId || !session.activeMembershipId) {
			return null;
		}

		const membership = await this.membershipsRepository.findActiveById(session.activeMembershipId);
		if (
			!membership ||
			membership.userId !== userId ||
			membership.tenantId !== session.activeTenantId
		) {
			return null;
		}

		const roles = await this.memberships.listRoleCodes(membership.id, membership.role);

		return {
			id: membership.id,
			tenantId: membership.tenantId,
			membershipId: membership.id,
			role: membership.role,
			permissions: [...this.permissions.getPermissionsForRoles(roles)],
		};
	}

	private async resolveDefaultTenantContext(userId: string) {
		const tenantIds = await this.membershipsRepository.listActiveTenantIdsForUser(userId);
		if (tenantIds.length !== 1) {
			return null;
		}
		const tenantId = tenantIds[0];
		if (!tenantId) {
			return null;
		}
		const membership = await this.membershipsRepository.findActiveByTenantAndUser(tenantId, userId);
		if (!membership) {
			return null;
		}
		return { tenantId: membership.tenantId, membershipId: membership.id };
	}

	private async reconcileSessionTenantContext(session: SessionRecord): Promise<SessionRecord> {
		if (!session.activeTenantId || !session.activeMembershipId) {
			return session;
		}

		const membership = await this.membershipsRepository.findActiveById(session.activeMembershipId);
		if (
			!membership ||
			membership.userId !== session.userId ||
			membership.tenantId !== session.activeTenantId
		) {
			await this.authRepository.clearActiveTenantContext(session.id);
			return { ...session, activeTenantId: null, activeMembershipId: null };
		}

		return session;
	}

	private async issueChallenge(
		user: UserRecord,
		purpose: AuthChallengePurpose,
	): Promise<AuthChallengeResult> {
		const code = this.crypto.generateOtp();
		await this.authRepository.createChallenge({
			userId: user.id,
			email: user.email,
			purpose,
			codeHash: this.crypto.hashOtp(purpose, user.email, code),
			expiresAt: new Date(Date.now() + this.config.otpTtlMinutes * 60_000),
		});

		if (purpose === 'email_verification') {
			await this.email.sendVerificationCode(user.email, code);
		} else {
			await this.email.sendPasswordResetCode(user.email, code);
		}

		return {
			accepted: true,
			message:
				purpose === 'email_verification'
					? 'A verification code has been sent.'
					: 'If an account exists, a password reset code has been sent.',
			...(this.config.exposeAuthCodes ? { developmentCode: code } : {}),
		};
	}

	private async validateChallenge(
		email: string,
		purpose: AuthChallengePurpose,
		code: string,
	): Promise<AuthChallengeRecord> {
		const challenge = await this.authRepository.findLatestChallenge(email, purpose);
		if (
			!challenge ||
			challenge.expiresAt <= new Date() ||
			challenge.attempts >= this.config.otpMaxAttempts
		) {
			throw invalidOtpException();
		}

		if (!this.crypto.verifyOtp(purpose, email, code, challenge.codeHash)) {
			const attempts = challenge.attempts + 1;
			await this.authRepository.recordChallengeAttempt(
				challenge.id,
				attempts,
				attempts >= this.config.otpMaxAttempts,
			);
			throw invalidOtpException();
		}
		return challenge;
	}

	private getSessionExpiry(): Date {
		return new Date(Date.now() + this.config.sessionTtlDays * 86_400_000);
	}

	private async consumePasswordTiming(password: string): Promise<false> {
		await this.crypto.verifyPassword(password, DUMMY_BCRYPT_HASH);
		return false;
	}
}

function isSessionActive(session: SessionRecord | null): session is SessionRecord {
	return session !== null && session.revokedAt === null && session.expiresAt > new Date();
}

function acceptedChallenge(message: string): AuthChallengeResult {
	return { accepted: true, message };
}

function invalidCredentialsException(): UnauthorizedException {
	return new UnauthorizedException({
		code: 'AUTH_INVALID_CREDENTIALS',
		message: 'Invalid email or password',
	});
}

function invalidRefreshTokenException(): UnauthorizedException {
	return new UnauthorizedException({
		code: 'AUTH_REFRESH_TOKEN_INVALID',
		message: 'Session could not be refreshed',
	});
}

function invalidOtpException(): UnauthorizedException {
	return new UnauthorizedException({
		code: 'AUTH_OTP_INVALID',
		message: 'The code is invalid or expired',
	});
}

function invalidMagicLink(): UnauthorizedException {
	return new UnauthorizedException({
		code: 'MAGIC_LINK_INVALID',
		message: 'The sign-in link is invalid or expired',
	});
}

function invalidTenantContextException(): UnauthorizedException {
	return new UnauthorizedException({
		code: 'AUTH_TENANT_CONTEXT_INVALID',
		message: 'Active organization context is no longer valid',
	});
}
