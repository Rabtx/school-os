import { describe, expect, it } from 'vitest';

import { billingUrlSchema, httpUrlSchema } from './http-url.schema';

describe('httpUrlSchema', () => {
	it('accepts http and https URLs', () => {
		expect(httpUrlSchema.safeParse('https://example.com/work/photo.png').success).toBe(true);
		expect(httpUrlSchema.safeParse('http://localhost:3000/avatar.png').success).toBe(true);
	});

	it.each([
		'javascript:alert(document.domain)',
		'JaVaScRiPt:alert(1)',
		'data:text/html,<script>alert(1)</script>',
		'vbscript:msgbox(1)',
		'file:///etc/passwd',
		'not a url',
		'',
		'   ',
		'//example.com/protocol-relative',
	])('rejects %s', (value) => {
		expect(httpUrlSchema.safeParse(value).success).toBe(false);
	});

	it('trims surrounding whitespace before validating', () => {
		const result = httpUrlSchema.safeParse('  https://example.com/a.png  ');
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data).toBe('https://example.com/a.png');
		}
	});
});

describe('billingUrlSchema', () => {
	it('accepts web origins and Expo deep links', () => {
		expect(billingUrlSchema.safeParse('https://app.example.com/billing/success').success).toBe(
			true,
		);
		expect(
			billingUrlSchema.safeParse('school-os://(modules)/(profile)/billing-success').success,
		).toBe(true);
		expect(billingUrlSchema.safeParse('exp://127.0.0.1:8081/billing-success').success).toBe(true);
	});

	it.each(['javascript:alert(1)', 'data:text/html,hi', 'file:///etc/passwd'])(
		'rejects %s',
		(value) => {
			expect(billingUrlSchema.safeParse(value).success).toBe(false);
		},
	);
});
