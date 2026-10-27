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
});
