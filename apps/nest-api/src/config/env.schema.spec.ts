import { describe, expect, it } from 'vitest';

import { developmentJwtSecret, developmentTokenSecret, parseEnv } from './env.schema';

const validProductionEnv = {
	NODE_ENV: 'production',
	JWT_SECRET: 'production-jwt-secret-0123456789abcdef',
	AUTH_TOKEN_SECRET: 'production-token-secret-0123456789abcdef',
	RESEND_API_KEY: 're_test_key',
};

const validDevelopmentEnv = {
	JWT_SECRET: 'development-jwt-secret-0123456789abcdef',
	AUTH_TOKEN_SECRET: 'development-token-secret-0123456789abcdef',
};

describe('parseEnv', () => {
	it('parses a complete production environment', () => {
		expect(() => parseEnv(validProductionEnv)).not.toThrow();
	});

	it('parses a development environment without optional production settings', () => {
		expect(() => parseEnv(validDevelopmentEnv)).not.toThrow();
	});

	it('rejects a missing JWT_SECRET instead of defaulting to a committed secret', () => {
		const { JWT_SECRET: _jwtSecret, ...withoutJwtSecret } = validDevelopmentEnv;
		expect(() => parseEnv(withoutJwtSecret)).toThrow(/JWT_SECRET/);
	});

	it('rejects a missing AUTH_TOKEN_SECRET instead of defaulting to a committed secret', () => {
		const { AUTH_TOKEN_SECRET: _tokenSecret, ...withoutTokenSecret } = validDevelopmentEnv;
		expect(() => parseEnv(withoutTokenSecret)).toThrow(/AUTH_TOKEN_SECRET/);
	});

	it('rejects the committed development JWT secret in production', () => {
		expect(() => parseEnv({ ...validProductionEnv, JWT_SECRET: developmentJwtSecret })).toThrow(
			/JWT_SECRET must be changed in production/,
		);
	});

	it('rejects the committed development AUTH_TOKEN_SECRET in production', () => {
		expect(() =>
			parseEnv({ ...validProductionEnv, AUTH_TOKEN_SECRET: developmentTokenSecret }),
		).toThrow(/AUTH_TOKEN_SECRET must be changed in production/);
	});

	it('rejects AUTH_DEV_EXPOSE_CODES in production', () => {
		expect(() => parseEnv({ ...validProductionEnv, AUTH_DEV_EXPOSE_CODES: 'true' })).toThrow(
			/AUTH_DEV_EXPOSE_CODES must not be enabled in production/,
		);
	});

	it('allows AUTH_DEV_EXPOSE_CODES outside production', () => {
		expect(() => parseEnv({ ...validDevelopmentEnv, AUTH_DEV_EXPOSE_CODES: 'true' })).not.toThrow();
	});
});
