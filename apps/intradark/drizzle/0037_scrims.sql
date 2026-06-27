-- Scrim finder: tiers, regions, listings, challenges, scrims, team servers, chat.
-- Ported from the legacy intradark-client scrim feature.

-- ============================================================================
-- Tiers & regions
-- ============================================================================
CREATE TABLE "public"."tiers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"rank" integer NOT NULL,
	"slug" varchar(64) NOT NULL,
	"name" varchar(64) NOT NULL,
	"color" varchar(7),
	"logo" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "tiers_rank_key" ON "public"."tiers" USING btree ("rank");
--> statement-breakpoint
CREATE UNIQUE INDEX "tiers_slug_key" ON "public"."tiers" USING btree ("slug");
--> statement-breakpoint

CREATE TABLE "public"."scrim_regions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(64) NOT NULL,
	"name" varchar(64) NOT NULL,
	"timezone" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "scrim_regions_slug_key" ON "public"."scrim_regions" USING btree ("slug");
--> statement-breakpoint

-- ============================================================================
-- teams: add tier + region
-- ============================================================================
ALTER TABLE "public"."teams" ADD COLUMN "tier_id" uuid;--> statement-breakpoint
ALTER TABLE "public"."teams" ADD COLUMN "region_id" uuid;--> statement-breakpoint
ALTER TABLE "public"."teams" ADD CONSTRAINT "teams_tier_id_fkey" FOREIGN KEY ("tier_id") REFERENCES "public"."tiers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "public"."teams" ADD CONSTRAINT "teams_region_id_fkey" FOREIGN KEY ("region_id") REFERENCES "public"."scrim_regions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint

-- ============================================================================
-- scrim_listings (a team's posted availability) + maps
-- ============================================================================
CREATE TABLE "public"."scrim_listings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"team_id" uuid NOT NULL,
	"timeslot" timestamp with time zone NOT NULL,
	"min_tier_id" uuid,
	"region_id" uuid,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "public"."scrim_listings" ADD CONSTRAINT "scrim_listings_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "public"."scrim_listings" ADD CONSTRAINT "scrim_listings_min_tier_id_fkey" FOREIGN KEY ("min_tier_id") REFERENCES "public"."tiers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "public"."scrim_listings" ADD CONSTRAINT "scrim_listings_region_id_fkey" FOREIGN KEY ("region_id") REFERENCES "public"."scrim_regions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "scrim_listings_active_timeslot_idx" ON "public"."scrim_listings" USING btree ("active", "timeslot");--> statement-breakpoint
CREATE INDEX "scrim_listings_team_id_idx" ON "public"."scrim_listings" USING btree ("team_id");--> statement-breakpoint
CREATE UNIQUE INDEX "scrim_listings_team_timeslot_active_key" ON "public"."scrim_listings" USING btree ("team_id", "timeslot") WHERE "active";--> statement-breakpoint

CREATE TABLE "public"."scrim_listing_maps" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"scrim_listing_id" uuid NOT NULL,
	"map_id" uuid NOT NULL
);
--> statement-breakpoint
ALTER TABLE "public"."scrim_listing_maps" ADD CONSTRAINT "scrim_listing_maps_listing_id_fkey" FOREIGN KEY ("scrim_listing_id") REFERENCES "public"."scrim_listings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "public"."scrim_listing_maps" ADD CONSTRAINT "scrim_listing_maps_map_id_fkey" FOREIGN KEY ("map_id") REFERENCES "public"."maps"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "scrim_listing_maps_listing_map_key" ON "public"."scrim_listing_maps" USING btree ("scrim_listing_id", "map_id");--> statement-breakpoint

-- ============================================================================
-- scrim_challenges (a team challenging a listing) + maps
-- ============================================================================
CREATE TABLE "public"."scrim_challenges" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"scrim_listing_id" uuid NOT NULL,
	"team_id" uuid NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "public"."scrim_challenges" ADD CONSTRAINT "scrim_challenges_listing_id_fkey" FOREIGN KEY ("scrim_listing_id") REFERENCES "public"."scrim_listings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "public"."scrim_challenges" ADD CONSTRAINT "scrim_challenges_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "scrim_challenges_listing_id_idx" ON "public"."scrim_challenges" USING btree ("scrim_listing_id");--> statement-breakpoint
