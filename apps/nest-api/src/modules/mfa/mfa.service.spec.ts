import { generate } from 'otplib';
import { beforeEach, describe, expect, it, type Mocked, vi } from 'vitest';

import { AppConfigService } from '@/config/app-config.service';
import type { TotpFactorRecord } from '@/database/schema';
import { AuthCryptoService } from '@/modules/auth/auth-crypto.service';
import { UsersService } from '@/modules/users/users.service';
import { MfaRepository } from './mfa.repository';
import { MfaService } from './mfa.service';

describe('MfaService', () => {
	const config = new AppConfigService();
	const crypto = new AuthCryptoService(config);
	let repository: Mocked<MfaRepository>;
	let factor: TotpFactorRecord | null;
	let service: MfaService;

	beforeEach(() => {
		factor = null;
		repository = {
			getTotpFactor: vi.fn(async () => factor),
			savePendingTotp: vi.fn(async (userId, secretEncrypted) => {
				factor = {
					userId,
					secretEncrypted,
					isEnabled: false,
					verifiedAt: null,
					createdAt: new Date(),
					updatedAt: new Date(),
				};
			}),
			enableTotp: vi.fn(),
		} as unknown as Mocked<MfaRepository>;
		const users = {
			getCurrentUser: vi.fn().mockResolvedValue({
				id: 'a01a0cab-a947-44f0-bfcd-4b8e8c907534',
				email: 'starter@example.com',
				username: 'starter',
				isActive: true,
				emailVerified: true,
				hasPassword: true,
				createdAt: new Date().toISOString(),
			}),
		} as unknown as UsersService;
		service = new MfaService(config, crypto, repository, users);
	});

	it('requires a valid authenticator code before enabling TOTP', async () => {
		const setup = await service.beginTotpSetup('a01a0cab-a947-44f0-bfcd-4b8e8c907534');
		const code = await generate({ secret: setup.secret });
		const result = await service.confirmTotpSetup('a01a0cab-a947-44f0-bfcd-4b8e8c907534', code);

		expect(setup.qrCodeDataUrl).toMatch(/^data:image\/png;base64,/);
		expect(repository.enableTotp).toHaveBeenCalledOnce();
		expect(result.recoveryCodes).toHaveLength(10);
		expect(new Set(result.recoveryCodes).size).toBe(10);
	});

	it('refuses to restart setup while TOTP is enabled, so it cannot be switched off without a code', async () => {
		factor = {
			userId: 'a01a0cab-a947-44f0-bfcd-4b8e8c907534',
			secretEncrypted: 'secret',
			isEnabled: true,
			verifiedAt: new Date(),
			createdAt: new Date(),
			updatedAt: new Date(),
		};

		await expect(
			service.beginTotpSetup('a01a0cab-a947-44f0-bfcd-4b8e8c907534'),
		).rejects.toMatchObject({ response: { code: 'MFA_ALREADY_ENABLED' } });
		expect(repository.savePendingTotp).not.toHaveBeenCalled();
	});
});
