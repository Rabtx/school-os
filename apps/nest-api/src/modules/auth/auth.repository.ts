import { Injectable } from '@nestjs/common';
import { and, desc, eq, gt, isNull, ne } from 'drizzle-orm';

import { DatabaseService } from '@/database/database.service';
import {
	type AuthChallengePurpose,
	type AuthChallengeRecord,
	authChallenges,
	type SessionRecord,
	sessions,
	users,
} from '@/database/schema';
import type { RequestMetadata } from './auth.types';

@Injectable()
export class AuthRepository {
	constructor(private readonly database: DatabaseService) {}

	async createChallenge(input: {
		id?: string;
		userId: string;
		email: string;
		purpose: AuthChallengePurpose;
		codeHash: string;
		expiresAt: Date;
	}): Promise<AuthChallengeRecord> {
		return this.database.db.transaction(async (transaction) => {
			const now = new Date();
			await transaction
				.update(authChallenges)
				.set({ consumedAt: now })
				.where(
					and(
						eq(authChallenges.userId, input.userId),
						eq(authChallenges.purpose, input.purpose),
						isNull(authChallenges.consumedAt),
					),
				);

			const [challenge] = await transaction.insert(authChallenges).values(input).returning();
			if (!challenge) {
				throw new Error('Auth challenge insert did not return a record');
			}
			return challenge;
		});
	}

	async findChallengeById(challengeId: string): Promise<AuthChallengeRecord | null> {
		const [challenge] = await this.database.db
			.select()
			.from(authChallenges)
			.where(eq(authChallenges.id, challengeId))
			.limit(1);
		return challenge ?? null;
	}

	async consumeChallenge(challengeId: string): Promise<boolean> {
		const [challenge] = await this.database.db
			.update(authChallenges)
			.set({ consumedAt: new Date() })
			.where(and(eq(authChallenges.id, challengeId), isNull(authChallenges.consumedAt)))
			.returning({ id: authChallenges.id });
		return Boolean(challenge);
	}

	async findLatestChallenge(
		email: string,
		purpose: AuthChallengePurpose,
	): Promise<AuthChallengeRecord | null> {
		const [challenge] = await this.database.db
			.select()
			.from(authChallenges)
			.where(
				and(
					eq(authChallenges.email, email),
					eq(authChallenges.purpose, purpose),
					isNull(authChallenges.consumedAt),
				),
			)
			.orderBy(desc(authChallenges.createdAt))
			.limit(1);
		return challenge ?? null;
	}

	async recordChallengeAttempt(
		challengeId: string,
		attempts: number,
		consume: boolean,
	): Promise<void> {
		await this.database.db
			.update(authChallenges)
			.set({ attempts, ...(consume ? { consumedAt: new Date() } : {}) })
			.where(eq(authChallenges.id, challengeId));
	}

	async completeEmailVerification(challengeId: string, userId: string): Promise<void> {
		await this.database.db.transaction(async (transaction) => {
			const now = new Date();
			await transaction
				.update(authChallenges)
				.set({ consumedAt: now })
				.where(eq(authChallenges.id, challengeId));
			await transaction
				.update(users)
				.set({ emailVerifiedAt: now, updatedAt: now })
				.where(eq(users.id, userId));
		});
	}

	async completePasswordReset(input: {
		challengeId: string;
		userId: string;
		passwordHash: string;
	}): Promise<void> {
		await this.database.db.transaction(async (transaction) => {
			const now = new Date();
			await transaction
				.update(authChallenges)
				.set({ consumedAt: now })
				.where(eq(authChallenges.id, input.challengeId));
			await transaction
				.update(users)
				.set({
					passwordHash: input.passwordHash,
					passwordChangedAt: now,
					updatedAt: now,
					failedLoginAttempts: 0,
					lockedUntil: null,
				})
				.where(eq(users.id, input.userId));
			await transaction
				.update(sessions)
				.set({ revokedAt: now, revocationReason: 'password_reset' })
				.where(and(eq(sessions.userId, input.userId), isNull(sessions.revokedAt)));
		});
	}

