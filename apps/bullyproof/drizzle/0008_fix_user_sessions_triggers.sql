-- Migration: Fix user_sessions triggers to handle errors gracefully
-- This prevents trigger failures from blocking Supabase session updates

-- ============================================================================
-- 1. Replace INSERT trigger function with error handling
-- ============================================================================
CREATE OR REPLACE FUNCTION sync_user_sessions_insert()
RETURNS TRIGGER AS $$
BEGIN
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
	EXCEPTION WHEN OTHERS THEN
		-- Log error but don't fail the transaction
		-- This prevents blocking Supabase session operations
		RAISE WARNING 'Error syncing user_sessions INSERT for session %: %', NEW.id, SQLERRM;
	END;
	
	RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 2. Replace UPDATE trigger function with error handling and upsert logic
-- ============================================================================
CREATE OR REPLACE FUNCTION sync_user_sessions_update()
RETURNS TRIGGER AS $$
BEGIN
	BEGIN
		-- Try to update first
		UPDATE user_sessions
		SET
			user_id = NEW.user_id,
			created_at = NEW.created_at,
			updated_at = NEW.updated_at,
			refreshed_at = NEW.refreshed_at,
			user_agent = NEW.user_agent,
			oauth_client_id = NEW.oauth_client_id
		WHERE id = NEW.id;
		
		-- If no row was updated, insert it (handles race conditions)
		IF NOT FOUND THEN
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
		END IF;
	EXCEPTION WHEN OTHERS THEN
		-- Log error but don't fail the transaction
		-- This prevents blocking Supabase session operations
		RAISE WARNING 'Error syncing user_sessions UPDATE for session %: %', NEW.id, SQLERRM;
	END;
	
	RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 3. Replace DELETE trigger function with error handling
-- ============================================================================
CREATE OR REPLACE FUNCTION sync_user_sessions_delete()
RETURNS TRIGGER AS $$
BEGIN
	BEGIN
		DELETE FROM user_sessions WHERE id = OLD.id;
	EXCEPTION WHEN OTHERS THEN
		-- Log error but don't fail the transaction
		-- This prevents blocking Supabase session operations
		RAISE WARNING 'Error syncing user_sessions DELETE for session %: %', OLD.id, SQLERRM;
	END;
	
	RETURN OLD;
END;
$$ LANGUAGE plpgsql;
