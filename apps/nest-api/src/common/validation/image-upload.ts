import { closeSync, openSync, readSync } from 'node:fs';

import { BadRequestException } from '@nestjs/common';

/**
 * Multer's `file.mimetype` comes from the client's `Content-Type` and cannot be
 * trusted: anyone can label an HTML/script payload as `image/jpeg`. Sniff the
 * first bytes of the stored file instead, so only real images pass. Only the
 * formats the app allows (JPEG, PNG, WebP) are recognized.
 */
export function detectImageMime(header: Buffer): string | null {
	if (header.length >= 3 && header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff) {
		return 'image/jpeg';
	}
	if (
		header.length >= 8 &&
		header[0] === 0x89 &&
		header[1] === 0x50 &&
		header[2] === 0x4e &&
		header[3] === 0x47 &&
		header[4] === 0x0d &&
		header[5] === 0x0a &&
		header[6] === 0x1a &&
		header[7] === 0x0a
	) {
		return 'image/png';
	}
	if (
		header.length >= 12 &&
		header.subarray(0, 4).toString('ascii') === 'RIFF' &&
		header.subarray(8, 12).toString('ascii') === 'WEBP'
	) {
		return 'image/webp';
	}
	return null;
}

/**
 * Reads the upload header from disk (multer `diskStorage`) or from the in-memory
 * buffer (multer `memoryStorage`, used in tests) and ensures the actual bytes
 * match an allowed image type. Throws `BadRequestException` otherwise.
 */
export function assertImageMagic(file: Express.Multer.File, allowed: Set<string>): void {
	const header = readUploadHeader(file);
	const detected = header ? detectImageMime(header) : null;
	if (!detected || !allowed.has(detected) || detected !== file.mimetype) {
		throw new BadRequestException(
			detected && detected !== file.mimetype
				? `File content does not match its declared type (${file.mimetype})`
				: 'File must be a JPEG, PNG, or WebP image',
		);
	}
}

function readUploadHeader(file: Express.Multer.File): Buffer | null {
	if (file.buffer && file.buffer.length > 0) {
		return file.buffer.subarray(0, 12);
	}
	if (!file.path) {
		return null;
	}
	const descriptor = openSync(file.path, 'r');
	try {
		const header = Buffer.alloc(12);
		const bytesRead = readSync(descriptor, header, 0, header.length, 0);
		return header.subarray(0, bytesRead);
	} finally {
		closeSync(descriptor);
	}
}
