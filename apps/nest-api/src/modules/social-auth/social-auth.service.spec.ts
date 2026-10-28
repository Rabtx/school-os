import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { AppConfigService } from '@/config/app-config.service';
import type { MembershipsRepository } from '@/modules/memberships/memberships.repository';
import type { UsersService } from '@/modules/users/users.service';
import type { SocialAuthRepository } from './social-auth.repository';
import { SocialAuthService } from './social-auth.service';

const { verifyIdTokenMock } = vi.hoisted(() => ({ verifyIdTokenMock: vi.fn() }));

vi.mock('google-auth-library', () => ({
	OAuth2Client: class {
		verifyIdToken = verifyIdTokenMock;
	},
}));

function googleProfile(email: string) {
	return {
		getPayload: () => ({ sub: 'google-sub', email, email_verified: true, name: 'Ayesha' }),
	};
}

describe('SocialAuthService.authenticateGoogle', () => {
	let repository: SocialAuthRepository;
	let users: UsersService;
	let memberships: MembershipsRepository;

	beforeEach(() => {
		vi.clearAllMocks();
		repository = {
			findIdentity: vi.fn().mockResolvedValue(null),
			create: vi.fn(),
		} as unknown as SocialAuthRepository;
		users = {
			findByEmail: vi.fn().mockResolvedValue(null),
			createFederatedUser: vi.fn().mockResolvedValue({ id: 'user-1', isActive: true }),
		} as unknown as UsersService;
		memberships = {
			listPendingInvitesForEmail: vi.fn().mockResolvedValue([]),
		} as unknown as MembershipsRepository;
	});

	function service(allowedDomains: string[]) {
		return new SocialAuthService(
			{ googleClientId: 'client-id', googleAllowedDomains: allowedDomains } as AppConfigService,
			repository,
			users,
			memberships,
		);
	}

	it('creates an account for any verified Google email when no domains are configured', async () => {
		verifyIdTokenMock.mockResolvedValue(googleProfile('someone@gmail.com'));

		await expect(service([]).authenticateGoogle('credential')).resolves.toMatchObject({
			id: 'user-1',
		});
		expect(users.createFederatedUser).toHaveBeenCalledOnce();
	});

	it('creates an account for an allowed domain', async () => {
		verifyIdTokenMock.mockResolvedValue(googleProfile('teacher@greenfield.edu.pk'));

		await service(['greenfield.edu.pk']).authenticateGoogle('credential');

		expect(users.createFederatedUser).toHaveBeenCalledOnce();
	});

	it('refuses a new account from another domain', async () => {
		verifyIdTokenMock.mockResolvedValue(googleProfile('stranger@gmail.com'));

		await expect(
			service(['greenfield.edu.pk']).authenticateGoogle('credential'),
		).rejects.toMatchObject({
			response: { code: 'SOCIAL_SIGNUP_DOMAIN_NOT_ALLOWED' },
		});
		expect(users.createFederatedUser).not.toHaveBeenCalled();
	});

	it('lets an invited email from another domain create its account', async () => {
		verifyIdTokenMock.mockResolvedValue(googleProfile('parent@gmail.com'));
		vi.mocked(memberships.listPendingInvitesForEmail).mockResolvedValue([
			{ expiresAt: new Date(Date.now() + 60_000) },
		] as never);

		await service(['greenfield.edu.pk']).authenticateGoogle('credential');

		expect(memberships.listPendingInvitesForEmail).toHaveBeenCalledWith('parent@gmail.com');
		expect(users.createFederatedUser).toHaveBeenCalledOnce();
	});

	it('does not count an expired invite', async () => {
		verifyIdTokenMock.mockResolvedValue(googleProfile('parent@gmail.com'));
		vi.mocked(memberships.listPendingInvitesForEmail).mockResolvedValue([
			{ expiresAt: new Date(Date.now() - 60_000) },
		] as never);

		await expect(
			service(['greenfield.edu.pk']).authenticateGoogle('credential'),
		).rejects.toMatchObject({
			response: { code: 'SOCIAL_SIGNUP_DOMAIN_NOT_ALLOWED' },
		});
	});
});
