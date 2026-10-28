import { type Env, parseEnv } from './env.schema';

export type AppConfig = {
	nodeEnv: Env['NODE_ENV'];
	port: number;
	apiPrefix: string;
	apiVersion: string;
	serviceName: string;
	appName: string;
	webAppUrl: string;
	databaseUrl: string;
	databasePoolMax: number;
	databaseSsl: boolean;
	jwtSecret: string;
	jwtAccessExpiresIn: string;
	authTokenSecret: string;
	sessionTtlDays: number;
	otpTtlMinutes: number;
	otpMaxAttempts: number;
	magicLinkTtlMinutes: number;
	mfaChallengeTtlMinutes: number;
	passwordBcryptRounds: number;
	maxLoginAttempts: number;
	loginLockMinutes: number;
	refreshCookieName: string;
	cookieDomain?: string;
	cookieSameSite: 'lax' | 'strict' | 'none';
	corsOrigin: string;
	trustProxy: boolean;
	authDevExposeCodes: boolean;
	resendApiKey?: string;
	authEmailFrom: string;
	webAuthnRpId: string;
	webAuthnOrigins: string[];
	googleClientId?: string;
	googleAllowedDomains: string[];
	billingDefaultProvider: 'stripe' | 'razorpay';
	stripeSecretKey?: string;
	stripeWebhookSecret?: string;
	razorpayKeyId?: string;
	razorpayKeySecret?: string;
	razorpayWebhookSecret?: string;
	billingPrices: {
		stripe: {
			team: { monthly?: string; yearly?: string };
			enterprise: { monthly?: string; yearly?: string };
		};
		razorpay: {
			team: { monthly?: string; yearly?: string };
			enterprise: { monthly?: string; yearly?: string };
		};
	};
	outboxWorkerEnabled: boolean;
	outboxPollIntervalMs: number;
	outboxBatchSize: number;
	outboxLeaseMs: number;
	outboxMaxAttempts: number;
};

