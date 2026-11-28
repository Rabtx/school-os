import { BadRequestException } from '@nestjs/common';
import type { Request } from 'express';
import { describe, expect, it } from 'vitest';

import { resolveRequestOrigin } from './avatar-upload';

describe('resolveRequestOrigin', () => {
	it('builds the origin from the request protocol and host', () => {
		const request = {
			protocol: 'https',
			get: (name: string) => (name === 'host' ? 'school.example' : undefined),
		} as unknown as Request;

		expect(resolveRequestOrigin(request)).toBe('https://school.example');
	});

	it('ignores client-controlled forwarded headers on direct connections', () => {
		const request = {
			// X-Forwarded-* values must not influence the URL: Express only applies
			// them when the app's `trust proxy` setting is enabled, and this function
			// deliberately reads neither header directly.
			protocol: 'http',
			headers: {
				'x-forwarded-proto': 'javascript',
				'x-forwarded-host': 'evil.example',
			},
			get: (name: string) => (name === 'host' ? 'api.internal:4000' : undefined),
		} as unknown as Request;

		expect(resolveRequestOrigin(request)).toBe('http://api.internal:4000');
	});

	it('throws when no host is present', () => {
		const request = {
			protocol: 'http',
			get: () => undefined,
		} as unknown as Request;

		expect(() => resolveRequestOrigin(request)).toThrow(BadRequestException);
	});
});
