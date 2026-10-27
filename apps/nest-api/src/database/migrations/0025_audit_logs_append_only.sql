-- Audit history is append-only. Rows can be added, never edited or removed, with two exceptions
-- that the schema itself needs: the actor reference may be cleared when its membership is deleted
-- (ON DELETE SET NULL), and rows may go when their school is deleted (ON DELETE CASCADE).
CREATE OR REPLACE FUNCTION audit_logs_guard() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
	IF TG_OP = 'UPDATE' THEN
		IF NEW.actor_membership_id IS NULL
			AND OLD.actor_membership_id IS NOT NULL
			AND (to_jsonb(NEW) - 'actor_membership_id') = (to_jsonb(OLD) - 'actor_membership_id') THEN
			RETURN NEW;
		END IF;
		RAISE EXCEPTION 'audit_logs is append-only' USING ERRCODE = 'insufficient_privilege';
	END IF;

	-- DELETE: allowed only as part of deleting the school (its row is already gone).
	IF EXISTS (SELECT 1 FROM tenants WHERE id = OLD.tenant_id) THEN
		RAISE EXCEPTION 'audit_logs is append-only' USING ERRCODE = 'insufficient_privilege';
	END IF;
	RETURN OLD;
END;
$$;--> statement-breakpoint
DROP TRIGGER IF EXISTS audit_logs_append_only ON audit_logs;--> statement-breakpoint
CREATE TRIGGER audit_logs_append_only
	BEFORE UPDATE OR DELETE ON audit_logs
	FOR EACH ROW EXECUTE FUNCTION audit_logs_guard();