export function createAppConfig(env: Env = parseEnv()): AppConfig {
	return {
		nodeEnv: env.NODE_ENV,
		port: env.PORT,
		apiPrefix: env.API_PREFIX,
		apiVersion: env.API_VERSION,
		serviceName: env.SERVICE_NAME,
		appName: env.APP_NAME,
		webAppUrl: env.WEB_APP_URL.replace(/\/$/, ''),
		databaseUrl: env.DATABASE_URL,
		databasePoolMax: env.DATABASE_POOL_MAX,
		databaseSsl:
			env.DATABASE_SSL !== undefined
				? env.DATABASE_SSL === 'true'
				: /(?:neon\.tech|sslmode=require)/i.test(env.DATABASE_URL),
		jwtSecret: env.JWT_SECRET,
		jwtAccessExpiresIn: env.JWT_ACCESS_EXPIRES_IN,
		authTokenSecret: env.AUTH_TOKEN_SECRET,
		sessionTtlDays: env.SESSION_TTL_DAYS,
		otpTtlMinutes: env.OTP_TTL_MINUTES,
		otpMaxAttempts: env.OTP_MAX_ATTEMPTS,
		magicLinkTtlMinutes: env.MAGIC_LINK_TTL_MINUTES,
		mfaChallengeTtlMinutes: env.MFA_CHALLENGE_TTL_MINUTES,
		passwordBcryptRounds: env.PASSWORD_BCRYPT_ROUNDS,
		maxLoginAttempts: env.MAX_LOGIN_ATTEMPTS,
		loginLockMinutes: env.LOGIN_LOCK_MINUTES,
		refreshCookieName: env.REFRESH_COOKIE_NAME,
		...(env.COOKIE_DOMAIN ? { cookieDomain: env.COOKIE_DOMAIN } : {}),
		cookieSameSite: env.COOKIE_SAME_SITE,
		corsOrigin: env.CORS_ORIGIN,
		trustProxy: env.TRUST_PROXY,
		authDevExposeCodes: env.AUTH_DEV_EXPOSE_CODES,
		...(env.RESEND_API_KEY ? { resendApiKey: env.RESEND_API_KEY } : {}),
		authEmailFrom: env.AUTH_EMAIL_FROM,
		webAuthnRpId: env.WEBAUTHN_RP_ID,
		webAuthnOrigins: env.WEBAUTHN_ORIGIN.split(',')
			.map((origin) => origin.trim().replace(/\/$/, ''))
			.filter(Boolean),
		...(env.GOOGLE_CLIENT_ID ? { googleClientId: env.GOOGLE_CLIENT_ID } : {}),
		googleAllowedDomains: env.AUTH_GOOGLE_ALLOWED_DOMAINS.split(',')
			.map((domain) => domain.trim().toLowerCase().replace(/^@/, ''))
			.filter(Boolean),
		billingDefaultProvider: env.BILLING_DEFAULT_PROVIDER,
		...(env.STRIPE_SECRET_KEY ? { stripeSecretKey: env.STRIPE_SECRET_KEY } : {}),
		...(env.STRIPE_WEBHOOK_SECRET ? { stripeWebhookSecret: env.STRIPE_WEBHOOK_SECRET } : {}),
		...(env.RAZORPAY_KEY_ID ? { razorpayKeyId: env.RAZORPAY_KEY_ID } : {}),
		...(env.RAZORPAY_KEY_SECRET ? { razorpayKeySecret: env.RAZORPAY_KEY_SECRET } : {}),
		...(env.RAZORPAY_WEBHOOK_SECRET ? { razorpayWebhookSecret: env.RAZORPAY_WEBHOOK_SECRET } : {}),
		billingPrices: {
			stripe: {
				team: {
					...(env.STRIPE_PRICE_TEAM_MONTHLY ? { monthly: env.STRIPE_PRICE_TEAM_MONTHLY } : {}),
					...(env.STRIPE_PRICE_TEAM_YEARLY ? { yearly: env.STRIPE_PRICE_TEAM_YEARLY } : {}),
				},
				enterprise: {
					...(env.STRIPE_PRICE_ENTERPRISE_MONTHLY
						? { monthly: env.STRIPE_PRICE_ENTERPRISE_MONTHLY }
						: {}),
					...(env.STRIPE_PRICE_ENTERPRISE_YEARLY
						? { yearly: env.STRIPE_PRICE_ENTERPRISE_YEARLY }
						: {}),
				},
			},
			razorpay: {
				team: {
					...(env.RAZORPAY_PLAN_TEAM_MONTHLY ? { monthly: env.RAZORPAY_PLAN_TEAM_MONTHLY } : {}),
					...(env.RAZORPAY_PLAN_TEAM_YEARLY ? { yearly: env.RAZORPAY_PLAN_TEAM_YEARLY } : {}),
				},
				enterprise: {
					...(env.RAZORPAY_PLAN_ENTERPRISE_MONTHLY
						? { monthly: env.RAZORPAY_PLAN_ENTERPRISE_MONTHLY }
						: {}),
					...(env.RAZORPAY_PLAN_ENTERPRISE_YEARLY
						? { yearly: env.RAZORPAY_PLAN_ENTERPRISE_YEARLY }
						: {}),
				},
			},
		},
		outboxWorkerEnabled:
			env.OUTBOX_WORKER_ENABLED !== undefined
				? env.OUTBOX_WORKER_ENABLED === 'true'
				: env.NODE_ENV !== 'test',
		outboxPollIntervalMs: env.OUTBOX_POLL_INTERVAL_MS,
		outboxBatchSize: env.OUTBOX_BATCH_SIZE,
		outboxLeaseMs: env.OUTBOX_LEASE_MS,
		outboxMaxAttempts: env.OUTBOX_MAX_ATTEMPTS,
	};
}
