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

export function resolveRequestOrigin(req: Request, trustProxy = false): string {
	const forwardedProto = trustProxy ? headerFirst(req.headers['x-forwarded-proto']) : undefined;
	const forwardedHost = trustProxy ? headerFirst(req.headers['x-forwarded-host']) : undefined;
	const protocol = forwardedProto ?? req.protocol;
	const host = forwardedHost ?? req.get('host');
	if (!host) {
		throw new BadRequestException('Unable to resolve public host for avatar URL');
	}
	return `${protocol}://${host}`;
}

function headerFirst(value: string | string[] | undefined): string | undefined {
	if (!value) return undefined;
	const raw = Array.isArray(value) ? value[0] : value;
	return raw.split(',')[0]?.trim() || undefined;
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
