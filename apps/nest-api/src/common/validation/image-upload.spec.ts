import { BadRequestException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';

import { assertImageMagic, detectImageMime } from './image-upload';

const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp']);

function mockFile(mimetype: string, buffer: Buffer): Express.Multer.File {
	return { mimetype, buffer } as Express.Multer.File;
}

describe('detectImageMime', () => {
	it('detects JPEG, PNG and WebP headers', () => {
		expect(detectImageMime(Buffer.from([0xff, 0xd8, 0xff, 0xe0]))).toBe('image/jpeg');
		expect(detectImageMime(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))).toBe(
			'image/png',
		);
		expect(detectImageMime(Buffer.from('RIFF\x24\x00\x00\x00WEBPVP8 '))).toBe('image/webp');
	});

	it('rejects scripts and empty headers', () => {
		expect(detectImageMime(Buffer.from('<script>alert(1)</script>'))).toBeNull();
		expect(detectImageMime(Buffer.alloc(0))).toBeNull();
		expect(detectImageMime(Buffer.from('GIF89a'))).toBeNull();
	});
});

describe('assertImageMagic', () => {
	it('accepts a PNG whose declared type matches its bytes', () => {
		const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00]);
		expect(() => assertImageMagic(mockFile('image/png', png), ALLOWED)).not.toThrow();
	});

	it('rejects an HTML payload labelled as JPEG', () => {
		const html = Buffer.from('<!doctype html><script>alert(1)</script>');
		expect(() => assertImageMagic(mockFile('image/jpeg', html), ALLOWED)).toThrow(
			BadRequestException,
		);
	});

	it('rejects a JPEG whose declared type does not match its bytes', () => {
		const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
		expect(() => assertImageMagic(mockFile('image/png', jpeg), ALLOWED)).toThrow(
			BadRequestException,
		);
	});

	it('rejects an empty upload', () => {
		expect(() => assertImageMagic(mockFile('image/png', Buffer.alloc(0)), ALLOWED)).toThrow(
			BadRequestException,
		);
	});
});
