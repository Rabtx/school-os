import { randomUUID } from 'node:crypto';
import { extname } from 'node:path';

import { BadRequestException } from '@nestjs/common';
import type { Request } from 'express';
import { diskStorage } from 'multer';

import { AVATAR_ALLOWED_MIME, AVATAR_MAX_BYTES, AVATAR_UPLOAD_DIR } from './avatar-storage.service';

export function createAvatarMulterOptions() {
	return {
		storage: diskStorage({
			destination: AVATAR_UPLOAD_DIR,
			filename: (_req, file, callback) => {
				const extension = extensionForMime(file.mimetype) ?? safeExtension(file.originalname);
				if (!extension) {
					callback(new BadRequestException('Unsupported avatar file type'), '');
					return;
				}
				callback(null, `${randomUUID()}${extension}`);
			},
		}),
		limits: { fileSize: AVATAR_MAX_BYTES },
		fileFilter: (
			_req: Request,
			file: Express.Multer.File,
			callback: (error: Error | null, acceptFile: boolean) => void,
		) => {
			if (!AVATAR_ALLOWED_MIME.has(file.mimetype)) {
				callback(new BadRequestException('Avatar must be a JPEG, PNG, or WebP image'), false);
				return;
			}
			callback(null, true);
		},
	};
}

/**
 * Builds the public origin stored in the avatar/photo URL. The previous
 * implementation trusted the `X-Forwarded-Host`/`X-Forwarded-Proto` headers on
 * every upload, so any caller could poison the stored URL (tracking pixel,
 * userinfo phishing like `trusted@evil`) even when `TRUST_PROXY` was off.
 * Express already honors forwarded headers only when `trust proxy` is set
 * (see `setupApp`), so use its `protocol`/`host` and validate them instead.
 */
export function resolveRequestOrigin(req: Request): string {
	const protocol = req.protocol?.toLowerCase();
	const host = req.get('host')?.trim();
	if ((protocol !== 'http' && protocol !== 'https') || !host || !isValidHost(host)) {
		throw new BadRequestException('Unable to resolve public host for avatar URL');
	}
	return `${protocol}://${host}`;
}

function isValidHost(host: string): boolean {
	// IPv6 literal: [::1] or [::1]:3000
	if (/^\[[0-9a-fA-F:]+\](:\d{1,5})?$/.test(host)) {
		return true;
	}
	return /^[a-zA-Z0-9]([a-zA-Z0-9.-]*[a-zA-Z0-9])?(:\d{1,5})?$/.test(host);
}

function extensionForMime(mime: string): string | null {
	switch (mime) {
		case 'image/jpeg':
			return '.jpg';
		case 'image/png':
			return '.png';
		case 'image/webp':
			return '.webp';
		default:
			return null;
	}
}

function safeExtension(filename: string): string | null {
	const extension = extname(filename).toLowerCase();
	if (extension === '.jpg' || extension === '.jpeg') return '.jpg';
	if (extension === '.png' || extension === '.webp') return extension;
	return null;
}
