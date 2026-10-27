import {
	BadRequestException,
	Injectable,
	Logger,
	ServiceUnavailableException,
} from '@nestjs/common';
import Stripe from 'stripe';

import { AppConfigService } from '@/config/app-config.service';
import {
	type CheckoutInput,
	type CheckoutResult,
	type NormalizedWebhookEvent,
	PaymentProvider,
	type PortalInput,
	type SubscriptionStatus,
} from './payment-provider';

@Injectable()
export class StripePaymentProvider extends PaymentProvider {
	readonly name = 'stripe' as const;
	private readonly logger = new Logger(StripePaymentProvider.name);
	private readonly client: Stripe | null;

	constructor(private readonly config: AppConfigService) {
		super();
		this.client = config.stripeSecretKey
			? new Stripe(config.stripeSecretKey, {
					apiVersion: '2026-09-30.endive',
				})
			: null;
	}

	isConfigured(): boolean {
		return Boolean(this.client && this.config.stripeWebhookSecret);
	}

	async createCheckout(input: CheckoutInput): Promise<CheckoutResult> {
		const stripe = this.requireClient();
		const session = await stripe.checkout.sessions.create({
			mode: 'subscription',
			customer_email: input.email,
			client_reference_id: input.userId,
			success_url: input.successUrl,
			cancel_url: input.cancelUrl,
			line_items: [{ price: input.priceId, quantity: 1 }],
			metadata: {
				userId: input.userId,
				planCode: input.planCode,
				billingInterval: input.billingInterval,
			},
			subscription_data: {
				metadata: {
					userId: input.userId,
					planCode: input.planCode,
					billingInterval: input.billingInterval,
				},
			},
		});

		if (!session.url) {
			throw new ServiceUnavailableException({
				code: 'BILLING_CHECKOUT_FAILED',
				message: 'Stripe did not return a checkout URL',
			});
		}

		return {
			provider: 'stripe',
			checkoutUrl: session.url,
			providerSessionId: session.id,
		};
	}

	async createPortal(input: PortalInput): Promise<{ url: string }> {
		const stripe = this.requireClient();
		const session = await stripe.billingPortal.sessions.create({
			customer: input.providerCustomerId,
			return_url: input.returnUrl,
		});
		return { url: session.url };
	}

	async parseWebhook(
		rawBody: Buffer,
		headers: Record<string, string | string[] | undefined>,
	): Promise<NormalizedWebhookEvent | null> {
		const stripe = this.requireClient();
		const secret = this.config.stripeWebhookSecret;
		if (!secret) {
			throw new ServiceUnavailableException({
				code: 'BILLING_STRIPE_NOT_CONFIGURED',
				message: 'Stripe webhook secret is not configured',
			});
		}

		const signature = headerValue(headers['stripe-signature']);
		if (!signature) {
			throw new BadRequestException({
				code: 'BILLING_WEBHOOK_SIGNATURE_MISSING',
				message: 'Missing Stripe-Signature header',
			});
		}

		let event: Stripe.Event;
		try {
			event = stripe.webhooks.constructEvent(rawBody, signature, secret);
		} catch (error) {
			this.logger.warn(`Stripe webhook signature failed: ${String(error)}`);
			throw new BadRequestException({
				code: 'BILLING_WEBHOOK_INVALID',
				message: 'Invalid Stripe webhook signature',
			});
		}

		return normalizeStripeEvent(event);
	}

	private requireClient(): Stripe {
		if (!this.client) {
			throw new ServiceUnavailableException({
				code: 'BILLING_STRIPE_NOT_CONFIGURED',
				message: 'Stripe is not configured. Set STRIPE_SECRET_KEY.',
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

function normalizeStripeEvent(event: Stripe.Event): NormalizedWebhookEvent | null {
	switch (event.type) {
		case 'checkout.session.completed': {
			const session = event.data.object as Stripe.Checkout.Session;
			if (session.mode !== 'subscription') {
				return null;
			}
			return {
				provider: 'stripe',
				idempotencyKey: event.id,
				userId: session.metadata?.userId ?? session.client_reference_id ?? undefined,
				providerCustomerId: customerId(session.customer),
				providerSubscriptionId: subscriptionId(session.subscription),
				planCode: asPlanCode(session.metadata?.planCode),
				billingInterval: asInterval(session.metadata?.billingInterval),
				status: 'active',
			};
		}
		case 'customer.subscription.updated':
		case 'customer.subscription.created': {
			const subscription = event.data.object as Stripe.Subscription;
			return {
				provider: 'stripe',
				idempotencyKey: event.id,
				userId: subscription.metadata?.userId,
				providerCustomerId: customerId(subscription.customer),
				providerSubscriptionId: subscription.id,
				planCode: asPlanCode(subscription.metadata?.planCode),
				billingInterval: asInterval(subscription.metadata?.billingInterval),
				status: mapStripeStatus(subscription.status),
				currentPeriodEnd: stripePeriodEnd(subscription),
				cancelAtPeriodEnd: subscription.cancel_at_period_end,
			};
		}
		case 'customer.subscription.deleted': {
			const subscription = event.data.object as Stripe.Subscription;
			return {
				provider: 'stripe',
				idempotencyKey: event.id,
				userId: subscription.metadata?.userId,
				providerCustomerId: customerId(subscription.customer),
				providerSubscriptionId: subscription.id,
				planCode: asPlanCode(subscription.metadata?.planCode),
				billingInterval: asInterval(subscription.metadata?.billingInterval),
				status: 'canceled',
				currentPeriodEnd: stripePeriodEnd(subscription),
				cancelAtPeriodEnd: false,
			};
		}
		default:
			return null;
	}
}

function customerId(
	value: string | Stripe.Customer | Stripe.DeletedCustomer | null,
): string | undefined {
	if (!value) return undefined;
	return typeof value === 'string' ? value : value.id;
}

function stripePeriodEnd(subscription: Stripe.Subscription): Date | undefined {
	const itemEnd = subscription.items?.data?.[0]?.current_period_end;
	if (typeof itemEnd === 'number') {
		return new Date(itemEnd * 1000);
	}
	return undefined;
}

function subscriptionId(value: string | Stripe.Subscription | null): string | undefined {
	if (!value) return undefined;
	return typeof value === 'string' ? value : value.id;
}

function mapStripeStatus(status: Stripe.Subscription.Status): SubscriptionStatus {
	switch (status) {
		case 'trialing':
			return 'trialing';
		case 'active':
			return 'active';
		case 'past_due':
			return 'past_due';
		case 'canceled':
			return 'canceled';
		case 'unpaid':
			return 'unpaid';
		default:
			return 'incomplete';
	}
}

function asPlanCode(value: string | undefined): 'team' | 'enterprise' | undefined {
	if (value === 'team' || value === 'enterprise') return value;
	return undefined;
}

function asInterval(value: string | undefined): 'monthly' | 'yearly' | undefined {
	if (value === 'monthly' || value === 'yearly') return value;
	return undefined;
}
