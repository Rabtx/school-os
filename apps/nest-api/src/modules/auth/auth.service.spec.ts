import { afterEach, beforeEach, describe, expect, it, type Mocked, vi } from 'vitest';
import { AppConfigService } from '@/config/app-config.service';
import type { AuthChallengeRecord, UserRecord } from '@/database/schema';
import { EmailService } from '@/modules/email/email.service';
import { MfaService } from '@/modules/mfa/mfa.service';
import { PasskeysService } from '@/modules/passkeys/passkeys.service';
import { SocialAuthService } from '@/modules/social-auth/social-auth.service';
import { UsersService } from '@/modules/users/users.service';
import { AuthRepository } from './auth.repository';
import { AuthService } from './auth.service';
import { AuthCryptoService } from './auth-crypto.service';

const user: UserRecord = {
	id: 'a01a0cab-a947-44f0-bfcd-4b8e8c907534',
	email: 'starter@example.com',
	username: 'starter',
	passwordHash: 'password-hash',
	emailVerifiedAt: null,
	isActive: true,
	failedLoginAttempts: 0,
	lockedUntil: null,
	passwordChangedAt: new Date('2026-07-13T00:00:00.000Z'),
	createdAt: new Date('2026-07-13T00:00:00.000Z'),
	updatedAt: new Date('2026-07-13T00:00:00.000Z'),
};

