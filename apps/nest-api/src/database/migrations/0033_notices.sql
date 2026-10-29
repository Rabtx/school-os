-- Notices (Figma 185:56501): drafts, sent through approvals for teachers, and who each one reached and who read it.
CREATE TABLE "notices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"title" varchar(160) NOT NULL,
	"body" text NOT NULL,
	"audience" jsonb NOT NULL,
	"status" varchar(24) DEFAULT 'draft' NOT NULL,
	"created_by_membership_id" uuid,
	"sent_by_membership_id" uuid,
	"sent_at" timestamp with time zone,
	"recipient_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "notices_status_check" CHECK ("status" IN ('draft', 'pending_approval', 'sent'))
);
--> statement-breakpoint
CREATE TABLE "notice_recipients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"notice_id" uuid NOT NULL,
	"guardian_id" uuid,
	"membership_id" uuid,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "notice_recipients_someone_check" CHECK ("guardian_id" IS NOT NULL OR "membership_id" IS NOT NULL)
);
--> statement-breakpoint
ALTER TABLE "notices" ADD CONSTRAINT "notices_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notices" ADD CONSTRAINT "notices_created_by_membership_id_memberships_id_fk" FOREIGN KEY ("created_by_membership_id") REFERENCES "public"."memberships"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notices" ADD CONSTRAINT "notices_sent_by_membership_id_memberships_id_fk" FOREIGN KEY ("sent_by_membership_id") REFERENCES "public"."memberships"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notice_recipients" ADD CONSTRAINT "notice_recipients_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notice_recipients" ADD CONSTRAINT "notice_recipients_notice_id_notices_id_fk" FOREIGN KEY ("notice_id") REFERENCES "public"."notices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notice_recipients" ADD CONSTRAINT "notice_recipients_guardian_id_guardians_id_fk" FOREIGN KEY ("guardian_id") REFERENCES "public"."guardians"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notice_recipients" ADD CONSTRAINT "notice_recipients_membership_id_memberships_id_fk" FOREIGN KEY ("membership_id") REFERENCES "public"."memberships"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "notices_tenant_status_idx" ON "notices" USING btree ("tenant_id","status","updated_at");--> statement-breakpoint
CREATE INDEX "notices_creator_idx" ON "notices" USING btree ("tenant_id","created_by_membership_id");--> statement-breakpoint
CREATE UNIQUE INDEX "notice_recipients_notice_guardian_unique" ON "notice_recipients" USING btree ("notice_id","guardian_id");--> statement-breakpoint
CREATE UNIQUE INDEX "notice_recipients_notice_membership_unique" ON "notice_recipients" USING btree ("notice_id","membership_id");--> statement-breakpoint
CREATE INDEX "notice_recipients_membership_idx" ON "notice_recipients" USING btree ("tenant_id","membership_id");--> statement-breakpoint
INSERT INTO navigation_items (key, label, href, icon_key, section_heading, required_permission, sort_order, surface, visible_to_roles)
VALUES ('notices', 'Notices', '/admin/notices', 'megaphone', 'Primary', NULL, 17, 'admin', ARRAY['owner', 'principal', 'admin', 'vice_principal', 'teacher', 'parent'])
ON CONFLICT (surface, key) DO NOTHING;
