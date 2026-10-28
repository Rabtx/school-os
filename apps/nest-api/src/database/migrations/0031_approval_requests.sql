-- Approvals queue (Figma 82:37115): requests leadership decides, with an undo window and an audit trail.
CREATE TABLE "approval_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"type" varchar(64) NOT NULL,
	"status" varchar(16) DEFAULT 'pending' NOT NULL,
	"risk" varchar(16) DEFAULT 'low' NOT NULL,
	"approver_role" varchar(16) DEFAULT 'leadership' NOT NULL,
	"payload" jsonb NOT NULL,
	"dedupe_key" varchar(200) NOT NULL,
	"note" text,
	"requested_by_membership_id" uuid,
	"decided_by_membership_id" uuid,
	"decided_at" timestamp with time zone,
	"decision_reason" text,
	"result" jsonb,
	"undo_until" timestamp with time zone,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "approval_requests_status_check" CHECK ("status" IN ('pending', 'approved', 'declined', 'expired', 'cancelled')),
	CONSTRAINT "approval_requests_risk_check" CHECK ("risk" IN ('low', 'medium', 'high')),
	CONSTRAINT "approval_requests_approver_role_check" CHECK ("approver_role" IN ('leadership', 'owner'))
);
--> statement-breakpoint
ALTER TABLE "approval_requests" ADD CONSTRAINT "approval_requests_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval_requests" ADD CONSTRAINT "approval_requests_requested_by_membership_id_memberships_id_fk" FOREIGN KEY ("requested_by_membership_id") REFERENCES "public"."memberships"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval_requests" ADD CONSTRAINT "approval_requests_decided_by_membership_id_memberships_id_fk" FOREIGN KEY ("decided_by_membership_id") REFERENCES "public"."memberships"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "approval_requests_tenant_status_idx" ON "approval_requests" USING btree ("tenant_id","status","created_at");--> statement-breakpoint
CREATE INDEX "approval_requests_requester_idx" ON "approval_requests" USING btree ("tenant_id","requested_by_membership_id");--> statement-breakpoint
CREATE UNIQUE INDEX "approval_requests_pending_dedupe_unique" ON "approval_requests" USING btree ("tenant_id","dedupe_key") WHERE status = 'pending';--> statement-breakpoint
INSERT INTO navigation_items (key, label, href, icon_key, section_heading, required_permission, sort_order, surface, visible_to_roles)
VALUES ('approvals', 'Approvals', '/admin/approvals', 'approvals', 'Primary', 'tenant.settings.read', 15, 'admin', ARRAY['owner', 'principal', 'admin', 'vice_principal'])
ON CONFLICT (surface, key) DO NOTHING;
