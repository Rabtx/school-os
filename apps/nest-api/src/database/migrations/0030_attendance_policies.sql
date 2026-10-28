-- Attendance rules per school, one row per saved version (Settings · Attendance rules, Figma 232:140585).
-- The newest version is in force; until a school saves its own, the API serves the defaults.
CREATE TABLE "attendance_policies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"policy" jsonb NOT NULL,
	"created_by_membership_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "attendance_policies" ADD CONSTRAINT "attendance_policies_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_policies" ADD CONSTRAINT "attendance_policies_created_by_membership_id_memberships_id_fk" FOREIGN KEY ("created_by_membership_id") REFERENCES "public"."memberships"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "attendance_policies_tenant_version_unique" ON "attendance_policies" USING btree ("tenant_id","version");--> statement-breakpoint
CREATE INDEX "attendance_policies_tenant_id_idx" ON "attendance_policies" USING btree ("tenant_id");
