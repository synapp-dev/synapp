-- Mirrors apps/intradark/drizzle/0022_teams_player_teams.sql.
-- Idempotent: safe if tables/policies already exist (e.g. partial apply via MCP).
-- teams: one row per team (Faceit team schema, sans inline members).
-- player_teams: many-to-many between players(steamid64) and teams. Public-read RLS.

CREATE TABLE IF NOT EXISTS "public"."teams" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"faceit_team_id" uuid,
	"name" varchar(255) NOT NULL,
	"nickname" varchar(255),
	"avatar" text,
	"cover_image" text,
	"description" text,
	"game" varchar(32) DEFAULT 'cs2' NOT NULL,
	"team_type" varchar(32),
	"leader_steamid64" text,
	"chat_room_id" text,
	"faceit_url" text,
	"facebook" text,
	"twitter" text,
	"website" text,
	"youtube" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

DO $$
BEGIN
  ALTER TABLE "public"."teams"
    ADD CONSTRAINT "teams_leader_steamid64_fkey"
    FOREIGN KEY ("leader_steamid64") REFERENCES "public"."players"("steamid64") ON DELETE set null ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "idx_teams_faceit_team_id" ON "public"."teams" USING btree ("faceit_team_id") WHERE "faceit_team_id" IS NOT NULL;
CREATE INDEX IF NOT EXISTS "idx_teams_leader_steamid64" ON "public"."teams" USING btree ("leader_steamid64");
CREATE INDEX IF NOT EXISTS "idx_teams_name" ON "public"."teams" USING btree (LOWER("name"));
CREATE INDEX IF NOT EXISTS "idx_teams_nickname" ON "public"."teams" USING btree (LOWER("nickname"));

CREATE TABLE IF NOT EXISTS "public"."player_teams" (
	"team_id" uuid NOT NULL,
	"steamid64" text NOT NULL,
	"role" varchar(32) DEFAULT 'member' NOT NULL,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "player_teams_pkey" PRIMARY KEY("team_id","steamid64")
);

DO $$
BEGIN
  ALTER TABLE "public"."player_teams"
    ADD CONSTRAINT "player_teams_team_id_fkey"
    FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "public"."player_teams"
    ADD CONSTRAINT "player_teams_steamid64_fkey"
    FOREIGN KEY ("steamid64") REFERENCES "public"."players"("steamid64") ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS "idx_player_teams_steamid64" ON "public"."player_teams" USING btree ("steamid64");
CREATE INDEX IF NOT EXISTS "idx_player_teams_team_id" ON "public"."player_teams" USING btree ("team_id");

ALTER TABLE "public"."teams" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."player_teams" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "teams_public_read" ON "public"."teams";
CREATE POLICY "teams_public_read" ON "public"."teams" FOR SELECT USING (true);

DROP POLICY IF EXISTS "player_teams_public_read" ON "public"."player_teams";
CREATE POLICY "player_teams_public_read" ON "public"."player_teams" FOR SELECT USING (true);
