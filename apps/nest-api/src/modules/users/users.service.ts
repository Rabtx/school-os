import { randomUUID } from 'node:crypto';
import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';

import type { UserRecord } from '@/database/schema';
import { UsersRepository } from './users.repository';
import { type PublicUser, toPublicUser } from './users.types';

@Injectable()
export class UsersService {
	constructor(private readonly usersRepository: UsersRepository) {}

	async createUser(input: {
		email: string;
		username: string;
		passwordHash: string;
	}): Promise<UserRecord> {
		const email = normalizeEmail(input.email);
		const username = normalizeUsername(input.username);

		if (await this.usersRepository.findByEmail(email)) {
			throw new ConflictException({
				code: 'AUTH_EMAIL_ALREADY_REGISTERED',
				message: 'An account with this email already exists',
			});
		}

		if (await this.usersRepository.findByUsername(username)) {
			throw new ConflictException({
				code: 'AUTH_USERNAME_TAKEN',
				message: 'This username is already taken',
			});
		}

		try {
			return await this.usersRepository.create({
				email,
				username,
				passwordHash: input.passwordHash,
			});
		} catch (error) {
			if (isUniqueConstraintError(error)) {
				throw new ConflictException({
					code: 'AUTH_ACCOUNT_ALREADY_EXISTS',
					message: 'An account with these details already exists',
				});
			}
			throw error;
		}
	}

	async createFederatedUser(input: {
		email: string;
		displayName?: string | null;
		avatarUrl?: string | null;
	}): Promise<UserRecord> {
		const email = normalizeEmail(input.email);
		const base = normalizeUsername(email.split('@')[0] ?? 'user')
			.replace(/[^a-z0-9._-]/g, '')
			.slice(0, 48);
		for (let attempt = 0; attempt < 5; attempt += 1) {
			const suffix = randomUUID().replaceAll('-', '').slice(0, 8);
			const username = `${base || 'user'}-${suffix}`;
			try {
				// oxlint-disable-next-line no-await-in-loop -- retries until a free username is found
				return await this.usersRepository.create({
					email,
					username,
					passwordHash: null,
					emailVerifiedAt: new Date(),
					displayName: input.displayName,
					avatarUrl: input.avatarUrl,
				});
			} catch (error) {
				if (!isUniqueConstraintError(error)) throw error;
			}
		}
		throw new ConflictException({
			code: 'USER_CREATION_CONFLICT',
			message: 'The account could not be created',
		});
	}

	findByEmail(email: string): Promise<UserRecord | null> {
		return this.usersRepository.findByEmail(normalizeEmail(email));
	}

	findById(userId: string): Promise<UserRecord | null> {
		return this.usersRepository.findById(userId);
	}

	async getCurrentUser(userId: string): Promise<PublicUser> {
		const user = await this.usersRepository.findById(userId);
		if (!user?.isActive) {
			throw new UnauthorizedException({
				code: 'AUTH_SESSION_INVALID',
				message: 'Authentication required',
			});
		}
		return toPublicUser(user);
	}

	async recordFailedLogin(
		user: UserRecord,
		maxAttempts: number,
		lockMinutes: number,
	): Promise<void> {
		const attempts = user.failedLoginAttempts + 1;
		const lockedUntil =
			attempts >= maxAttempts ? new Date(Date.now() + lockMinutes * 60_000) : user.lockedUntil;
		await this.usersRepository.updateLoginSecurity(user.id, {
			failedLoginAttempts: attempts,
			lockedUntil,
		});
	}

	async resetFailedLogins(userId: string): Promise<void> {
		await this.usersRepository.updateLoginSecurity(userId, {
			failedLoginAttempts: 0,
			lockedUntil: null,
		});
	}

	markEmailVerified(userId: string): Promise<UserRecord | null> {
		return this.usersRepository.markEmailVerified(userId);
	}

	updatePassword(userId: string, passwordHash: string): Promise<void> {
		return this.usersRepository.updatePassword(userId, passwordHash);
	}

	async updateProfile(userId: string, input: { username: string }): Promise<PublicUser> {
		const user = await this.usersRepository.findById(userId);
		if (!user?.isActive) {
			throw new UnauthorizedException({
				code: 'AUTH_SESSION_INVALID',
				message: 'Authentication required',
			});
		}

		const username = normalizeUsername(input.username);
		if (username !== user.username) {
			const existing = await this.usersRepository.findByUsername(username);
			if (existing && existing.id !== userId) {
				throw new ConflictException({
					code: 'AUTH_USERNAME_TAKEN',
					message: 'This username is already taken',
				});
			}
		}

		try {
			const updated = await this.usersRepository.updateUsername(userId, username);
			if (!updated) {
				throw new UnauthorizedException({
					code: 'AUTH_SESSION_INVALID',
					message: 'Authentication required',
				});
			}
			return toPublicUser(updated);
		} catch (error) {
			if (isUniqueConstraintError(error)) {
				throw new ConflictException({
					code: 'AUTH_USERNAME_TAKEN',
					message: 'This username is already taken',
				});
			}
			throw error;
		}
	}
}

function normalizeEmail(email: string): string {
	return email.trim().toLowerCase();
}

function normalizeUsername(username: string): string {
	return username.trim().toLowerCase();
}

function isUniqueConstraintError(error: unknown): boolean {
	return (
		typeof error === 'object' &&
		error !== null &&
		'code' in error &&
		(error as { code?: unknown }).code === '23505'
	);
}
