-- Messages (Figma 77:66449): one thread per guardian and child, with read state per message.
CREATE TABLE "message_threads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"guardian_id" uuid NOT NULL,
	"student_id" uuid NOT NULL,
	"needs_reply" boolean DEFAULT false NOT NULL,
	"last_message_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_message_preview" varchar(200) DEFAULT '' NOT NULL,
	"last_message_direction" varchar(16) DEFAULT 'to_family' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "message_threads_last_direction_check" CHECK ("last_message_direction" IN ('to_family', 'from_family'))
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"thread_id" uuid NOT NULL,
	"direction" varchar(16) NOT NULL,
	"sender_membership_id" uuid,
	"body" text NOT NULL,
	"channel" varchar(16) DEFAULT 'app' NOT NULL,
	"status" varchar(16) DEFAULT 'sent' NOT NULL,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "messages_direction_check" CHECK ("direction" IN ('to_family', 'from_family')),
	CONSTRAINT "messages_channel_check" CHECK ("channel" IN ('app', 'whatsapp', 'sms')),
	CONSTRAINT "messages_status_check" CHECK ("status" IN ('sent', 'delivered', 'read', 'failed'))
);
--> statement-breakpoint
ALTER TABLE "message_threads" ADD CONSTRAINT "message_threads_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_threads" ADD CONSTRAINT "message_threads_guardian_id_guardians_id_fk" FOREIGN KEY ("guardian_id") REFERENCES "public"."guardians"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_threads" ADD CONSTRAINT "message_threads_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_thread_id_message_threads_id_fk" FOREIGN KEY ("thread_id") REFERENCES "public"."message_threads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_sender_membership_id_memberships_id_fk" FOREIGN KEY ("sender_membership_id") REFERENCES "public"."memberships"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "message_threads_guardian_student_unique" ON "message_threads" USING btree ("tenant_id","guardian_id","student_id");--> statement-breakpoint
CREATE INDEX "message_threads_tenant_last_idx" ON "message_threads" USING btree ("tenant_id","last_message_at");--> statement-breakpoint
CREATE INDEX "message_threads_student_idx" ON "message_threads" USING btree ("tenant_id","student_id");--> statement-breakpoint
CREATE INDEX "messages_thread_created_idx" ON "messages" USING btree ("thread_id","created_at");--> statement-breakpoint
INSERT INTO navigation_items (key, label, href, icon_key, section_heading, required_permission, sort_order, surface, visible_to_roles)
VALUES ('messages', 'Messages', '/admin/messages', 'messages', 'Primary', NULL, 16, 'admin', ARRAY['owner', 'principal', 'admin', 'vice_principal', 'teacher', 'parent'])
ON CONFLICT (surface, key) DO NOTHING;