CREATE UNIQUE INDEX "scrim_challenges_listing_team_active_key" ON "public"."scrim_challenges" USING btree ("scrim_listing_id", "team_id") WHERE "active";--> statement-breakpoint

CREATE TABLE "public"."scrim_challenge_maps" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"scrim_challenge_id" uuid NOT NULL,
	"map_id" uuid NOT NULL
);
--> statement-breakpoint
ALTER TABLE "public"."scrim_challenge_maps" ADD CONSTRAINT "scrim_challenge_maps_challenge_id_fkey" FOREIGN KEY ("scrim_challenge_id") REFERENCES "public"."scrim_challenges"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "public"."scrim_challenge_maps" ADD CONSTRAINT "scrim_challenge_maps_map_id_fkey" FOREIGN KEY ("map_id") REFERENCES "public"."maps"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "scrim_challenge_maps_challenge_map_key" ON "public"."scrim_challenge_maps" USING btree ("scrim_challenge_id", "map_id");--> statement-breakpoint

-- ============================================================================
-- scrims (the confirmed match)
-- ============================================================================
CREATE TABLE "public"."scrims" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"scrim_listing_id" uuid,
	"scrim_challenge_id" uuid,
	"home_team_id" uuid NOT NULL,
	"away_team_id" uuid NOT NULL,
	"map_id" uuid,
	"match_time" timestamp with time zone NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"scrim_cancel_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "public"."scrims" ADD CONSTRAINT "scrims_listing_id_fkey" FOREIGN KEY ("scrim_listing_id") REFERENCES "public"."scrim_listings"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "public"."scrims" ADD CONSTRAINT "scrims_challenge_id_fkey" FOREIGN KEY ("scrim_challenge_id") REFERENCES "public"."scrim_challenges"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "public"."scrims" ADD CONSTRAINT "scrims_home_team_id_fkey" FOREIGN KEY ("home_team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "public"."scrims" ADD CONSTRAINT "scrims_away_team_id_fkey" FOREIGN KEY ("away_team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "public"."scrims" ADD CONSTRAINT "scrims_map_id_fkey" FOREIGN KEY ("map_id") REFERENCES "public"."maps"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "scrims_active_match_time_idx" ON "public"."scrims" USING btree ("active", "match_time");--> statement-breakpoint
CREATE INDEX "scrims_home_team_id_idx" ON "public"."scrims" USING btree ("home_team_id");--> statement-breakpoint
CREATE INDEX "scrims_away_team_id_idx" ON "public"."scrims" USING btree ("away_team_id");--> statement-breakpoint

-- ============================================================================
-- team_servers (manual connect details, surfaced near match time)
-- ============================================================================
CREATE TABLE "public"."team_servers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"team_id" uuid NOT NULL,
	"label" varchar(120),
	"ip" text NOT NULL,
	"port" integer NOT NULL,
	"password" text,
	"status" varchar(32) DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "public"."team_servers" ADD CONSTRAINT "team_servers_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "team_servers_team_id_idx" ON "public"."team_servers" USING btree ("team_id");--> statement-breakpoint

-- ============================================================================
-- scrim_chat_messages + profile-joined view
-- ============================================================================
CREATE TABLE "public"."scrim_chat_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"scrim_id" uuid NOT NULL,
	"channel" varchar(32) DEFAULT 'global' NOT NULL,
	"user_id" uuid DEFAULT auth.uid() NOT NULL,
	"message" text NOT NULL,
	"timestamp" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "scrim_chat_messages_message_len" CHECK (char_length("message") BETWEEN 1 AND 256)
);
--> statement-breakpoint
ALTER TABLE "public"."scrim_chat_messages" ADD CONSTRAINT "scrim_chat_messages_scrim_id_fkey" FOREIGN KEY ("scrim_id") REFERENCES "public"."scrims"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "scrim_chat_messages_scrim_ts_idx" ON "public"."scrim_chat_messages" USING btree ("scrim_id", "timestamp");--> statement-breakpoint

