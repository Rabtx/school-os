import { Module, type OnModuleInit } from '@nestjs/common';

import { AppConfigService } from '@/config/app-config.service';
import { AuthModule } from '@/modules/auth/auth.module';
import { MembershipsModule } from '@/modules/memberships/memberships.module';
import { MessagesModule } from '@/modules/messages/messages.module';
import { NotificationsModule } from '@/modules/notifications/notifications.module';
import { OutboxDispatchService } from '@/modules/notifications/outbox-dispatch.service';
import { RulesModule } from '@/modules/rules/rules.module';
import { TenantsModule } from '@/modules/tenants/tenants.module';
import { MessageSentOutboxHandler, NoticeSentOutboxHandler } from './delivery-outbox.handlers';
import { DeliveryRepository } from './delivery.repository';
import { DeliveryService } from './delivery.service';
import { DeliveryWorkerService } from './delivery-worker.service';
import { MessagingController } from './messaging.controller';
import { SMS_PROVIDER, WHATSAPP_PROVIDER } from './providers/delivery-provider';
import { MetaWhatsAppProvider } from './providers/meta-whatsapp.provider';
import { SandboxSmsProvider, SandboxWhatsAppProvider } from './providers/sandbox.providers';
import { WhatsAppWebhookController } from './whatsapp-webhook.controller';

@Module({
	imports: [
		AuthModule,
		MembershipsModule,
		TenantsModule,
		NotificationsModule,
		RulesModule,
		MessagesModule,
	],
	controllers: [MessagingController, WhatsAppWebhookController],
	providers: [
		DeliveryRepository,
		DeliveryService,
		DeliveryWorkerService,
		MessageSentOutboxHandler,
		NoticeSentOutboxHandler,
		{
			provide: WHATSAPP_PROVIDER,
			inject: [AppConfigService],
			useFactory: (config: AppConfigService) => {
				const { provider, meta } = config.whatsapp;
				if (provider === 'meta' && meta.accessToken && meta.phoneNumberId) {
					return new MetaWhatsAppProvider({
						accessToken: meta.accessToken,
						phoneNumberId: meta.phoneNumberId,
						apiVersion: meta.apiVersion,
					});
				}
				return new SandboxWhatsAppProvider();
			},
		},
		{ provide: SMS_PROVIDER, useFactory: () => new SandboxSmsProvider() },
	],
	exports: [DeliveryService],
})
export class DeliveryModule implements OnModuleInit {
	constructor(
		private readonly dispatch: OutboxDispatchService,
		private readonly messageSent: MessageSentOutboxHandler,
		private readonly noticeSent: NoticeSentOutboxHandler,
	) {}

	/** The outbox hands these events to delivery; the notifications module needs no import of it. */
	onModuleInit() {
		this.dispatch.register(this.messageSent);
		this.dispatch.register(this.noticeSent);
	}
}
