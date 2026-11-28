import { createHmac, timingSafeEqual } from 'node:crypto';
import {
	BadRequestException,
	Injectable,
	Logger,
	NotImplementedException,
	ServiceUnavailableException,
} from '@nestjs/common';
import Razorpay from 'razorpay';

import { AppConfigService } from '@/config/app-config.service';
import {
	type CheckoutInput,
	type CheckoutResult,
	type NormalizedWebhookEvent,
	PaymentProvider,
	type PortalInput,
	type SubscriptionStatus,
} from './payment-provider';

type RazorpaySubscription = {
	id: string;
	status: string;
	short_url?: string;
	customer_id?: string;
	current_end?: number;
	notes?: Record<string, string>;
};

@Injectable()
export class RazorpayPaymentProvider extends PaymentProvider {
	readonly name = 'razorpay' as const;
	private readonly logger = new Logger(RazorpayPaymentProvider.name);
	private readonly client: Razorpay | null;

	constructor(private readonly config: AppConfigService) {
		super();
		this.client =
			config.razorpayKeyId && config.razorpayKeySecret
				? new Razorpay({
						key_id: config.razorpayKeyId,
						key_secret: config.razorpayKeySecret,
					})
				: null;
	}

	isConfigured(): boolean {
		return Boolean(this.client && this.config.razorpayWebhookSecret);
	}

	async createCheckout(input: CheckoutInput): Promise<CheckoutResult> {
		const razorpay = this.requireClient();
		const subscription = (await razorpay.subscriptions.create({
			plan_id: input.priceId,
			total_count: input.billingInterval === 'yearly' ? 10 : 120,
			customer_notify: 1,
			notes: {
				userId: input.userId,
				email: input.email,
				planCode: input.planCode,
				billingInterval: input.billingInterval,
			},
		})) as RazorpaySubscription;

		if (!subscription.short_url) {
			throw new ServiceUnavailableException({
				code: 'BILLING_CHECKOUT_FAILED',
				message: 'Razorpay did not return a checkout URL',
			});
		}

		return {
			provider: 'razorpay',
			checkoutUrl: subscription.short_url,
			providerSessionId: subscription.id,
		};
	}

	createPortal(_input: PortalInput): Promise<{ url: string }> {
		throw new NotImplementedException({
			code: 'BILLING_PORTAL_UNSUPPORTED',
			message:
				'Razorpay Customer Portal is not available. Cancel or change plans via support for now.',
		});
	}

	async parseWebhook(
		rawBody: Buffer,
		headers: Record<string, string | string[] | undefined>,
	): Promise<NormalizedWebhookEvent | null> {
		const secret = this.config.razorpayWebhookSecret;
		if (!secret) {
			throw new ServiceUnavailableException({
				code: 'BILLING_RAZORPAY_NOT_CONFIGURED',
				message: 'Razorpay webhook secret is not configured',
			});
		}

		const signature = headerValue(headers['x-razorpay-signature']);
		if (!signature) {
			throw new BadRequestException({
				code: 'BILLING_WEBHOOK_SIGNATURE_MISSING',
				message: 'Missing X-Razorpay-Signature header',
			});
		}

		const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
		const provided = Buffer.from(signature);
		const computed = Buffer.from(expected);
		if (provided.length !== computed.length || !timingSafeEqual(provided, computed)) {
			this.logger.warn('Razorpay webhook signature failed');
			throw new BadRequestException({
				code: 'BILLING_WEBHOOK_INVALID',
				message: 'Invalid Razorpay webhook signature',
			});
		}

		let payload: {
			event?: string;
			payload?: {
				subscription?: { entity?: RazorpaySubscription };
			};
		};
		try {
			payload = JSON.parse(rawBody.toString('utf8')) as typeof payload;
		} catch {
			this.logger.warn('Razorpay webhook body is not valid JSON');
			throw new BadRequestException({
				code: 'BILLING_WEBHOOK_INVALID',
				message: 'Invalid Razorpay webhook payload',
			});
		}

		const subscription = payload.payload?.subscription?.entity;
		if (!subscription || !payload.event) {
			return null;
		}

		const status = mapRazorpayStatus(subscription.status, payload.event);
		if (!status) {
			return null;
		}

		return {
			provider: 'razorpay',
			idempotencyKey: `${payload.event}:${subscription.id}:${subscription.status}`,
			userId: subscription.notes?.userId,
			providerCustomerId: subscription.customer_id,
			providerSubscriptionId: subscription.id,
			planCode: asPlanCode(subscription.notes?.planCode),
			billingInterval: asInterval(subscription.notes?.billingInterval),
			status,
			currentPeriodEnd: subscription.current_end
				? new Date(subscription.current_end * 1000)
				: undefined,
			cancelAtPeriodEnd: payload.event === 'subscription.pending',
		};
	}

	private requireClient(): Razorpay {
		if (!this.client) {
			throw new ServiceUnavailableException({
				code: 'BILLING_RAZORPAY_NOT_CONFIGURED',
				message: 'Razorpay is not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.',
			});
		}
		return this.client;
	}
}

function headerValue(value: string | string[] | undefined): string | undefined {
	if (Array.isArray(value)) {
		return value[0];
	}
	return value;
}

function mapRazorpayStatus(status: string, event: string): SubscriptionStatus | null {
	if (event === 'subscription.cancelled' || status === 'cancelled') {
		return 'canceled';
	}
	if (event === 'subscription.halted' || status === 'halted') {
		return 'past_due';
	}
	if (
		status === 'active' ||
		event === 'subscription.activated' ||
		event === 'subscription.charged'
	) {
		return 'active';
	}
	if (status === 'authenticated' || status === 'created') {
		return 'incomplete';
	}
	return null;
}

function asPlanCode(value: string | undefined): 'team' | 'enterprise' | undefined {
	if (value === 'team' || value === 'enterprise') return value;
	return undefined;
}

function asInterval(value: string | undefined): 'monthly' | 'yearly' | undefined {
	if (value === 'monthly' || value === 'yearly') return value;
	return undefined;
}
