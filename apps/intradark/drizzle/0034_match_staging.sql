-- §5/§6 staging: generated team names + bot-created Discord voice channel ids,
-- plus a staging (Join-Discord) phase deadline. Applied to supabase-intradark via MCP.
ALTER TABLE matches
  ADD COLUMN IF NOT EXISTS team1_name varchar(64),
  ADD COLUMN IF NOT EXISTS team2_name varchar(64),
  ADD COLUMN IF NOT EXISTS discord_team1_channel_id text,
  ADD COLUMN IF NOT EXISTS discord_team2_channel_id text,
  ADD COLUMN IF NOT EXISTS staging_deadline timestamptz;
