import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import type { Request } from 'express';

import { AppConfigService } from '@/config/app-config.service';
import { isNativeClient } from './native-client';

const safeMethods = new Set(['GET', 'HEAD', 'OPTIONS']);

@Injectable()
export class CsrfGuard implements CanActivate {
	constructor(private readonly config: AppConfigService) {}

	canActivate(context: ExecutionContext): boolean {
		const request = context.switchToHttp().getRequest<Request>();
		if (safeMethods.has(request.method)) {
			return true;
		}

		// Native apps (Expo / React Native) have no browser origin and no ambient
		// cookies, so they cannot be CSRF'd. They identify themselves explicitly
		// via `X-Client-Platform: native` (see native-client.ts). A browser
		// cannot set that custom header cross-site without a CORS preflight, so
		// exempting it does not open a CSRF path. Without this, every native
		// state-changing request (login, refresh, security changes) is rejected
		// for a missing Origin that native clients never send.
		if (isNativeClient(request)) {
			return true;
		}

		const origin = request.headers.origin;
		if (!origin) {
			throw new ForbiddenException({
				code: 'AUTH_CSRF_REJECTED',
				message: 'Request origin is required for state-changing methods',
			});
		}

		const requestedWith = request.headers['x-requested-with'];
		if (this.config.corsOrigins.includes(origin) && requestedWith === 'XMLHttpRequest') {
			return true;
		}

		throw new ForbiddenException({
			code: 'AUTH_CSRF_REJECTED',
			message: 'Request origin could not be verified',
		});
	}
}
