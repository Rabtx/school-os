-- WhatsApp and SMS delivery: each school's channel switch, and every attempt to reach a guardian outside the app.
CREATE TABLE "tenant_messaging_channels" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"channel" varchar(16) NOT NULL,
	"status" varchar(16) NOT NULL,
	"connected_by_membership_id" uuid,
	"connected_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tenant_messaging_channels_channel_check" CHECK ("channel" IN ('whatsapp', 'sms')),
	CONSTRAINT "tenant_messaging_channels_status_check" CHECK ("status" IN ('connected', 'disconnected'))
);
--> statement-breakpoint
CREATE TABLE "message_deliveries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"source_type" varchar(16) NOT NULL,
	"source_id" uuid NOT NULL,
	"guardian_id" uuid NOT NULL,
	"to_phone" varchar(32) NOT NULL,
	"channel" varchar(16) NOT NULL,
	"template" varchar(64),
	"template_params" jsonb,
	"language" varchar(8) DEFAULT 'en' NOT NULL,
	"body" text NOT NULL,
	"status" varchar(16) DEFAULT 'queued' NOT NULL,
	"provider_message_id" varchar(160),
	"error" text,
	"attempts" integer DEFAULT 0 NOT NULL,
	"not_before" timestamp with time zone DEFAULT now() NOT NULL,
	"sent_at" timestamp with time zone,
	"delivered_at" timestamp with time zone,
	"read_at" timestamp with time zone,
	"fallback_for_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "message_deliveries_source_check" CHECK ("source_type" IN ('message', 'notice')),
	CONSTRAINT "message_deliveries_channel_check" CHECK ("channel" IN ('whatsapp', 'sms')),
	CONSTRAINT "message_deliveries_language_check" CHECK ("language" IN ('en', 'ur')),
	CONSTRAINT "message_deliveries_status_check" CHECK ("status" IN ('queued', 'sent', 'delivered', 'read', 'failed', 'skipped'))
);
--> statement-breakpoint
ALTER TABLE "guardians" ADD COLUMN "preferred_language" varchar(8) DEFAULT 'en' NOT NULL;--> statement-breakpoint
ALTER TABLE "guardians" ADD CONSTRAINT "guardians_preferred_language_check" CHECK ("preferred_language" IN ('en', 'ur'));--> statement-breakpoint
ALTER TABLE "tenant_messaging_channels" ADD CONSTRAINT "tenant_messaging_channels_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenant_messaging_channels" ADD CONSTRAINT "tenant_messaging_channels_connected_by_membership_id_memberships_id_fk" FOREIGN KEY ("connected_by_membership_id") REFERENCES "public"."memberships"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_deliveries" ADD CONSTRAINT "message_deliveries_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_deliveries" ADD CONSTRAINT "message_deliveries_guardian_id_guardians_id_fk" FOREIGN KEY ("guardian_id") REFERENCES "public"."guardians"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "tenant_messaging_channels_unique" ON "tenant_messaging_channels" USING btree ("tenant_id","channel");--> statement-breakpoint
CREATE INDEX "message_deliveries_due_idx" ON "message_deliveries" USING btree ("status","not_before");--> statement-breakpoint
CREATE INDEX "message_deliveries_source_idx" ON "message_deliveries" USING btree ("source_type","source_id");--> statement-breakpoint
CREATE INDEX "message_deliveries_tenant_created_idx" ON "message_deliveries" USING btree ("tenant_id","created_at");--> statement-breakpoint
CREATE INDEX "message_deliveries_phone_idx" ON "message_deliveries" USING btree ("to_phone","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "message_deliveries_provider_id_unique" ON "message_deliveries" USING btree ("provider_message_id");
