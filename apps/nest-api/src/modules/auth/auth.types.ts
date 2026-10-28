import type { MembershipRecord } from '@/database/schema';

import type { PermissionCode } from '@/modules/authorization/permission-codes';
import type { PublicUser } from '@/modules/users/users.types';

export type PublicTenantContext = {
	/** Membership id (same value as membershipId; included for web clients). */
	id: string;
	tenantId: string;
	membershipId: string;
	role: MembershipRecord['role'];
	permissions: PermissionCode[];
};

export type AccessTokenPayload = {
	sub: string;
	sid: string;
	tid?: string;
	mid?: string;
};

export type RequestMetadata = {
	ipAddress: string | null;
	userAgent: string | null;
};

export type AuthSessionResult = {
	accessToken: string;
	accessTokenExpiresAt: string;
	refreshToken: string;
	user: PublicUser;
	tenantContext?: PublicTenantContext | null;
};

export type PublicAuthSession = Omit<AuthSessionResult, 'refreshToken'>;

/** Web omits refreshToken (cookie); native includes it for SecureStore. */
export type ClientAuthSession = PublicAuthSession | AuthSessionResult;

export type MfaLoginChallenge = {
	requiresTwoFactor: true;
	challengeToken: string;
	expiresAt: string;
	methods: ['totp', 'recovery_code'];
};

export type LoginResult = AuthSessionResult | MfaLoginChallenge;
export type PublicLoginResult = PublicAuthSession | MfaLoginChallenge;
export type ClientLoginResult = ClientAuthSession | MfaLoginChallenge;

export type AuthChallengeResult = {
	accepted: true;
	message: string;
	developmentCode?: string;
	developmentToken?: string;
};

export type RegistrationResult = AuthChallengeResult & { user: PublicUser };

export type SessionView = {
	id: string;
	userAgent: string | null;
	ipAddress: string | null;
	createdAt: string;
	lastUsedAt: string;
	expiresAt: string;
	isCurrent: boolean;
};
