import { existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

import {
	BadRequestException,
	Injectable,
	type OnModuleInit,
	PayloadTooLargeException,
} from '@nestjs/common';

import { assertImageMagic } from '@/common/validation/image-upload';

export const STUDENT_PHOTO_UPLOAD_DIR = join(process.cwd(), 'uploads', 'student-photos');
export const STUDENT_PHOTO_MAX_BYTES = 2 * 1024 * 1024;
export const STUDENT_PHOTO_ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp']);

@Injectable()
export class StudentPhotoStorageService implements OnModuleInit {
	onModuleInit(): void {
		if (!existsSync(STUDENT_PHOTO_UPLOAD_DIR)) {
			mkdirSync(STUDENT_PHOTO_UPLOAD_DIR, { recursive: true });
		}
	}

	assertValidUpload(file: Express.Multer.File | undefined): Express.Multer.File {
		if (!file) {
			throw new BadRequestException('Student photo is required');
		}
		if (!STUDENT_PHOTO_ALLOWED_MIME.has(file.mimetype)) {
			throw new BadRequestException('Photo must be a JPEG, PNG, or WebP image');
		}
		if (file.size > STUDENT_PHOTO_MAX_BYTES) {
			throw new PayloadTooLargeException('Photo must be 2 MB or smaller');
		}
		// The client-supplied mimetype above is not enough: verify the bytes too.
		assertImageMagic(file, STUDENT_PHOTO_ALLOWED_MIME);
		return file;
	}

	publicUrl(origin: string, filename: string): string {
		return `${origin.replace(/\/$/, '')}/uploads/student-photos/${filename}`;
	}
}
