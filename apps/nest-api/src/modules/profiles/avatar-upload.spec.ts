import { BadRequestException } from '@nestjs/common';
import type { Request } from 'express';
import { describe, expect, it } from 'vitest';

import { resolveRequestOrigin } from './avatar-upload';

type FakeRequest = {
	app?: { get: (name: string) => unknown };
	get: (name: string) => string | undefined;
	headers: Record<string, string>;
	hostname?: string;
	protocol: string;
};

function requestWith(overrides: Partial<FakeRequest>): Request {
	return {
		headers: {},
		get: () => undefined,
		protocol: 'http',
		...overrides,
	} as unknown as Request;
}

describe('resolveRequestOrigin', () => {
	it('uses the Host header and connection protocol when the proxy is not trusted', () => {
		const req = requestWith({
			headers: { host: 'api.school.test:4000', 'x-forwarded-host': 'attacker.test' },
			get: (name) => (name === 'host' ? 'api.school.test:4000' : undefined),
			protocol: 'http',
		});

		expect(resolveRequestOrigin(req)).toBe('http://api.school.test:4000');
	});

	it('ignores client-supplied forwarded headers when the proxy is not trusted', () => {
		const req = requestWith({
			headers: { host: 'api.school.test:4000', 'x-forwarded-proto': 'https' },
			get: (name) => (name === 'host' ? 'api.school.test:4000' : undefined),
			protocol: 'http',
		});

		expect(resolveRequestOrigin(req)).toBe('http://api.school.test:4000');
	});

	it('uses the proxy-resolved hostname when the proxy is trusted', () => {
		const req = requestWith({
			app: { get: (name) => (name === 'trust proxy' ? 1 : undefined) },
			headers: { host: 'nest-api.internal' },
			get: (name) => (name === 'host' ? 'nest-api.internal' : undefined),
			hostname: 'api.school.test',
			protocol: 'https',
		});

		expect(resolveRequestOrigin(req)).toBe('https://api.school.test');
	});

	it('throws when no host can be resolved', () => {
		expect(() => resolveRequestOrigin(requestWith({}))).toThrow(BadRequestException);
	});
});
