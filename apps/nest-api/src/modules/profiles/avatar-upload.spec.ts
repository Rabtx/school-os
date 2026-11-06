import { BadRequestException } from '@nestjs/common';
import type { Request } from 'express';
import { describe, expect, it } from 'vitest';

import { resolveRequestOrigin } from './avatar-upload';

function mockRequest(protocol: string, host: string | undefined): Request {
	return {
		protocol,
		get: () => host,
		headers: { 'x-forwarded-host': 'evil.example', 'x-forwarded-proto': 'https' },
	} as unknown as Request;
}

describe('resolveRequestOrigin', () => {
	it('uses the Express host/protocol and ignores spoofed forwarded headers', () => {
		expect(resolveRequestOrigin(mockRequest('http', 'api.example.com'))).toBe(
			'http://api.example.com',
		);
	});

	it('accepts hosts with a port and IPv6 literals', () => {
		expect(resolveRequestOrigin(mockRequest('https', 'localhost:3000'))).toBe(
			'https://localhost:3000',
		);
		expect(resolveRequestOrigin(mockRequest('http', '[::1]:3000'))).toBe('http://[::1]:3000');
	});

	it.each(['evil.com@trusted.example', 'a/b', 'a b', 'a?b', 'a#b', '', '   '])(
		'rejects host %s',
		(host) => {
			expect(() => resolveRequestOrigin(mockRequest('http', host))).toThrow(BadRequestException);
		},
	);

	it('rejects missing host and non-http protocols', () => {
		expect(() => resolveRequestOrigin(mockRequest('http', undefined))).toThrow(BadRequestException);
		expect(() => resolveRequestOrigin(mockRequest('javascript', 'api.example.com'))).toThrow(
			BadRequestException,
		);
	});
});
