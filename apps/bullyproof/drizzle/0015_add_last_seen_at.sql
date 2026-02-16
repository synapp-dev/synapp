-- Add last_seen_at column to user_profile for tracking last activity
ALTER TABLE user_profile
ADD COLUMN IF NOT EXISTS last_seen_at timestamptz;

-- Index for efficient queries (e.g. sorting users by last seen)
CREATE INDEX IF NOT EXISTS idx_user_profile_last_seen_at
ON user_profile (last_seen_at DESC NULLS LAST);

COMMENT ON COLUMN user_profile.last_seen_at IS 'Last time the user was active on the site. Updated on authenticated requests, throttled to every 5 minutes.';

-- RPC to update last_seen_at for the current user (throttled to 5 min)
CREATE OR REPLACE FUNCTION update_my_last_seen()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE user_profile
  SET last_seen_at = NOW()
  WHERE id = auth.uid()
    AND (last_seen_at IS NULL OR last_seen_at < NOW() - INTERVAL '5 minutes');
END;
$$;

COMMENT ON FUNCTION update_my_last_seen() IS 'Updates last_seen_at for the authenticated user. Throttled to at most once per 5 minutes.';
