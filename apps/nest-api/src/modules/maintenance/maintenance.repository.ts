import { Injectable } from '@nestjs/common';
import { and, eq, isNotNull, lt, or } from 'drizzle-orm';

import { DatabaseService } from '@/database/database.service';
import {
	authChallenges,
	membershipInvites,
	sessions,
	totpFactors,
	webauthnAuthenticationChallenges,
} from '@/database/schema';

const DAY_MS = 24 * 60 * 60 * 1000;

export type MaintenanceResult = {
	authChallenges: number;
	webauthnChallenges: number;
	sessions: number;
	expiredInvites: number;
	abandonedTotpSetups: number;
};

@Injectable()
export class MaintenanceRepository {
	constructor(private readonly database: DatabaseService) {}

	/**
	 * One-time codes and WebAuthn challenges are useless a day after they expire. Sessions are kept
	 * for 30 days after they end so recent sign-in history stays reviewable. Invites are never
	 * deleted: a lapsed pending invite is marked expired so the history remains. A TOTP setup never
	 * confirmed within a day is abandoned, and its stored secret is deleted.
	 */
	async purgeExpired(now = new Date()): Promise<MaintenanceResult> {
		const dayAgo = new Date(now.getTime() - DAY_MS);
		const monthAgo = new Date(now.getTime() - 30 * DAY_MS);

		const [challenges, webauthn, staleSessions, invites, totpSetups] = await Promise.all([
			this.database.db
				.delete(authChallenges)
				.where(lt(authChallenges.expiresAt, dayAgo))
				.returning({ id: authChallenges.id }),
			this.database.db
				.delete(webauthnAuthenticationChallenges)
				.where(lt(webauthnAuthenticationChallenges.expiresAt, dayAgo))
				.returning({ id: webauthnAuthenticationChallenges.id }),
			this.database.db
				.delete(sessions)
				.where(
					or(
						lt(sessions.expiresAt, monthAgo),
						and(isNotNull(sessions.revokedAt), lt(sessions.revokedAt, monthAgo)),
					),
				)
				.returning({ id: sessions.id }),
			this.database.db
				.update(membershipInvites)
				.set({ status: 'expired', updatedAt: now })
				.where(and(eq(membershipInvites.status, 'pending'), lt(membershipInvites.expiresAt, now)))
				.returning({ id: membershipInvites.id }),
			this.database.db
				.delete(totpFactors)
				.where(and(eq(totpFactors.isEnabled, false), lt(totpFactors.updatedAt, dayAgo)))
				.returning({ userId: totpFactors.userId }),
		]);

		return {
			authChallenges: challenges.length,
			webauthnChallenges: webauthn.length,
			sessions: staleSessions.length,
			expiredInvites: invites.length,
			abandonedTotpSetups: totpSetups.length,
		};
	}
}