CREATE VIEW "public"."scrim_messages_with_profiles"
WITH (security_invoker = on) AS
SELECT
	m.id,
	m.scrim_id,
	m.channel,
	m.user_id,
	m.message,
	m.timestamp,
	COALESCE(up.display_name, up.username, sp.personaname, 'Player') AS alias,
	sp.avatarfull AS steam_avatar
FROM "public"."scrim_chat_messages" m
LEFT JOIN "public"."user_profiles" up ON up.user_id = m.user_id
LEFT JOIN "public"."steam_profiles" sp ON sp.steamid64 = up.steam_profile_id;
--> statement-breakpoint

-- ============================================================================
-- Helper: is the current auth user an active member of a team?
-- ============================================================================
CREATE OR REPLACE FUNCTION "public"."is_team_member"(p_team_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
	SELECT EXISTS (
		SELECT 1
		FROM player_teams pt
		JOIN user_profiles up ON up.steam_profile_id = pt.steamid64
		WHERE pt.team_id = p_team_id
		  AND up.user_id = auth.uid()
	);
$$;
--> statement-breakpoint

-- ============================================================================
-- Atomic writes (SECURITY DEFINER; authorize via is_team_member)
-- ============================================================================
CREATE OR REPLACE FUNCTION "public"."insert_scrim_and_maps"(
	team_id uuid,
	tier_id uuid,
	timeslot timestamp with time zone,
	region_id uuid,
	map_ids uuid[]
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
	new_listing_id uuid;
	m uuid;
BEGIN
	IF NOT public.is_team_member(team_id) THEN
		RAISE EXCEPTION 'Not authorized for this team' USING ERRCODE = '42501';
	END IF;

	INSERT INTO scrim_listings (team_id, min_tier_id, timeslot, region_id)
	VALUES (team_id, tier_id, timeslot, region_id)
	RETURNING id INTO new_listing_id;

	FOREACH m IN ARRAY map_ids LOOP
		INSERT INTO scrim_listing_maps (scrim_listing_id, map_id)
		VALUES (new_listing_id, m)
		ON CONFLICT DO NOTHING;
	END LOOP;

	RETURN new_listing_id;
END;
$$;
--> statement-breakpoint

CREATE OR REPLACE FUNCTION "public"."insert_challenge_and_maps"(
	scrim_listing_id uuid,
	team_id uuid,
	map_ids uuid[]
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
	new_challenge_id uuid;
	m uuid;
BEGIN
	IF NOT public.is_team_member(team_id) THEN
		RAISE EXCEPTION 'Not authorized for this team' USING ERRCODE = '42501';
	END IF;

	INSERT INTO scrim_challenges (scrim_listing_id, team_id)
	VALUES (scrim_listing_id, team_id)
	RETURNING id INTO new_challenge_id;

	FOREACH m IN ARRAY map_ids LOOP
		INSERT INTO scrim_challenge_maps (scrim_challenge_id, map_id)
		VALUES (new_challenge_id, m)
		ON CONFLICT DO NOTHING;
	END LOOP;

	RETURN new_challenge_id;
END;
$$;
--> statement-breakpoint

CREATE OR REPLACE FUNCTION "public"."accept_challenge"(
	challenge_id uuid,
	map_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
	v_listing_id uuid;
	v_listing_team uuid;
	v_challenger_team uuid;
	v_timeslot timestamp with time zone;
	new_scrim_id uuid;
BEGIN
	SELECT c.scrim_listing_id, c.team_id, l.team_id, l.timeslot
	INTO v_listing_id, v_challenger_team, v_listing_team, v_timeslot
	FROM scrim_challenges c
	JOIN scrim_listings l ON l.id = c.scrim_listing_id
	WHERE c.id = challenge_id;

	IF v_listing_id IS NULL THEN
		RAISE EXCEPTION 'Challenge not found' USING ERRCODE = 'P0002';
	END IF;

	IF NOT public.is_team_member(v_listing_team) THEN
		RAISE EXCEPTION 'Only the listing team can accept a challenge' USING ERRCODE = '42501';
	END IF;

	INSERT INTO scrims (
		scrim_listing_id, scrim_challenge_id, home_team_id, away_team_id, map_id, match_time
	)
	VALUES (
		v_listing_id, challenge_id, v_listing_team, v_challenger_team, map_id, v_timeslot
	)
	RETURNING id INTO new_scrim_id;

	-- Close the listing and all its challenges.
	UPDATE scrim_listings SET active = false, updated_at = now() WHERE id = v_listing_id;
	UPDATE scrim_challenges SET active = false, updated_at = now() WHERE scrim_listing_id = v_listing_id;

	RETURN new_scrim_id;
END;
$$;
--> statement-breakpoint

-- ============================================================================
-- Row level security
-- ============================================================================
ALTER TABLE "public"."tiers" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "public"."scrim_regions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "public"."scrim_listings" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "public"."scrim_listing_maps" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "public"."scrim_challenges" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "public"."scrim_challenge_maps" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "public"."scrims" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "public"."team_servers" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "public"."scrim_chat_messages" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint

-- Public catalog reads
CREATE POLICY "tiers_read" ON "public"."tiers" FOR SELECT USING (true);--> statement-breakpoint
CREATE POLICY "scrim_regions_read" ON "public"."scrim_regions" FOR SELECT USING (true);--> statement-breakpoint

-- Listings: anyone authenticated can browse; team members write.
CREATE POLICY "scrim_listings_read" ON "public"."scrim_listings" FOR SELECT TO authenticated USING (true);--> statement-breakpoint
CREATE POLICY "scrim_listings_insert" ON "public"."scrim_listings" FOR INSERT TO authenticated WITH CHECK (public.is_team_member(team_id));--> statement-breakpoint
CREATE POLICY "scrim_listings_update" ON "public"."scrim_listings" FOR UPDATE TO authenticated USING (public.is_team_member(team_id)) WITH CHECK (public.is_team_member(team_id));--> statement-breakpoint

CREATE POLICY "scrim_listing_maps_read" ON "public"."scrim_listing_maps" FOR SELECT TO authenticated USING (true);--> statement-breakpoint
CREATE POLICY "scrim_listing_maps_write" ON "public"."scrim_listing_maps" FOR ALL TO authenticated
	USING (public.is_team_member((SELECT team_id FROM scrim_listings WHERE id = scrim_listing_id)))
	WITH CHECK (public.is_team_member((SELECT team_id FROM scrim_listings WHERE id = scrim_listing_id)));--> statement-breakpoint

-- Challenges: anyone authenticated can read; challenger team members write.
CREATE POLICY "scrim_challenges_read" ON "public"."scrim_challenges" FOR SELECT TO authenticated USING (true);--> statement-breakpoint
CREATE POLICY "scrim_challenges_insert" ON "public"."scrim_challenges" FOR INSERT TO authenticated WITH CHECK (public.is_team_member(team_id));--> statement-breakpoint
CREATE POLICY "scrim_challenges_update" ON "public"."scrim_challenges" FOR UPDATE TO authenticated USING (public.is_team_member(team_id)) WITH CHECK (public.is_team_member(team_id));--> statement-breakpoint

CREATE POLICY "scrim_challenge_maps_read" ON "public"."scrim_challenge_maps" FOR SELECT TO authenticated USING (true);--> statement-breakpoint
CREATE POLICY "scrim_challenge_maps_write" ON "public"."scrim_challenge_maps" FOR ALL TO authenticated
	USING (public.is_team_member((SELECT team_id FROM scrim_challenges WHERE id = scrim_challenge_id)))
	WITH CHECK (public.is_team_member((SELECT team_id FROM scrim_challenges WHERE id = scrim_challenge_id)));--> statement-breakpoint

-- Scrims: anyone authenticated can read; participating team members can update (cancel).
CREATE POLICY "scrims_read" ON "public"."scrims" FOR SELECT TO authenticated USING (true);--> statement-breakpoint
CREATE POLICY "scrims_update" ON "public"."scrims" FOR UPDATE TO authenticated
	USING (public.is_team_member(home_team_id) OR public.is_team_member(away_team_id))
	WITH CHECK (public.is_team_member(home_team_id) OR public.is_team_member(away_team_id));--> statement-breakpoint

-- Team servers: only members of the owning team (passwords are sensitive).
CREATE POLICY "team_servers_member_all" ON "public"."team_servers" FOR ALL TO authenticated
	USING (public.is_team_member(team_id))
	WITH CHECK (public.is_team_member(team_id));--> statement-breakpoint

-- Chat: only members of either participating team can read/post.
CREATE POLICY "scrim_chat_read" ON "public"."scrim_chat_messages" FOR SELECT TO authenticated
	USING (EXISTS (
		SELECT 1 FROM scrims s
		WHERE s.id = scrim_id
		  AND (public.is_team_member(s.home_team_id) OR public.is_team_member(s.away_team_id))
	));--> statement-breakpoint
CREATE POLICY "scrim_chat_insert" ON "public"."scrim_chat_messages" FOR INSERT TO authenticated
	WITH CHECK (
		user_id = auth.uid()
		AND EXISTS (
			SELECT 1 FROM scrims s
			WHERE s.id = scrim_id
			  AND (public.is_team_member(s.home_team_id) OR public.is_team_member(s.away_team_id))
		)
	);--> statement-breakpoint

-- ============================================================================
-- Realtime
-- ============================================================================
ALTER PUBLICATION supabase_realtime ADD TABLE "public"."scrim_listings";--> statement-breakpoint
ALTER PUBLICATION supabase_realtime ADD TABLE "public"."scrim_challenges";--> statement-breakpoint
ALTER PUBLICATION supabase_realtime ADD TABLE "public"."scrims";--> statement-breakpoint
ALTER PUBLICATION supabase_realtime ADD TABLE "public"."scrim_chat_messages";--> statement-breakpoint

-- ============================================================================
-- Seed: tiers, regions, backfill teams
-- ============================================================================
INSERT INTO "public"."tiers" ("rank", "slug", "name", "color") VALUES
	(1, 'tier-1', 'Tier 1', 'eab308'),
	(2, 'tier-2', 'Tier 2', 'a855f7'),
	(3, 'tier-3', 'Tier 3', '38bdf8')
ON CONFLICT (slug) DO NOTHING;--> statement-breakpoint

INSERT INTO "public"."scrim_regions" ("slug", "name", "timezone") VALUES
	('oceania', 'Oceania', 'Australia/Sydney'),
	('europe', 'Europe', 'Europe/London'),
	('north-america', 'North America', 'America/New_York')
ON CONFLICT (slug) DO NOTHING;--> statement-breakpoint

UPDATE "public"."teams"
SET tier_id = (SELECT id FROM tiers WHERE slug = 'tier-2'),
    region_id = (SELECT id FROM scrim_regions WHERE slug = 'oceania')
WHERE tier_id IS NULL OR region_id IS NULL;
--> statement-breakpoint

-- ============================================================================
-- Lock SECURITY DEFINER functions to signed-in users only
-- ============================================================================
REVOKE EXECUTE ON FUNCTION public.is_team_member(uuid) FROM anon, public;--> statement-breakpoint
REVOKE EXECUTE ON FUNCTION public.insert_scrim_and_maps(uuid, uuid, timestamp with time zone, uuid, uuid[]) FROM anon, public;--> statement-breakpoint
REVOKE EXECUTE ON FUNCTION public.insert_challenge_and_maps(uuid, uuid, uuid[]) FROM anon, public;--> statement-breakpoint
REVOKE EXECUTE ON FUNCTION public.accept_challenge(uuid, uuid) FROM anon, public;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.is_team_member(uuid) TO authenticated;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.insert_scrim_and_maps(uuid, uuid, timestamp with time zone, uuid, uuid[]) TO authenticated;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.insert_challenge_and_maps(uuid, uuid, uuid[]) TO authenticated;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.accept_challenge(uuid, uuid) TO authenticated;
