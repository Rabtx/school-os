import {
	ConflictException,
	ForbiddenException,
	Injectable,
	ServiceUnavailableException,
	UnauthorizedException,
} from '@nestjs/common';
import { OAuth2Client } from 'google-auth-library';

import { AppConfigService } from '@/config/app-config.service';
import { MembershipsRepository } from '@/modules/memberships/memberships.repository';
import { UsersService } from '@/modules/users/users.service';
import { SocialAuthRepository } from './social-auth.repository';

@Injectable()
export class SocialAuthService {
	private readonly google: OAuth2Client;

	constructor(
		private readonly config: AppConfigService,
		private readonly repository: SocialAuthRepository,
		private readonly users: UsersService,
		private readonly memberships: MembershipsRepository,
	) {
		this.google = new OAuth2Client(config.googleClientId);
	}

	getProviders() {
		return { google: { enabled: Boolean(this.config.googleClientId) } };
	}

	async authenticateGoogle(credential: string) {
		const profile = await this.verifyGoogleCredential(credential);
		const identity = await this.repository.findIdentity('google', profile.subject);
		if (identity) {
			const user = await this.users.findById(identity.userId);
			if (!user?.isActive) throw invalidGoogleCredential();
			return user;
		}

		const existingUser = await this.users.findByEmail(profile.email);
		if (!existingUser && !(await this.mayCreateAccount(profile.email))) {
			throw new ForbiddenException({
				code: 'SOCIAL_SIGNUP_DOMAIN_NOT_ALLOWED',
				message: 'This school only lets its own email domain create accounts with Google.',
			});
		}
		if (existingUser) {
			throw new ConflictException({
				code: 'SOCIAL_ACCOUNT_LINK_REQUIRED',
				message: 'Sign in with your existing method, then connect Google in account security.',
			});
		}

		const user = await this.users.createFederatedUser({
			email: profile.email,
			displayName: profile.name,
			avatarUrl: profile.picture,
		});
		await this.repository.create({
			userId: user.id,
			provider: 'google',
			providerUserId: profile.subject,
			email: profile.email,
		});
		return user;
	}

	async linkGoogle(userId: string, credential: string): Promise<{ linked: true }> {
		const profile = await this.verifyGoogleCredential(credential);
		const user = await this.users.findById(userId);
		if (!user || user.email !== profile.email) {
			throw new ConflictException({
				code: 'SOCIAL_EMAIL_MISMATCH',
				message: 'The Google account email must match your account email.',
			});
		}
		const existing = await this.repository.findIdentity('google', profile.subject);
		if (existing && existing.userId !== userId) {
			throw new ConflictException({
				code: 'SOCIAL_IDENTITY_IN_USE',
				message: 'This Google account is already connected.',
			});
		}
		if (!existing) {
			await this.repository.create({
				userId,
				provider: 'google',
				providerUserId: profile.subject,
				email: profile.email,
			});
		}
		return { linked: true };
	}

	/**
	 * Whether a Google email may open a brand-new account: any email when AUTH_GOOGLE_ALLOWED_DOMAINS
	 * is empty, otherwise an allowed domain or an email the school has a live invite for (a parent
	 * on Gmail, say).
	 */
	private async mayCreateAccount(email: string): Promise<boolean> {
		const allowed = this.config.googleAllowedDomains;
		if (allowed.length === 0) return true;
		if (allowed.includes(email.slice(email.lastIndexOf('@') + 1))) return true;
		const now = new Date();
		const invites = await this.memberships.listPendingInvitesForEmail(email);
		return invites.some((invite) => invite.expiresAt > now);
	}

	async getStatus(userId: string) {
		return { googleLinked: Boolean(await this.repository.findForUser(userId, 'google')) };
	}

	private async verifyGoogleCredential(credential: string) {
		if (!this.config.googleClientId) {
			throw new ServiceUnavailableException({
				code: 'GOOGLE_AUTH_NOT_CONFIGURED',
				message: 'Google sign-in is not configured.',
			});
		}
		try {
			const ticket = await this.google.verifyIdToken({
				idToken: credential,
				audience: this.config.googleClientId,
			});
			const payload = ticket.getPayload();
			if (!payload?.sub || !payload.email || payload.email_verified !== true) {
				throw new Error('Google identity is incomplete');
			}
			return {
				subject: payload.sub,
				email: payload.email.toLowerCase(),
				name: payload.name ?? null,
				picture: payload.picture ?? null,
			};
		} catch {
			throw invalidGoogleCredential();
		}
	}
}

function invalidGoogleCredential(): UnauthorizedException {
	return new UnauthorizedException({
		code: 'GOOGLE_CREDENTIAL_INVALID',
		message: 'Google sign-in could not be verified.',
	});
}
