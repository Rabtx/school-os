import * as z from 'zod';

/**
 * URL fields rendered back into the web app (links, images) must never accept
 * script-capable schemes. `z.url()` alone accepts `javascript:` and `data:`
 * URLs, which React renders verbatim into `href`/`src` and turn a stored value
 * into stored XSS or an open redirect. Only http(s) is allowed here; billing
 * returns also accept the Expo app's deep-link schemes (see below).
 */
export const httpUrlSchema = z
	.string()
	.trim()
	.min(1)
	.max(2048)
	.refine(isHttpUrl, 'URL must use http or https');

/**
 * Stripe/Razorpay redirect targets returned by billing. The web app sends
 * `http(s)` origins; the Expo app sends deep links (`school-os://` in a
 * standalone build, `exp://` in Expo Go). Script-capable schemes (`javascript:`,
 * `data:`, `vbscript:`, `file:`) are refused either way.
 */
export const billingUrlSchema = z
	.string()
	.trim()
	.min(1)
	.max(2048)
	.refine(isBillingUrl, 'URL must use http, https, or a supported app scheme');

function isHttpUrl(value: string): boolean {
	const protocol = urlProtocol(value);
	return protocol === 'http:' || protocol === 'https:';
}

function isBillingUrl(value: string): boolean {
	const protocol = urlProtocol(value);
	return (
		protocol === 'http:' ||
		protocol === 'https:' ||
		protocol === 'school-os:' ||
		protocol === 'exp:'
	);
}

function urlProtocol(value: string): string | null {
	try {
		return new URL(value).protocol.toLowerCase();
	} catch {
		return null;
	}
}
