import { ForbiddenException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';

import { AppConfigService } from '@/config/app-config.service';
import { CsrfGuard } from './csrf.guard';

function createGuard(corsOrigins = ['http://localhost:3000']): CsrfGuard {
	const config = { corsOrigins } as unknown as AppConfigService;
	return new CsrfGuard(config);
}

function createContext(method: string, headers: Record<string, string>) {
	const request = { method, headers } as never;
	return { switchToHttp: () => ({ getRequest: () => request }) } as never;
}

describe('CsrfGuard', () => {
	const guard = createGuard();

	it('allows safe methods without an origin', () => {
		expect(guard.canActivate(createContext('GET', {}))).toBe(true);
		expect(guard.canActivate(createContext('HEAD', {}))).toBe(true);
		expect(guard.canActivate(createContext('OPTIONS', {}))).toBe(true);
	});

	it('rejects state-changing methods without an origin', () => {
		expect(() => guard.canActivate(createContext('POST', {}))).toThrow(ForbiddenException);
	});

	it('rejects origins outside the CORS allowlist', () => {
		expect(() =>
			guard.canActivate(
				createContext('POST', {
					origin: 'http://evil.example',
					'x-requested-with': 'XMLHttpRequest',
				}),
			),
		).toThrow(ForbiddenException);
	});

	it('allows allowlisted origins that send X-Requested-With', () => {
		expect(
			guard.canActivate(
				createContext('POST', {
					origin: 'http://localhost:3000',
					'x-requested-with': 'XMLHttpRequest',
				}),
			),
		).toBe(true);
	});

	it('allows native clients without an origin', () => {
		expect(
			guard.canActivate(
				createContext('POST', {
					'x-client-platform': 'native',
					'x-requested-with': 'XMLHttpRequest',
				}),
			),
		).toBe(true);
	});
});
