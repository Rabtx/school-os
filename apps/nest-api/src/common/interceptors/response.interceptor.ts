import type { CallHandler, ExecutionContext, NestInterceptor } from '@nestjs/common';
import { Injectable } from '@nestjs/common';
import type { Response } from 'express';
import type { Observable } from 'rxjs';
import { map } from 'rxjs';

import type { ApiSuccessResponse } from '@/common/types/api-response.type';
import type { RequestWithId } from '@/common/types/request-with-id.type';

@Injectable()
export class ResponseInterceptor<TData> implements NestInterceptor<
	TData,
	ApiSuccessResponse<TData>
> {
	intercept(
		context: ExecutionContext,
		next: CallHandler<TData>,
	): Observable<ApiSuccessResponse<TData>> {
		const http = context.switchToHttp();
		const request = http.getRequest<RequestWithId>();
		const response = http.getResponse<Response>();

		return next.handle().pipe(
			map((data) => ({
				success: true,
				statusCode: response.statusCode,
				requestId: request.requestId ?? 'req_unknown',
				timestamp: new Date().toISOString(),
				data,
			})),
		);
	}
}
