-- Outbox reliability: leases for claimed events, retries with backoff, and a dead-letter state.
ALTER TYPE "public"."outbox_event_status" ADD VALUE IF NOT EXISTS 'dead';--> statement-breakpoint
ALTER TABLE "outbox_events"
	ADD COLUMN IF NOT EXISTS "attempts" integer NOT NULL DEFAULT 0,
	ADD COLUMN IF NOT EXISTS "locked_until" timestamp with time zone,
	ADD COLUMN IF NOT EXISTS "next_attempt_at" timestamp with time zone NOT NULL DEFAULT now(),
	ADD COLUMN IF NOT EXISTS "last_error" text;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "outbox_events_status_next_attempt_idx" ON "outbox_events" ("status", "next_attempt_at");--> statement-breakpoint
-- Events stranded in 'processing' by a crashed worker are released for another attempt.
UPDATE "outbox_events" SET "status" = 'pending', "next_attempt_at" = now() WHERE "status" = 'processing';
