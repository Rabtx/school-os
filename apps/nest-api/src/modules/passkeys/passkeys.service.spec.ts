import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { AppConfigService } from '@/config/app-config.service';
import type { AuthCryptoService } from '@/modules/auth/auth-crypto.service';
import type { UsersService } from '@/modules/users/users.service';
import type { PasskeysRepository } from './passkeys.repository';

const { generateAuthenticationOptionsMock } = vi.hoisted(() => ({
	generateAuthenticationOptionsMock: vi.fn(),
}));

vi.mock('@simplewebauthn/server', async (importOriginal) => ({
	...(await importOriginal<typeof import('@simplewebauthn/server')>()),
	generateAuthenticationOptions: generateAuthenticationOptionsMock,
}));

import { PasskeysService } from './passkeys.service';

describe('PasskeysService', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		generateAuthenticationOptionsMock.mockResolvedValue({ challenge: 'challenge-value' });
	});

	it('starts discoverable authentication without an email address', async () => {
		const repository = {
			createAuthenticationChallenge: vi.fn().mockResolvedValue({ id: 'challenge-id' }),
			listForUser: vi.fn(),
		} as unknown as PasskeysRepository;
		const users = {
			findByEmail: vi.fn(),
		} as unknown as UsersService;
		const crypto = {
			hashOtp: vi.fn().mockReturnValue('challenge-hash'),
		} as unknown as AuthCryptoService;
		const service = new PasskeysService(
			{
				webAuthnRpId: 'localhost',
				mfaChallengeTtlMinutes: 5,
			} as AppConfigService,
			crypto,
			repository,
			users,
		);

		const result = await service.beginAuthentication();

		expect(result.challengeId).toBe('challenge-id');
		expect(users.findByEmail).not.toHaveBeenCalled();
		expect(repository.listForUser).not.toHaveBeenCalled();
		expect(generateAuthenticationOptionsMock).toHaveBeenCalledWith({
			rpID: 'localhost',
			userVerification: 'required',
		});
		expect(repository.createAuthenticationChallenge).toHaveBeenCalledWith({
			userId: null,
			challengeHash: 'challenge-hash',
			expiresAt: expect.any(Date),
		});
		expect(crypto.hashOtp).toHaveBeenCalledWith(
			'webauthn_authentication',
			'discoverable',
			'challenge-value',
		);
	});
	it.each([
		['an unknown email', null, []],
		['an inactive account', { id: 'user-1', isActive: false }, []],
		['an account without passkeys', { id: 'user-1', isActive: true }, []],
	])('answers %s exactly like a discoverable request', async (_case, found, passkeys) => {
		const repository = {
			createAuthenticationChallenge: vi.fn().mockResolvedValue({ id: 'challenge-id' }),
			listForUser: vi.fn().mockResolvedValue(passkeys),
		} as unknown as PasskeysRepository;
		const users = { findByEmail: vi.fn().mockResolvedValue(found) } as unknown as UsersService;
		const crypto = {
			hashOtp: vi.fn().mockReturnValue('challenge-hash'),
		} as unknown as AuthCryptoService;
		const service = new PasskeysService(
			{ webAuthnRpId: 'localhost', mfaChallengeTtlMinutes: 5 } as AppConfigService,
			crypto,
			repository,
			users,
		);

		const result = await service.beginAuthentication('someone@example.com');

		expect(result.challengeId).toBe('challenge-id');
		expect(generateAuthenticationOptionsMock).toHaveBeenCalledWith({
			rpID: 'localhost',
			userVerification: 'required',
		});
		expect(repository.createAuthenticationChallenge).toHaveBeenCalledWith(
			expect.objectContaining({ userId: null }),
		);
		expect(crypto.hashOtp).toHaveBeenCalledWith(
			'webauthn_authentication',
			'discoverable',
			'challenge-value',
		);
	});

	it('narrows the prompt to the passkeys of an account that has them', async () => {
		const repository = {
			createAuthenticationChallenge: vi.fn().mockResolvedValue({ id: 'challenge-id' }),
			listForUser: vi
				.fn()
				.mockResolvedValue([{ credentialId: 'cred-1', transports: ['internal'] }]),
		} as unknown as PasskeysRepository;
		const users = {
			findByEmail: vi.fn().mockResolvedValue({ id: 'user-1', isActive: true }),
		} as unknown as UsersService;
		const crypto = {
			hashOtp: vi.fn().mockReturnValue('challenge-hash'),
		} as unknown as AuthCryptoService;
		const service = new PasskeysService(
			{ webAuthnRpId: 'localhost', mfaChallengeTtlMinutes: 5 } as AppConfigService,
			crypto,
			repository,
			users,
		);

		await service.beginAuthentication('someone@example.com');

		expect(generateAuthenticationOptionsMock).toHaveBeenCalledWith(
			expect.objectContaining({ allowCredentials: [{ id: 'cred-1', transports: ['internal'] }] }),
		);
		expect(repository.createAuthenticationChallenge).toHaveBeenCalledWith(
			expect.objectContaining({ userId: 'user-1' }),
		);
	});
});
