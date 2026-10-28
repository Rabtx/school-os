import { Injectable } from '@nestjs/common';

import { type AppConfig, createAppConfig } from './app.config';

@Injectable()
export class AppConfigService {
	private readonly config: AppConfig = createAppConfig();

	get nodeEnv(): AppConfig['nodeEnv'] {
		return this.config.nodeEnv;
	}
	get isProduction(): boolean {
		return this.config.nodeEnv === 'production';
	}
	get port(): number {
		return this.config.port;
	}
	get apiPrefix(): string {
		return this.config.apiPrefix;
	}
	get apiVersion(): string {
		return this.config.apiVersion;
	}
	get serviceName(): string {
		return this.config.serviceName;
	}
	get appName(): string {
		return this.config.appName;
	}
	get webAppUrl(): string {
		return this.config.webAppUrl;
	}
	get databaseUrl(): string {
		return this.config.databaseUrl;
	}
	get databasePoolMax(): number {
		return this.config.databasePoolMax;
	}
	get databaseSsl(): boolean {
		return this.config.databaseSsl;
	}
	get jwtSecret(): string {
		return this.config.jwtSecret;
	}
	get jwtAccessExpiresIn(): string {
		return this.config.jwtAccessExpiresIn;
	}
	get authTokenSecret(): string {
		return this.config.authTokenSecret;
	}
	get sessionTtlDays(): number {
		return this.config.sessionTtlDays;
	}
	get otpTtlMinutes(): number {
		return this.config.otpTtlMinutes;
	}
	get otpMaxAttempts(): number {
		return this.config.otpMaxAttempts;
	}
	get magicLinkTtlMinutes(): number {
		return this.config.magicLinkTtlMinutes;
	}
	get mfaChallengeTtlMinutes(): number {
		return this.config.mfaChallengeTtlMinutes;
	}
	get passwordBcryptRounds(): number {
		return this.config.passwordBcryptRounds;
	}
	get maxLoginAttempts(): number {
		return this.config.maxLoginAttempts;
	}
	get loginLockMinutes(): number {
		return this.config.loginLockMinutes;
	}
	get refreshCookieName(): string {
		return this.config.refreshCookieName;
	}
	get cookieDomain(): string | undefined {
		return this.config.cookieDomain;
	}
	get cookieSameSite(): AppConfig['cookieSameSite'] {
		return this.config.cookieSameSite;
	}
	get corsOrigins(): string[] {
		return this.config.corsOrigin.split(',').map((origin) => origin.trim());
	}
	get trustProxy(): boolean {
		return this.config.trustProxy;
	}
	get exposeAuthCodes(): boolean {
		return !this.isProduction && this.config.authDevExposeCodes;
	}
	get resendApiKey(): string | undefined {
		return this.config.resendApiKey;
	}
	get authEmailFrom(): string {
		return this.config.authEmailFrom;
	}
	get webAuthnRpId(): string {
		return this.config.webAuthnRpId;
	}
	get webAuthnOrigins(): string[] {
		return this.config.webAuthnOrigins;
	}
	/** Primary origin for backwards-compatible single-origin callers. */
	get webAuthnOrigin(): string {
		return this.config.webAuthnOrigins[0] ?? 'http://localhost:3000';
	}
	get googleClientId(): string | undefined {
		return this.config.googleClientId;
	}
	get googleAllowedDomains(): string[] {
		return this.config.googleAllowedDomains;
	}
	get billingDefaultProvider(): AppConfig['billingDefaultProvider'] {
		return this.config.billingDefaultProvider;
	}
	get stripeSecretKey(): string | undefined {
		return this.config.stripeSecretKey;
	}
	get stripeWebhookSecret(): string | undefined {
		return this.config.stripeWebhookSecret;
	}
	get razorpayKeyId(): string | undefined {
		return this.config.razorpayKeyId;
	}
	get razorpayKeySecret(): string | undefined {
		return this.config.razorpayKeySecret;
	}
	get razorpayWebhookSecret(): string | undefined {
		return this.config.razorpayWebhookSecret;
	}
	get billingPrices(): AppConfig['billingPrices'] {
		return this.config.billingPrices;
	}
	get outboxWorkerEnabled(): boolean {
		return this.config.outboxWorkerEnabled;
	}
	get outboxPollIntervalMs(): number {
		return this.config.outboxPollIntervalMs;
	}
	get outboxBatchSize(): number {
		return this.config.outboxBatchSize;
	}
	get outboxLeaseMs(): number {
		return this.config.outboxLeaseMs;
	}
	get outboxMaxAttempts(): number {
		return this.config.outboxMaxAttempts;
	}
}
