import {
	Body,
	Controller,
	Get,
	HttpCode,
	HttpStatus,
	Patch,
	Post,
	Req,
	UploadedFile,
	UseGuards,
	UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';

import type { AppConfigService } from '@/config/app-config.service';
import type { AccessTokenPayload } from '@/modules/auth/auth.types';
import { CurrentUser } from '@/modules/auth/current-user.decorator';
import { JwtAuthGuard } from '@/modules/auth/jwt-auth.guard';
import { createAvatarMulterOptions, resolveRequestOrigin } from './avatar-upload';
import { UpdateProfileDto } from './profiles.dto';
import { ProfilesService } from './profiles.service';

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({ path: 'users/me', version: '1' })
export class ProfilesController {
	constructor(
		private readonly profiles: ProfilesService,
		private readonly config: AppConfigService,
	) {}

	@Get()
	@ApiOperation({ summary: 'Get the authenticated user and profile' })
	getCurrent(@CurrentUser() user: AccessTokenPayload) {
		return this.profiles.getCurrent(user.sub);
	}

	@Patch('profile')
	@HttpCode(HttpStatus.OK)
	@ApiOperation({ summary: 'Update the authenticated user profile' })
	update(@CurrentUser() user: AccessTokenPayload, @Body() body: UpdateProfileDto) {
		return this.profiles.update(user.sub, body);
	}

	@Post('avatar')
	@HttpCode(HttpStatus.OK)
	@ApiOperation({ summary: 'Upload a profile avatar image from device' })
	@ApiConsumes('multipart/form-data')
	@ApiBody({
		schema: {
			type: 'object',
			required: ['file'],
			properties: {
				file: { type: 'string', format: 'binary' },
			},
		},
	})
	@UseInterceptors(FileInterceptor('file', createAvatarMulterOptions()))
	uploadAvatar(
		@CurrentUser() user: AccessTokenPayload,
		@UploadedFile() file: Express.Multer.File,
		@Req() req: Request,
	) {
		return this.profiles.uploadAvatar(
			user.sub,
			file,
			resolveRequestOrigin(req, this.config.trustProxy),
		);
	}
}
