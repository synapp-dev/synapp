-- Migration: Create user_sessions table synced with auth.sessions
-- This table mirrors auth.sessions but excludes sensitive columns and is in the public schema
-- for easier querying via Drizzle

-- ============================================================================
-- 1. Create user_sessions table
-- ============================================================================
CREATE TABLE user_sessions (
	id uuid PRIMARY KEY NOT NULL,
	user_id uuid NOT NULL,
	created_at timestamp with time zone,
	updated_at timestamp with time zone,
	refreshed_at timestamp without time zone,
	user_agent text,
	oauth_client_id uuid,
	CONSTRAINT user_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
	CONSTRAINT user_sessions_oauth_client_id_fkey FOREIGN KEY (oauth_client_id) REFERENCES auth.oauth_clients(id) ON DELETE CASCADE
);

-- ============================================================================
-- 2. Create indexes for performance
-- ============================================================================
CREATE INDEX IF NOT EXISTS user_sessions_user_id_idx ON user_sessions USING btree (user_id);
CREATE INDEX IF NOT EXISTS user_sessions_user_id_created_at_idx ON user_sessions USING btree (user_id, created_at);
CREATE INDEX IF NOT EXISTS user_sessions_refreshed_at_idx ON user_sessions USING btree (refreshed_at DESC NULLS LAST);

-- ============================================================================
-- 3. Create function to sync INSERT from auth.sessions
-- ============================================================================
CREATE OR REPLACE FUNCTION sync_user_sessions_insert()
RETURNS TRIGGER AS $$
BEGIN
	INSERT INTO user_sessions (
		id,
		user_id,
		created_at,
		updated_at,
		refreshed_at,
		user_agent,
		oauth_client_id
	)
	VALUES (
		NEW.id,
		NEW.user_id,
		NEW.created_at,
		NEW.updated_at,
		NEW.refreshed_at,
		NEW.user_agent,
		NEW.oauth_client_id
	)
	ON CONFLICT (id) DO UPDATE SET
		user_id = EXCLUDED.user_id,
		created_at = EXCLUDED.created_at,
		updated_at = EXCLUDED.updated_at,
		refreshed_at = EXCLUDED.refreshed_at,
		user_agent = EXCLUDED.user_agent,
		oauth_client_id = EXCLUDED.oauth_client_id;
	
	RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 4. Create function to sync UPDATE from auth.sessions
-- ============================================================================
CREATE OR REPLACE FUNCTION sync_user_sessions_update()
RETURNS TRIGGER AS $$
BEGIN
	UPDATE user_sessions
	SET
		user_id = NEW.user_id,
		created_at = NEW.created_at,
		updated_at = NEW.updated_at,
		refreshed_at = NEW.refreshed_at,
		user_agent = NEW.user_agent,
		oauth_client_id = NEW.oauth_client_id
	WHERE id = NEW.id;
	
	RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 5. Create function to sync DELETE from auth.sessions
-- ============================================================================
CREATE OR REPLACE FUNCTION sync_user_sessions_delete()
RETURNS TRIGGER AS $$
BEGIN
	DELETE FROM user_sessions WHERE id = OLD.id;
	RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 6. Create triggers on auth.sessions
-- ============================================================================
CREATE TRIGGER user_sessions_insert_trigger
	AFTER INSERT ON auth.sessions
	FOR EACH ROW
	EXECUTE FUNCTION sync_user_sessions_insert();

CREATE TRIGGER user_sessions_update_trigger
	AFTER UPDATE ON auth.sessions
	FOR EACH ROW
	EXECUTE FUNCTION sync_user_sessions_update();

CREATE TRIGGER user_sessions_delete_trigger
	AFTER DELETE ON auth.sessions
	FOR EACH ROW
	EXECUTE FUNCTION sync_user_sessions_delete();

-- ============================================================================
-- 7. Initial sync: Copy existing data from auth.sessions
-- ============================================================================
INSERT INTO user_sessions (
	id,
	user_id,
	created_at,
	updated_at,
	refreshed_at,
	user_agent,
	oauth_client_id
)
SELECT 
	id,
	user_id,
	created_at,
	updated_at,
	refreshed_at,
	user_agent,
	oauth_client_id
FROM auth.sessions
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 8. Add comments
-- ============================================================================
COMMENT ON TABLE user_sessions IS 'Mirror of auth.sessions table in public schema for easier querying. Excludes sensitive columns (factor_id, aal, not_after, ip, tag, refresh_token_hmac_key, refresh_token_counter, scopes). Automatically synced via triggers.';
COMMENT ON COLUMN user_sessions.id IS 'Session ID matching auth.sessions.id';
COMMENT ON COLUMN user_sessions.user_id IS 'User ID from auth.users';
COMMENT ON COLUMN user_sessions.refreshed_at IS 'Last time the session was refreshed';