	async changePassword(input: {
		userId: string;
		currentSessionId: string;
		passwordHash: string;
		refreshTokenHash: string;
	}): Promise<void> {
		await this.database.db.transaction(async (transaction) => {
			const now = new Date();
			await transaction
				.update(users)
				.set({
					passwordHash: input.passwordHash,
					passwordChangedAt: now,
					updatedAt: now,
				})
				.where(eq(users.id, input.userId));
			await transaction
				.update(sessions)
				.set({ revokedAt: now, revocationReason: 'password_changed' })
				.where(
					and(
						eq(sessions.userId, input.userId),
						ne(sessions.id, input.currentSessionId),
						isNull(sessions.revokedAt),
					),
				);
			// A refresh token copied before the change no longer works on this session either.
			await transaction
				.update(sessions)
				.set({ refreshTokenHash: input.refreshTokenHash, lastUsedAt: now })
				.where(
					and(
						eq(sessions.id, input.currentSessionId),
						eq(sessions.userId, input.userId),
						isNull(sessions.revokedAt),
					),
				);
		});
	}

	async createSession(input: {
		id: string;
		userId: string;
		refreshTokenHash: string;
		expiresAt: Date;
		metadata: RequestMetadata;
		activeTenantId?: string | null;
		activeMembershipId?: string | null;
	}): Promise<SessionRecord> {
		const [session] = await this.database.db
			.insert(sessions)
			.values({
				id: input.id,
				userId: input.userId,
				refreshTokenHash: input.refreshTokenHash,
				expiresAt: input.expiresAt,
				userAgent: input.metadata.userAgent,
				ipAddress: input.metadata.ipAddress,
				activeTenantId: input.activeTenantId ?? null,
				activeMembershipId: input.activeMembershipId ?? null,
			})
			.returning();
		if (!session) {
			throw new Error('Session insert did not return a record');
		}
		return session;
	}

	async updateActiveTenantContext(input: {
		sessionId: string;
		userId: string;
		activeTenantId: string | null;
		activeMembershipId: string | null;
	}): Promise<SessionRecord | null> {
		const [session] = await this.database.db
			.update(sessions)
			.set({
				activeTenantId: input.activeTenantId,
				activeMembershipId: input.activeMembershipId,
				lastUsedAt: new Date(),
			})
			.where(
				and(
					eq(sessions.id, input.sessionId),
					eq(sessions.userId, input.userId),
					isNull(sessions.revokedAt),
				),
			)
			.returning();
		return session ?? null;
	}

	async clearActiveTenantContext(sessionId: string): Promise<void> {
		await this.database.db
			.update(sessions)
			.set({ activeTenantId: null, activeMembershipId: null })
			.where(eq(sessions.id, sessionId));
	}

	async findSessionById(sessionId: string): Promise<SessionRecord | null> {
		const [session] = await this.database.db
			.select()
			.from(sessions)
			.where(eq(sessions.id, sessionId))
			.limit(1);
		return session ?? null;
	}

	async rotateSession(
		sessionId: string,
		currentRefreshTokenHash: string,
		refreshTokenHash: string,
		expiresAt: Date,
		seenFrom?: { ipAddress: string | null; userAgent: string | null },
	): Promise<SessionRecord | null> {
		const [session] = await this.database.db
			.update(sessions)
			.set({
				refreshTokenHash,
				expiresAt,
				lastUsedAt: new Date(),
				// Last place the session was used, so the sessions list shows where it is now.
				...(seenFrom?.ipAddress ? { ipAddress: seenFrom.ipAddress } : {}),
				...(seenFrom?.userAgent ? { userAgent: seenFrom.userAgent } : {}),
			})
			.where(
				and(
					eq(sessions.id, sessionId),
					eq(sessions.refreshTokenHash, currentRefreshTokenHash),
					isNull(sessions.revokedAt),
				),
			)
			.returning();
		return session ?? null;
	}

	async listActiveSessions(userId: string): Promise<SessionRecord[]> {
		return this.database.db
			.select()
			.from(sessions)
			.where(
				and(
					eq(sessions.userId, userId),
					isNull(sessions.revokedAt),
					gt(sessions.expiresAt, new Date()),
				),
			)
			.orderBy(desc(sessions.lastUsedAt));
	}

	async revokeSession(sessionId: string, userId: string, reason: string): Promise<boolean> {
		const revoked = await this.database.db
			.update(sessions)
			.set({ revokedAt: new Date(), revocationReason: reason })
			.where(
				and(eq(sessions.id, sessionId), eq(sessions.userId, userId), isNull(sessions.revokedAt)),
			)
			.returning({ id: sessions.id });
		return revoked.length > 0;
	}

	async revokeAllSessions(userId: string, reason: string): Promise<void> {
		await this.database.db
			.update(sessions)
			.set({ revokedAt: new Date(), revocationReason: reason })
			.where(and(eq(sessions.userId, userId), isNull(sessions.revokedAt)));
	}
}
