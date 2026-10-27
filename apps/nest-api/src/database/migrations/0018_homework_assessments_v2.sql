-- Idempotent: this migration was missing from the journal, so some databases applied it by hand.
DO $$ BEGIN
	CREATE TYPE "assignment_target_mode" AS ENUM ('whole_class', 'selected_students');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
ALTER TABLE "homework_assignments"
	ADD COLUMN IF NOT EXISTS "assign_mode" "assignment_target_mode" NOT NULL DEFAULT 'whole_class',
	ADD COLUMN IF NOT EXISTS "estimated_minutes" integer,
	ADD COLUMN IF NOT EXISTS "materials" text;
--> statement-breakpoint
ALTER TABLE "assessments"
	ADD COLUMN IF NOT EXISTS "assign_mode" "assignment_target_mode" NOT NULL DEFAULT 'whole_class',
	ADD COLUMN IF NOT EXISTS "starts_at" timestamp with time zone,
	ADD COLUMN IF NOT EXISTS "duration_minutes" integer,
	ADD COLUMN IF NOT EXISTS "room" varchar(120),
	ADD COLUMN IF NOT EXISTS "instructions" text;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "homework_recipients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
	"homework_id" uuid NOT NULL REFERENCES "homework_assignments"("id") ON DELETE CASCADE,
	"student_id" uuid NOT NULL REFERENCES "students"("id") ON DELETE CASCADE,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "homework_recipients_homework_student_unique" ON "homework_recipients" ("homework_id", "student_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "homework_recipients_tenant_id_idx" ON "homework_recipients" ("tenant_id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "assessment_recipients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
	"assessment_id" uuid NOT NULL REFERENCES "assessments"("id") ON DELETE CASCADE,
	"student_id" uuid NOT NULL REFERENCES "students"("id") ON DELETE CASCADE,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "assessment_recipients_assessment_student_unique" ON "assessment_recipients" ("assessment_id", "student_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "assessment_recipients_tenant_id_idx" ON "assessment_recipients" ("tenant_id");
--> statement-breakpoint
INSERT INTO "role_permissions" ("role_id", "permission_id")
SELECT r.id, p.id
FROM "roles" r
CROSS JOIN "permissions" p
WHERE r.tenant_id IS NULL
	AND r.code IN ('parent', 'student')
	AND p.code IN ('homework.read', 'assessments.read')
ON CONFLICT DO NOTHING;
--> statement-breakpoint
INSERT INTO "navigation_items" ("key", "label", "href", "icon_key", "section_heading", "required_permission", "visible_to_roles", "sort_order", "is_enabled")
VALUES
	('test-planner', 'Test planner', '/admin/test-planner', 'calendar', 'Main Menu', 'assessments.read', ARRAY['teacher', 'owner', 'principal', 'admin'], 48, true)
ON CONFLICT ("surface", "key") DO UPDATE
SET
	"label" = EXCLUDED."label",
	"href" = EXCLUDED."href",
	"icon_key" = EXCLUDED."icon_key",
	"required_permission" = EXCLUDED."required_permission",
	"visible_to_roles" = EXCLUDED."visible_to_roles",
	"sort_order" = EXCLUDED."sort_order",
	"is_enabled" = EXCLUDED."is_enabled";
--> statement-breakpoint
UPDATE "navigation_items"
SET "icon_key" = 'file'
WHERE "key" = 'homework' AND "surface" = 'admin';