describe('AuthService', () => {
	let authRepository: Mocked<AuthRepository>;
	let crypto: Mocked<AuthCryptoService>;
	let email: Mocked<EmailService>;
	let usersService: Mocked<UsersService>;
	let service: AuthService;

	beforeEach(() => {
		authRepository = {
			createChallenge: vi.fn(),
		} as unknown as Mocked<AuthRepository>;
		crypto = {
			hashPassword: vi.fn().mockResolvedValue('password-hash'),
			generateOtp: vi.fn().mockReturnValue('123456'),
			hashOtp: vi.fn().mockReturnValue('otp-hash'),
		} as unknown as Mocked<AuthCryptoService>;
		email = {
			sendVerificationCode: vi.fn().mockResolvedValue(undefined),
			sendPasswordResetCode: vi.fn().mockResolvedValue(undefined),
		} as unknown as Mocked<EmailService>;
		usersService = {
			createUser: vi.fn().mockResolvedValue(user),
		} as unknown as Mocked<UsersService>;
		vi.stubEnv('AUTH_DEV_EXPOSE_CODES', 'true');
		service = new AuthService(
			new AppConfigService(),
			crypto,
			email,
			authRepository,
			usersService,
			{
				requireActiveMembership: vi.fn(),
				listRoleCodes: vi.fn().mockResolvedValue(['owner']),
			} as unknown as import('@/modules/memberships/memberships.service').MembershipsService,
			{
				listActiveTenantIdsForUser: vi.fn().mockResolvedValue([]),
				findActiveByTenantAndUser: vi.fn(),
				findActiveById: vi.fn(),
			} as unknown as import('@/modules/memberships/memberships.repository').MembershipsRepository,
			{
				getPermissionsForRole: vi.fn().mockReturnValue([]),
				getPermissionsForRoles: vi.fn().mockReturnValue([]),
			} as unknown as import('@/modules/authorization/permissions.service').PermissionsService,
			{ isTotpEnabled: vi.fn().mockResolvedValue(false) } as unknown as MfaService,
			{} as PasskeysService,
			{} as SocialAuthService,
			{
				applyPendingInvitesForUser: vi.fn().mockResolvedValue([]),
			} as unknown as import('@/modules/memberships/membership-invites.service').MembershipInvitesService,
		);
	});

	afterEach(() => {
		vi.unstubAllEnvs();
	});

	it('registers a user and persists only a hashed verification code', async () => {
		authRepository.createChallenge.mockResolvedValue({
			id: '84c5bd4b-2a8f-4a89-85db-c22f45dc2ab9',
			userId: user.id,
			email: user.email,
			purpose: 'email_verification',
			codeHash: 'otp-hash',
			attempts: 0,
			expiresAt: new Date(Date.now() + 600_000),
			consumedAt: null,
			createdAt: new Date(),
		} satisfies AuthChallengeRecord);

		const result = await service.register({
			email: user.email,
			username: user.username,
			password: 'a-strong-test-password',
		});

		expect(authRepository.createChallenge).toHaveBeenCalledWith(
			expect.objectContaining({ codeHash: 'otp-hash' }),
		);
		expect(authRepository.createChallenge).not.toHaveBeenCalledWith(
			expect.objectContaining({ codeHash: '123456' }),
		);
		expect(email.sendVerificationCode).toHaveBeenCalledWith(user.email, '123456');
		expect(result.user).not.toHaveProperty('passwordHash');
		expect(result.developmentCode).toBe('123456');
	});

	it('never includes a refresh token in the public session response', () => {
		const result = service.toPublicSession({
			accessToken: 'access-token',
			accessTokenExpiresAt: '2026-07-13T00:15:00.000Z',
			refreshToken: 'refresh-token',
			user: {
				id: user.id,
				email: user.email,
				username: user.username,
				isActive: true,
				emailVerified: false,
				hasPassword: true,
				createdAt: user.createdAt.toISOString(),
			},
		});

		expect(result).not.toHaveProperty('refreshToken');
	});

	it('includes the refresh token for native client session responses', () => {
		const session = {
			accessToken: 'access-token',
			accessTokenExpiresAt: '2026-07-13T00:15:00.000Z',
			refreshToken: 'refresh-token',
			user: {
				id: user.id,
				email: user.email,
				username: user.username,
				isActive: true,
				emailVerified: false,
				hasPassword: true,
				createdAt: user.createdAt.toISOString(),
			},
		};

		expect(service.toClientSession(session, true)).toEqual(session);
		expect(service.toClientSession(session, false)).not.toHaveProperty('refreshToken');
	});

	it('rotates the current session refresh token when the password changes', async () => {
		usersService.findById = vi.fn().mockResolvedValue(user);
		crypto.verifyPassword = vi.fn().mockResolvedValue(true);
		crypto.createRefreshToken = vi.fn().mockReturnValue('next-refresh-token');
		crypto.hashRefreshToken = vi.fn().mockReturnValue('next-refresh-hash');
		authRepository.changePassword = vi.fn().mockResolvedValue(undefined);
		const caller = { sub: user.id, sid: 'session-1' } as never;

		const nextRefreshToken = service.issueRefreshToken(caller);
		const result = await service.changePassword(
			caller,
			{ currentPassword: 'old-password', newPassword: 'new-password-123' },
			nextRefreshToken,
		);

		expect(crypto.createRefreshToken).toHaveBeenCalledWith('session-1');
		expect(crypto.hashRefreshToken).toHaveBeenCalledWith('next-refresh-token');
		expect(authRepository.changePassword).toHaveBeenCalledWith({
			userId: user.id,
			currentSessionId: 'session-1',
			passwordHash: 'password-hash',
			refreshTokenHash: 'next-refresh-hash',
		});
		expect(result).toMatchObject({ accepted: true });
	});

	it('rejects a wrong current password without touching sessions', async () => {
		usersService.findById = vi.fn().mockResolvedValue(user);
		crypto.verifyPassword = vi.fn().mockResolvedValue(false);
		authRepository.changePassword = vi.fn();

		await expect(
			service.changePassword(
				{ sub: user.id, sid: 'session-1' } as never,
				{
					currentPassword: 'wrong',
					newPassword: 'new-password-123',
				},
				'next-refresh-token',
			),
		).rejects.toMatchObject({ response: { code: 'AUTH_CURRENT_PASSWORD_INVALID' } });
		expect(authRepository.changePassword).not.toHaveBeenCalled();
	});

	describe('refresh', () => {
		const session = {
			id: 'session-1',
			userId: user.id,
			refreshTokenHash: 'stored-hash',
			userAgent: 'Mozilla/5.0 (iPhone) Safari',
			ipAddress: '10.0.0.1',
			revokedAt: null,
			expiresAt: new Date(Date.now() + 86_400_000),
		};

		beforeEach(() => {
			crypto.getSessionIdFromRefreshToken = vi.fn().mockReturnValue('session-1');
			crypto.verifyRefreshToken = vi.fn().mockReturnValue(true);
			crypto.createRefreshToken = vi.fn().mockReturnValue('next-token');
			crypto.hashRefreshToken = vi.fn().mockReturnValue('next-hash');
			authRepository.findSessionById = vi.fn().mockResolvedValue(session);
			// Stop right after rotation; what follows is covered elsewhere.
			authRepository.rotateSession = vi.fn().mockResolvedValue(null);
			usersService.findById = vi.fn().mockResolvedValue(user);
		});

		it('records where the session was used without treating a new IP as theft', async () => {
			const warn = vi.spyOn(Reflect.get(service, 'logger'), 'warn');
			const seenFrom = { ipAddress: '10.9.9.9', userAgent: session.userAgent };

			await expect(service.refresh('refresh-token', seenFrom)).rejects.toMatchObject({
				response: { code: 'AUTH_REFRESH_TOKEN_INVALID' },
			});

			expect(authRepository.rotateSession).toHaveBeenCalledWith(
				'session-1',
				'stored-hash',
				'next-hash',
				expect.any(Date),
				seenFrom,
			);
			expect(warn).not.toHaveBeenCalled();
		});

		it('leaves a warning when a different browser or app uses the session', async () => {
			const warn = vi.spyOn(Reflect.get(service, 'logger'), 'warn');

			await expect(
				service.refresh('refresh-token', { ipAddress: '10.0.0.1', userAgent: 'curl/8.0' }),
			).rejects.toBeDefined();

			expect(warn).toHaveBeenCalledWith(expect.stringContaining('different user agent'));
		});
	});
});
