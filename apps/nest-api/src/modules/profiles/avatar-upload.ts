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

export function resolveRequestOrigin(req: Request): string {
	// Express applies the configured `trust proxy` setting itself, so req.protocol
	// and the Host header only reflect X-Forwarded-* on deployments that opted in.
	// Reading the forwarded headers directly would persist client-chosen URLs.
	const host = req.get('host');
	if (!host) {
		throw new BadRequestException('Unable to resolve public host for avatar URL');
	}
	return `${req.protocol}://${host}`;
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
