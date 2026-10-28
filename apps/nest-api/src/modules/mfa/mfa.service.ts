import {
	BadRequestException,
	ConflictException,
	Injectable,
	UnauthorizedException,
} from '@nestjs/common';
import { generateSecret, generateURI, verify } from 'otplib';
import QRCode from 'qrcode';

import { AppConfigService } from '@/config/app-config.service';
import { AuthCryptoService } from '@/modules/auth/auth-crypto.service';
import { UsersService } from '@/modules/users/users.service';
import { MfaRepository } from './mfa.repository';

@Injectable()
export class MfaService {
	constructor(
		private readonly config: AppConfigService,
		private readonly crypto: AuthCryptoService,
		private readonly repository: MfaRepository,
		private readonly users: UsersService,
	) {}

	async getStatus(userId: string) {
		const factor = await this.repository.getTotpFactor(userId);
		return {
			totpEnabled: factor?.isEnabled ?? false,
			recoveryCodesRemaining: factor?.isEnabled
				? await this.repository.countRecoveryCodes(userId)
				: 0,
		};
	}

	async beginTotpSetup(userId: string) {
		// Starting over would replace an enabled factor with a pending one, switching two-factor off
		// without a code. Turning it off goes through `disableTotp`, which asks for one.
		if (await this.isTotpEnabled(userId)) {
			throw new ConflictException({
				code: 'MFA_ALREADY_ENABLED',
				message: 'Two-factor sign-in is already on. Turn it off before setting it up again.',
			});
		}
		const user = await this.users.getCurrentUser(userId);
		const secret = generateSecret();
		const uri = generateURI({ issuer: this.config.appName, label: user.email, secret });
		await this.repository.savePendingTotp(userId, this.crypto.encryptSecret(secret));
		return {
			secret,
			uri,
			qrCodeDataUrl: await QRCode.toDataURL(uri, { width: 240, margin: 1 }),
		};
	}

	async confirmTotpSetup(userId: string, code: string) {
		const factor = await this.repository.getTotpFactor(userId);
		if (!factor || factor.isEnabled) {
			throw new BadRequestException({
				code: 'MFA_SETUP_NOT_STARTED',
				message: 'Start two-factor setup before confirming it',
			});
		}
		if (!(await this.verifyTotp(this.crypto.decryptSecret(factor.secretEncrypted), code))) {
			throw invalidMfaCode();
		}

		const recoveryCodes = Array.from({ length: 10 }, () => this.crypto.generateRecoveryCode());
		await this.repository.enableTotp(
			userId,
			recoveryCodes.map((recoveryCode) => this.crypto.hashRecoveryCode(recoveryCode)),
		);
		return { enabled: true as const, recoveryCodes };
	}

	async disableTotp(userId: string, code: string): Promise<{ enabled: false }> {
		if (!(await this.verifyLoginCode(userId, code))) {
			throw invalidMfaCode();
		}
		await this.repository.disableTotp(userId);
		return { enabled: false };
	}

	async isTotpEnabled(userId: string): Promise<boolean> {
		return (await this.repository.getTotpFactor(userId))?.isEnabled ?? false;
	}

	async verifyLoginCode(userId: string, code: string): Promise<boolean> {
		const factor = await this.repository.getTotpFactor(userId);
		if (!factor?.isEnabled) {
			return false;
		}
		if (/^\d{6}$/.test(code)) {
			return this.verifyTotp(this.crypto.decryptSecret(factor.secretEncrypted), code);
		}
		return this.repository.consumeRecoveryCode(userId, this.crypto.hashRecoveryCode(code));
	}

	private async verifyTotp(secret: string, code: string): Promise<boolean> {
		const result = await verify({ secret, token: code, epochTolerance: 30 });
		return result.valid;
	}
}

function invalidMfaCode(): UnauthorizedException {
	return new UnauthorizedException({
		code: 'MFA_CODE_INVALID',
		message: 'The authentication code is invalid or expired',
	});
}
