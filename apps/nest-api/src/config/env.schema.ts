import * as z from 'zod';

const developmentJwtSecret = 'development-only-jwt-secret-change-me';
const developmentTokenSecret = 'development-only-auth-token-secret-change-me';

const booleanFromString = z
	.enum(['true', 'false'])
	.default('false')
	.transform((value) => value === 'true');

export const envSchema = z
	.object({
		NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
		PORT: z.coerce.number().int().positive().default(4000),
		API_PREFIX: z.string().min(1).default('api'),
		API_VERSION: z.string().regex(/^\d+$/).default('1'),
		SERVICE_NAME: z.string().min(1).default('school-os-api'),
		APP_NAME: z.string().min(1).max(80).default('School OS'),
		WEB_APP_URL: z.url().default('http://localhost:3000'),
		DATABASE_URL: z.url().default('postgresql://school-os:school-os@localhost:5433/school-os'),
		DATABASE_POOL_MAX: z.coerce.number().int().min(1).max(50).default(10),
		DATABASE_SSL: z.enum(['true', 'false']).optional(),
		JWT_SECRET: z.string().min(32).default(developmentJwtSecret),
		JWT_ACCESS_EXPIRES_IN: z
			.string()
			.regex(/^\d+[smhd]$/)
			.default('15m'),
		AUTH_TOKEN_SECRET: z.string().min(32).default(developmentTokenSecret),
		SESSION_TTL_DAYS: z.coerce.number().int().min(1).max(365).default(30),
		OTP_TTL_MINUTES: z.coerce.number().int().min(5).max(60).default(10),
		OTP_MAX_ATTEMPTS: z.coerce.number().int().min(3).max(10).default(5),
		MAGIC_LINK_TTL_MINUTES: z.coerce.number().int().min(5).max(60).default(15),
		MFA_CHALLENGE_TTL_MINUTES: z.coerce.number().int().min(2).max(15).default(5),
		PASSWORD_BCRYPT_ROUNDS: z.coerce.number().int().min(10).max(14).default(12),
		MAX_LOGIN_ATTEMPTS: z.coerce.number().int().min(3).max(20).default(5),
		LOGIN_LOCK_MINUTES: z.coerce.number().int().min(1).max(1440).default(15),
		REFRESH_COOKIE_NAME: z.string().min(1).default('school_os_refresh_token'),
		COOKIE_DOMAIN: z.string().min(1).optional(),
		/**
		 * Use `none` when the web app and API are on different sites
		 * (e.g. Vercel ↔ Render). Requires Secure cookies (production HTTPS).
		 */
		COOKIE_SAME_SITE: z.enum(['lax', 'strict', 'none']).default('lax'),
		CORS_ORIGIN: z.string().min(1).default('http://localhost:3000,http://127.0.0.1:3000'),
		TRUST_PROXY: booleanFromString,
		AUTH_DEV_EXPOSE_CODES: z
			.enum(['true', 'false'])
			.default('false')
			.transform((value) => value === 'true'),
		RESEND_API_KEY: z.string().min(1).optional(),
		AUTH_EMAIL_FROM: z.string().min(3).default('School OS <auth@example.com>'),
		WEBAUTHN_RP_ID: z.string().min(1).default('localhost'),
		/** Comma-separated allowed WebAuthn origins (web + native). */
		WEBAUTHN_ORIGIN: z.string().min(1).default('http://localhost:3000'),
		GOOGLE_CLIENT_ID: z.string().min(1).optional(),
		/** Comma-separated email domains that may create a new account with Google. Empty allows any. */
		AUTH_GOOGLE_ALLOWED_DOMAINS: z.string().default(''),
		BILLING_DEFAULT_PROVIDER: z.enum(['stripe', 'razorpay']).default('stripe'),
		STRIPE_SECRET_KEY: z.string().min(1).optional(),
		STRIPE_WEBHOOK_SECRET: z.string().min(1).optional(),
		STRIPE_PRICE_TEAM_MONTHLY: z.string().min(1).optional(),
		STRIPE_PRICE_TEAM_YEARLY: z.string().min(1).optional(),
		STRIPE_PRICE_ENTERPRISE_MONTHLY: z.string().min(1).optional(),
		STRIPE_PRICE_ENTERPRISE_YEARLY: z.string().min(1).optional(),
		RAZORPAY_KEY_ID: z.string().min(1).optional(),
		RAZORPAY_KEY_SECRET: z.string().min(1).optional(),
		RAZORPAY_WEBHOOK_SECRET: z.string().min(1).optional(),
		RAZORPAY_PLAN_TEAM_MONTHLY: z.string().min(1).optional(),
		RAZORPAY_PLAN_TEAM_YEARLY: z.string().min(1).optional(),
		RAZORPAY_PLAN_ENTERPRISE_MONTHLY: z.string().min(1).optional(),
		RAZORPAY_PLAN_ENTERPRISE_YEARLY: z.string().min(1).optional(),
		OUTBOX_WORKER_ENABLED: z.enum(['true', 'false']).optional(),
		OUTBOX_POLL_INTERVAL_MS: z.coerce.number().int().min(1000).max(300_000).default(5000),
		OUTBOX_BATCH_SIZE: z.coerce.number().int().min(1).max(500).default(25),
		OUTBOX_LEASE_MS: z.coerce.number().int().min(5000).max(3_600_000).default(60_000),
		OUTBOX_MAX_ATTEMPTS: z.coerce.number().int().min(1).max(50).default(8),
		/** `sandbox` records sends locally; `meta` uses the WhatsApp Cloud API with the keys below. */
		WHATSAPP_PROVIDER: z.enum(['sandbox', 'meta']).default('sandbox'),
		WHATSAPP_META_ACCESS_TOKEN: z.string().min(1).optional(),
		WHATSAPP_META_PHONE_NUMBER_ID: z.string().min(1).optional(),
		WHATSAPP_META_APP_SECRET: z.string().min(1).optional(),
		WHATSAPP_META_VERIFY_TOKEN: z.string().min(1).optional(),
		WHATSAPP_META_API_VERSION: z.string().min(1).default('v21.0'),
		/** Shown in Settings as the number families see messages from. */
		WHATSAPP_SENDER_DISPLAY: z.string().min(1).optional(),
		SMS_PROVIDER: z.enum(['sandbox']).default('sandbox'),
		DELIVERY_WORKER_ENABLED: z.enum(['true', 'false']).optional(),
		DELIVERY_POLL_INTERVAL_MS: z.coerce.number().int().min(1000).max(300_000).default(5000),
	})
	.superRefine((env, context) => {
		if (env.NODE_ENV !== 'production') {
			return;
		}

		if (env.JWT_SECRET === developmentJwtSecret) {
			context.addIssue({
				code: 'custom',
				path: ['JWT_SECRET'],
				message: 'JWT_SECRET must be changed in production',
			});
		}
		if (env.AUTH_TOKEN_SECRET === developmentTokenSecret) {
			context.addIssue({
				code: 'custom',
				path: ['AUTH_TOKEN_SECRET'],
				message: 'AUTH_TOKEN_SECRET must be changed in production',
			});
		}
		if (
			env.WHATSAPP_PROVIDER === 'meta' &&
			(!env.WHATSAPP_META_ACCESS_TOKEN ||
				!env.WHATSAPP_META_PHONE_NUMBER_ID ||
				!env.WHATSAPP_META_APP_SECRET ||
				!env.WHATSAPP_META_VERIFY_TOKEN)
		) {
			context.addIssue({
				code: 'custom',
				path: ['WHATSAPP_PROVIDER'],
				message:
					'The meta WhatsApp provider needs its access token, phone number id, app secret and verify token',
			});
		}
		if (!env.RESEND_API_KEY) {
			context.addIssue({
				code: 'custom',
				path: ['RESEND_API_KEY'],
				message: 'RESEND_API_KEY is required in production',
			});
		}
	});

export type Env = z.infer<typeof envSchema>;

export function parseEnv(env: NodeJS.ProcessEnv = process.env): Env {
	const result = envSchema.safeParse(env);
	if (result.success) {
		return result.data;
	}

	const issues = result.error.issues
		.map((issue) => `${issue.path.join('.')}: ${issue.message}`)
		.join('; ');
	throw new Error(`Invalid environment configuration: ${issues}`);
}
