import * as z from 'zod';

import { billingUrlSchema } from '@/common/validation/http-url.schema';

export const createCheckoutSchema = z
	.object({
		provider: z.enum(['stripe', 'razorpay']).optional(),
		planCode: z.enum(['team', 'enterprise']),
		billingInterval: z.enum(['monthly', 'yearly']).default('monthly'),
		successUrl: billingUrlSchema.optional(),
		cancelUrl: billingUrlSchema.optional(),
	})
	.strict();

export class CreateCheckoutDto {
	static schema = createCheckoutSchema;
	provider?: 'stripe' | 'razorpay';
	planCode!: 'team' | 'enterprise';
	billingInterval!: 'monthly' | 'yearly';
	successUrl?: string;
	cancelUrl?: string;
}

export const createPortalSchema = z
	.object({
		provider: z.enum(['stripe', 'razorpay']).optional(),
		returnUrl: billingUrlSchema.optional(),
	})
	.strict();

export class CreatePortalDto {
	static schema = createPortalSchema;
	provider?: 'stripe' | 'razorpay';
	returnUrl?: string;
}

export type CreateCheckoutInput = z.infer<typeof createCheckoutSchema>;
export type CreatePortalInput = z.infer<typeof createPortalSchema>;
