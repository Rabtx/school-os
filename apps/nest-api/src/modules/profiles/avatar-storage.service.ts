import { existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

import {
	BadRequestException,
	Injectable,
	type OnModuleInit,
	PayloadTooLargeException,
} from '@nestjs/common';

import { assertImageMagic } from '@/common/validation/image-upload';

export const AVATAR_UPLOAD_DIR = join(process.cwd(), 'uploads', 'avatars');
export const AVATAR_MAX_BYTES = 2 * 1024 * 1024;
export const AVATAR_ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp']);

@Injectable()
export class AvatarStorageService implements OnModuleInit {
	onModuleInit(): void {
		if (!existsSync(AVATAR_UPLOAD_DIR)) {
			mkdirSync(AVATAR_UPLOAD_DIR, { recursive: true });
		}
	}

	assertValidUpload(file: Express.Multer.File | undefined): Express.Multer.File {
		if (!file) {
			throw new BadRequestException('Avatar image is required');
		}
		if (!AVATAR_ALLOWED_MIME.has(file.mimetype)) {
			throw new BadRequestException('Avatar must be a JPEG, PNG, or WebP image');
		}
		if (file.size > AVATAR_MAX_BYTES) {
			throw new PayloadTooLargeException('Avatar must be 2 MB or smaller');
		}
		// The client-supplied mimetype above is not enough: verify the bytes too.
		assertImageMagic(file, AVATAR_ALLOWED_MIME);
		return file;
	}

	publicUrl(origin: string, filename: string): string {
		return `${origin.replace(/\/$/, '')}/uploads/avatars/${filename}`;
	}
}
