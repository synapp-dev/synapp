-- Tournament / Competition module — foundation (P1).
-- See docs/tournaments/plan.md. One unified competition system that brackets,
-- leagues, the open ladder, and the existing PUG queue all flow through.
--
-- format / entry_type / recurrence / match_source are text + CHECK (extensible
-- via the app-side driver registry), never PG enums. format_config /
-- eligibility_rules / match_defaults / advancement_rule are JSONB.
--
-- RLS posture: the "shop window" (competitions, seasons, stages, entrants,
-- members, fixtures, standings, prizes, challenges, news links) is public-read;
-- writes flow through service-role server seams (organizer ops are admin-gated
-- in app code, like the existing /admin surfaces). audit log + disputes are
-- service-role only (no read policy), mirroring steam_dm_jobs (0038).

-- ============================================================================
-- competitions — the persistent series/brand (config + identity).
-- ============================================================================
CREATE TABLE "public"."competitions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(160) NOT NULL,
	"name" varchar(255) NOT NULL,
	"game" varchar(32) DEFAULT 'cs2' NOT NULL,
	"game_mode" varchar(16) NOT NULL,                 -- '1v1' | '2v2' | '5v5' ...
	"format" varchar(32) NOT NULL,                    -- driver slug (validated app-side)
	"entry_type" varchar(16) DEFAULT 'open' NOT NULL,
	"recurrence" varchar(16) DEFAULT 'one_shot' NOT NULL,
	"description" text,
	"branding" jsonb DEFAULT '{}'::jsonb NOT NULL,    -- colors, logos, sponsors
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "competitions_entry_type_chk" CHECK ("entry_type" IN ('open','approval','invite_only')),
	CONSTRAINT "competitions_recurrence_chk" CHECK ("recurrence" IN ('one_shot','recurring'))
);
--> statement-breakpoint
ALTER TABLE "public"."competitions" ADD CONSTRAINT "competitions_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "competitions_slug_key" ON "public"."competitions" USING btree (LOWER("slug"));--> statement-breakpoint
CREATE INDEX "competitions_format_idx" ON "public"."competitions" USING btree ("format");--> statement-breakpoint

-- ============================================================================
-- competition_seasons — time-boxed instance; owns prizepool, registration
-- window, roster-lock rules, eligibility. Resettable unit.
-- ============================================================================
CREATE TABLE "public"."competition_seasons" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"competition_id" uuid NOT NULL,
	"season_number" integer DEFAULT 1 NOT NULL,
	"name" varchar(255),
	"status" varchar(24) DEFAULT 'draft' NOT NULL,
	"registration_opens_at" timestamp with time zone,
	"registration_closes_at" timestamp with time zone,
	"roster_lock_at" timestamp with time zone,
	"start_at" timestamp with time zone,
	"end_at" timestamp with time zone,
	"max_entrants" integer,                            -- null = unlimited
	"min_roster" integer DEFAULT 1 NOT NULL,
	"max_roster" integer DEFAULT 1 NOT NULL,
	"check_in_required" boolean DEFAULT false NOT NULL,
	"check_in_opens_at" timestamp with time zone,
	"eligibility_rules" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"map_pool" jsonb DEFAULT '[]'::jsonb NOT NULL,     -- map ids
	"match_defaults" jsonb DEFAULT '{}'::jsonb NOT NULL, -- best_of, veto, matchzy rules
	"entry_fee" numeric,                               -- schema-only for now
	"funding_source" varchar(16) DEFAULT 'internal' NOT NULL,
	"prize_pool" numeric,
	"prize_currency" varchar(8) DEFAULT 'AUD',
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "competition_seasons_status_chk" CHECK ("status" IN ('draft','announced','registration_open','registration_closed','seeding','live','completed','archived')),
	CONSTRAINT "competition_seasons_funding_chk" CHECK ("funding_source" IN ('internal','sponsor','entry_fees'))
);
--> statement-breakpoint
ALTER TABLE "public"."competition_seasons" ADD CONSTRAINT "competition_seasons_competition_id_fkey" FOREIGN KEY ("competition_id") REFERENCES "public"."competitions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "competition_seasons_number_key" ON "public"."competition_seasons" USING btree ("competition_id","season_number");--> statement-breakpoint
CREATE INDEX "competition_seasons_status_idx" ON "public"."competition_seasons" USING btree ("status");--> statement-breakpoint

-- ============================================================================
-- competition_stages — ordered phases; each runs its OWN format driver and owns
-- standings. Simple event = one stage. Composite = groups -> playoffs.
-- ============================================================================
CREATE TABLE "public"."competition_stages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"season_id" uuid NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"name" varchar(120) NOT NULL,
	"format" varchar(32) NOT NULL,                    -- driver slug for THIS stage
	"format_config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"advancement_rule" jsonb DEFAULT '{}'::jsonb NOT NULL, -- e.g. { "topN": 8 }
	"status" varchar(16) DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "competition_stages_status_chk" CHECK ("status" IN ('pending','active','completed'))
);
--> statement-breakpoint
ALTER TABLE "public"."competition_stages" ADD CONSTRAINT "competition_stages_season_id_fkey" FOREIGN KEY ("season_id") REFERENCES "public"."competition_seasons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "competition_stages_order_key" ON "public"."competition_stages" USING btree ("season_id","sort_order");--> statement-breakpoint

-- ============================================================================
-- competition_entrants — the universal competitor (1..N members). Optional
-- team_id for provenance/branding. 1v1 = entrant of one; crew = team_id null.
-- ============================================================================
CREATE TABLE "public"."competition_entrants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"season_id" uuid NOT NULL,
	"team_id" uuid,
	"display_name" varchar(255) NOT NULL,
	"avatar" text,
	"seed" integer,
	"ladder_rank" integer,                             -- positional ladder only
	"status" varchar(16) DEFAULT 'registered' NOT NULL,
	"locked_at" timestamp with time zone,
	"entry_payment_status" varchar(16),               -- schema-only
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "competition_entrants_status_chk" CHECK ("status" IN ('registered','approved','checked_in','active','eliminated','dq','withdrawn'))
);
--> statement-breakpoint
ALTER TABLE "public"."competition_entrants" ADD CONSTRAINT "competition_entrants_season_id_fkey" FOREIGN KEY ("season_id") REFERENCES "public"."competition_seasons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "public"."competition_entrants" ADD CONSTRAINT "competition_entrants_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "public"."competition_entrants" ADD CONSTRAINT "competition_entrants_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "competition_entrants_season_idx" ON "public"."competition_entrants" USING btree ("season_id");--> statement-breakpoint
CREATE UNIQUE INDEX "competition_entrants_ladder_rank_key" ON "public"."competition_entrants" USING btree ("season_id","ladder_rank") WHERE "ladder_rank" IS NOT NULL;--> statement-breakpoint

-- ============================================================================
-- competition_entrant_members — the roster snapshot. season_id denormalized so
-- the one-player-one-entrant-per-season rule is enforceable (and relaxable for
-- ladders via unique_enforced).
-- ============================================================================
CREATE TABLE "public"."competition_entrant_members" (
	"entrant_id" uuid NOT NULL,
	"steamid64" text NOT NULL,
	"season_id" uuid NOT NULL,
	"role" varchar(16) DEFAULT 'member' NOT NULL,
	"is_captain" boolean DEFAULT false NOT NULL,
	"unique_enforced" boolean DEFAULT true NOT NULL,  -- false for ladder crews
	"added_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "competition_entrant_members_pkey" PRIMARY KEY ("entrant_id","steamid64")
);
--> statement-breakpoint
ALTER TABLE "public"."competition_entrant_members" ADD CONSTRAINT "competition_entrant_members_entrant_id_fkey" FOREIGN KEY ("entrant_id") REFERENCES "public"."competition_entrants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "public"."competition_entrant_members" ADD CONSTRAINT "competition_entrant_members_steamid64_fkey" FOREIGN KEY ("steamid64") REFERENCES "public"."players"("steamid64") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "public"."competition_entrant_members" ADD CONSTRAINT "competition_entrant_members_season_id_fkey" FOREIGN KEY ("season_id") REFERENCES "public"."competition_seasons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
-- one player per entrant per season (league/bracket); ladders set unique_enforced=false
CREATE UNIQUE INDEX "competition_entrant_members_one_per_season" ON "public"."competition_entrant_members" USING btree ("season_id","steamid64") WHERE "unique_enforced";--> statement-breakpoint
CREATE INDEX "competition_entrant_members_steamid_idx" ON "public"."competition_entrant_members" USING btree ("steamid64");--> statement-breakpoint

-- ============================================================================
-- competition_fixtures — scheduled / bracket-positioned matchup. May not have a
-- match row yet. next_fixture_id wires bracket advancement.
-- ============================================================================
CREATE TABLE "public"."competition_fixtures" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"stage_id" uuid NOT NULL,
	"round" integer,
	"bracket_slot" varchar(64),
	"home_entrant_id" uuid,
	"away_entrant_id" uuid,
	"best_of" integer,
	"scheduled_at" timestamp with time zone,
	"match_id" uuid,
	"next_fixture_id" uuid,
	"next_slot" varchar(8),                            -- 'home' | 'away' into next_fixture
	"status" varchar(16) DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "competition_fixtures_status_chk" CHECK ("status" IN ('pending','scheduled','live','completed','forfeit','bye','cancelled'))
);
--> statement-breakpoint
ALTER TABLE "public"."competition_fixtures" ADD CONSTRAINT "competition_fixtures_stage_id_fkey" FOREIGN KEY ("stage_id") REFERENCES "public"."competition_stages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "public"."competition_fixtures" ADD CONSTRAINT "competition_fixtures_home_entrant_id_fkey" FOREIGN KEY ("home_entrant_id") REFERENCES "public"."competition_entrants"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "public"."competition_fixtures" ADD CONSTRAINT "competition_fixtures_away_entrant_id_fkey" FOREIGN KEY ("away_entrant_id") REFERENCES "public"."competition_entrants"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "public"."competition_fixtures" ADD CONSTRAINT "competition_fixtures_next_fixture_id_fkey" FOREIGN KEY ("next_fixture_id") REFERENCES "public"."competition_fixtures"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "competition_fixtures_stage_idx" ON "public"."competition_fixtures" USING btree ("stage_id");--> statement-breakpoint
CREATE INDEX "competition_fixtures_scheduled_idx" ON "public"."competition_fixtures" USING btree ("scheduled_at");--> statement-breakpoint

-- ============================================================================
-- competition_standings — stored, recomputed by the driver. Either entrant_id
-- (pre-formed) or steamid64 (queue seasons rank players).
-- ============================================================================
CREATE TABLE "public"."competition_standings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"stage_id" uuid NOT NULL,
	"entrant_id" uuid,
	"steamid64" text,
	"rank" integer,
	"points" numeric DEFAULT 0 NOT NULL,              -- league points / steal points
	"wins" integer DEFAULT 0 NOT NULL,
	"losses" integer DEFAULT 0 NOT NULL,
	"draws" integer DEFAULT 0 NOT NULL,
	"rounds_for" integer DEFAULT 0 NOT NULL,
	"rounds_against" integer DEFAULT 0 NOT NULL,
	"matches_played" integer DEFAULT 0 NOT NULL,
	"tiebreak" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"final_placement" integer,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "public"."competition_standings" ADD CONSTRAINT "competition_standings_stage_id_fkey" FOREIGN KEY ("stage_id") REFERENCES "public"."competition_stages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "public"."competition_standings" ADD CONSTRAINT "competition_standings_entrant_id_fkey" FOREIGN KEY ("entrant_id") REFERENCES "public"."competition_entrants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "public"."competition_standings" ADD CONSTRAINT "competition_standings_steamid64_fkey" FOREIGN KEY ("steamid64") REFERENCES "public"."players"("steamid64") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "competition_standings_stage_entrant_key" ON "public"."competition_standings" USING btree ("stage_id","entrant_id") WHERE "entrant_id" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "competition_standings_stage_steamid_key" ON "public"."competition_standings" USING btree ("stage_id","steamid64") WHERE "steamid64" IS NOT NULL;--> statement-breakpoint

-- ============================================================================
-- competition_challenges — the ladder challenge (scrim-challenge analog + a
-- season). Direct challenger -> challenged; mandatory accept; ±range gated in app.
-- ============================================================================
CREATE TABLE "public"."competition_challenges" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"stage_id" uuid NOT NULL,
	"challenger_entrant_id" uuid NOT NULL,
	"challenged_entrant_id" uuid NOT NULL,
	"challenger_rank" integer,
	"challenged_rank" integer,
	"status" varchar(16) DEFAULT 'pending' NOT NULL,
	"match_id" uuid,
	"proposed_at" timestamp with time zone,
	"expires_at" timestamp with time zone,
	"resolved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "competition_challenges_status_chk" CHECK ("status" IN ('pending','accepted','declined','expired','forfeit','completed','cancelled'))
);
--> statement-breakpoint
ALTER TABLE "public"."competition_challenges" ADD CONSTRAINT "competition_challenges_stage_id_fkey" FOREIGN KEY ("stage_id") REFERENCES "public"."competition_stages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "public"."competition_challenges" ADD CONSTRAINT "competition_challenges_challenger_fkey" FOREIGN KEY ("challenger_entrant_id") REFERENCES "public"."competition_entrants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "public"."competition_challenges" ADD CONSTRAINT "competition_challenges_challenged_fkey" FOREIGN KEY ("challenged_entrant_id") REFERENCES "public"."competition_entrants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "competition_challenges_stage_idx" ON "public"."competition_challenges" USING btree ("stage_id","status");--> statement-breakpoint
-- one active outgoing/incoming challenge per entrant at a time (anti-dogpile)
CREATE UNIQUE INDEX "competition_challenges_active_challenger_key" ON "public"."competition_challenges" USING btree ("challenger_entrant_id") WHERE "status" IN ('pending','accepted');--> statement-breakpoint
CREATE UNIQUE INDEX "competition_challenges_active_challenged_key" ON "public"."competition_challenges" USING btree ("challenged_entrant_id") WHERE "status" IN ('pending','accepted');--> statement-breakpoint

-- ============================================================================
-- competition_prizes — placement-range payouts.
-- ============================================================================
CREATE TABLE "public"."competition_prizes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"season_id" uuid NOT NULL,
	"placement_low" integer NOT NULL,
	"placement_high" integer NOT NULL,
	"prize_type" varchar(20) NOT NULL,
	"amount" numeric,
	"currency" varchar(8),
	"description" text,
	"recipient_entrant_id" uuid,
	"payout_status" varchar(16) DEFAULT 'pending' NOT NULL,
	"paid_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "competition_prizes_type_chk" CHECK ("prize_type" IN ('cash','in_game_item','platform_points','physical','custom')),
	CONSTRAINT "competition_prizes_payout_chk" CHECK ("payout_status" IN ('pending','paid'))
);
--> statement-breakpoint
ALTER TABLE "public"."competition_prizes" ADD CONSTRAINT "competition_prizes_season_id_fkey" FOREIGN KEY ("season_id") REFERENCES "public"."competition_seasons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "public"."competition_prizes" ADD CONSTRAINT "competition_prizes_recipient_fkey" FOREIGN KEY ("recipient_entrant_id") REFERENCES "public"."competition_entrants"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "competition_prizes_season_idx" ON "public"."competition_prizes" USING btree ("season_id");--> statement-breakpoint

-- ============================================================================
-- competition_organizers — per-competition delegation (owner/admin/moderator).
-- ============================================================================
CREATE TABLE "public"."competition_organizers" (
	"competition_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" varchar(16) NOT NULL,
	"granted_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "competition_organizers_pkey" PRIMARY KEY ("competition_id","user_id"),
	CONSTRAINT "competition_organizers_role_chk" CHECK ("role" IN ('owner','admin','moderator'))
);
--> statement-breakpoint
ALTER TABLE "public"."competition_organizers" ADD CONSTRAINT "competition_organizers_competition_id_fkey" FOREIGN KEY ("competition_id") REFERENCES "public"."competitions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "public"."competition_organizers" ADD CONSTRAINT "competition_organizers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint

-- ============================================================================
-- competition_audit_log — every sensitive organizer action. Service-role only.
-- ============================================================================
CREATE TABLE "public"."competition_audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"competition_id" uuid,
	"season_id" uuid,
	"actor_user_id" uuid,
	"action" varchar(64) NOT NULL,
	"target" text,
	"before" jsonb,
	"after" jsonb,
	"reason" text,
	"at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "public"."competition_audit_log" ADD CONSTRAINT "competition_audit_log_competition_id_fkey" FOREIGN KEY ("competition_id") REFERENCES "public"."competitions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "competition_audit_log_competition_idx" ON "public"."competition_audit_log" USING btree ("competition_id","at");--> statement-breakpoint

-- ============================================================================
-- match_disputes — demo-linked dispute tickets. Service-role only.
-- ============================================================================
CREATE TABLE "public"."match_disputes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"match_id" uuid NOT NULL,
	"raised_by_entrant" uuid,
	"raised_by_user" uuid,
	"type" varchar(32) NOT NULL,
	"description" text,
	"evidence_urls" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"demo_object_path" text,
	"status" varchar(16) DEFAULT 'open' NOT NULL,
	"resolution" text,
	"resolved_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"resolved_at" timestamp with time zone,
	CONSTRAINT "match_disputes_status_chk" CHECK ("status" IN ('open','reviewing','resolved','rejected'))
);
--> statement-breakpoint
ALTER TABLE "public"."match_disputes" ADD CONSTRAINT "match_disputes_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "public"."match_disputes" ADD CONSTRAINT "match_disputes_raised_by_entrant_fkey" FOREIGN KEY ("raised_by_entrant") REFERENCES "public"."competition_entrants"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "match_disputes_match_idx" ON "public"."match_disputes" USING btree ("match_id");--> statement-breakpoint

-- ============================================================================
-- news_article_competitions — typed link between an article and a season.
-- ============================================================================
CREATE TABLE "public"."news_article_competitions" (
	"article_id" uuid NOT NULL,
	"season_id" uuid NOT NULL,
	"relation_type" varchar(16) DEFAULT 'general' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "news_article_competitions_pkey" PRIMARY KEY ("article_id","season_id"),
	CONSTRAINT "news_article_competitions_relation_chk" CHECK ("relation_type" IN ('announcement','preview','recap','result','general'))
);
--> statement-breakpoint
ALTER TABLE "public"."news_article_competitions" ADD CONSTRAINT "news_article_competitions_article_id_fkey" FOREIGN KEY ("article_id") REFERENCES "public"."news_articles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "public"."news_article_competitions" ADD CONSTRAINT "news_article_competitions_season_id_fkey" FOREIGN KEY ("season_id") REFERENCES "public"."competition_seasons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "news_article_competitions_season_idx" ON "public"."news_article_competitions" USING btree ("season_id");--> statement-breakpoint

-- ============================================================================
-- matches engine extensions — attribute matches to a season/stage + entrant sides.
-- ============================================================================
ALTER TABLE "public"."matches" ADD COLUMN "season_id" uuid;--> statement-breakpoint
ALTER TABLE "public"."matches" ADD COLUMN "stage_id" uuid;--> statement-breakpoint
ALTER TABLE "public"."matches" ADD COLUMN "match_source" varchar(24) DEFAULT 'queue' NOT NULL;--> statement-breakpoint
ALTER TABLE "public"."matches" ADD COLUMN "home_entrant_id" uuid;--> statement-breakpoint
ALTER TABLE "public"."matches" ADD COLUMN "away_entrant_id" uuid;--> statement-breakpoint
ALTER TABLE "public"."matches" ADD CONSTRAINT "matches_season_id_fkey" FOREIGN KEY ("season_id") REFERENCES "public"."competition_seasons"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "public"."matches" ADD CONSTRAINT "matches_stage_id_fkey" FOREIGN KEY ("stage_id") REFERENCES "public"."competition_stages"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "public"."matches" ADD CONSTRAINT "matches_home_entrant_id_fkey" FOREIGN KEY ("home_entrant_id") REFERENCES "public"."competition_entrants"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "public"."matches" ADD CONSTRAINT "matches_away_entrant_id_fkey" FOREIGN KEY ("away_entrant_id") REFERENCES "public"."competition_entrants"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "public"."matches" ADD CONSTRAINT "matches_source_chk" CHECK ("match_source" IN ('queue','fixture','bracket','ladder_challenge','scrim'));--> statement-breakpoint
CREATE INDEX "matches_season_idx" ON "public"."matches" USING btree ("season_id");--> statement-breakpoint
ALTER TABLE "public"."competition_fixtures" ADD CONSTRAINT "competition_fixtures_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "public"."competition_challenges" ADD CONSTRAINT "competition_challenges_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint

-- notification category
ALTER TABLE "public"."steam_notification_prefs" ADD COLUMN "notify_tournament" boolean DEFAULT true NOT NULL;--> statement-breakpoint

-- ============================================================================
-- RLS — public read on the shop window; writes via service role (organizer ops
-- are admin-gated in app code). audit log + disputes service-role only.
-- ============================================================================
ALTER TABLE "public"."competitions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "public"."competition_seasons" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "public"."competition_stages" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "public"."competition_entrants" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "public"."competition_entrant_members" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "public"."competition_fixtures" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "public"."competition_standings" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "public"."competition_challenges" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "public"."competition_prizes" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "public"."competition_organizers" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "public"."competition_audit_log" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "public"."match_disputes" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "public"."news_article_competitions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint

CREATE POLICY "competitions_read" ON "public"."competitions" FOR SELECT USING (true);--> statement-breakpoint
CREATE POLICY "competition_seasons_read" ON "public"."competition_seasons" FOR SELECT USING (true);--> statement-breakpoint
CREATE POLICY "competition_stages_read" ON "public"."competition_stages" FOR SELECT USING (true);--> statement-breakpoint
CREATE POLICY "competition_entrants_read" ON "public"."competition_entrants" FOR SELECT USING (true);--> statement-breakpoint
CREATE POLICY "competition_entrant_members_read" ON "public"."competition_entrant_members" FOR SELECT USING (true);--> statement-breakpoint
CREATE POLICY "competition_fixtures_read" ON "public"."competition_fixtures" FOR SELECT USING (true);--> statement-breakpoint
CREATE POLICY "competition_standings_read" ON "public"."competition_standings" FOR SELECT USING (true);--> statement-breakpoint
CREATE POLICY "competition_challenges_read" ON "public"."competition_challenges" FOR SELECT USING (true);--> statement-breakpoint
CREATE POLICY "competition_prizes_read" ON "public"."competition_prizes" FOR SELECT USING (true);--> statement-breakpoint
CREATE POLICY "competition_organizers_read" ON "public"."competition_organizers" FOR SELECT TO authenticated USING (true);--> statement-breakpoint
CREATE POLICY "news_article_competitions_read" ON "public"."news_article_competitions" FOR SELECT USING (true);--> statement-breakpoint

-- ============================================================================
-- Realtime — standings re-sort, fixtures advance, challenges arrive live.
-- ============================================================================
DO $$
BEGIN
	IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'competition_standings') THEN
		ALTER PUBLICATION supabase_realtime ADD TABLE public.competition_standings;
	END IF;
	IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'competition_fixtures') THEN
		ALTER PUBLICATION supabase_realtime ADD TABLE public.competition_fixtures;
	END IF;
	IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'competition_challenges') THEN
		ALTER PUBLICATION supabase_realtime ADD TABLE public.competition_challenges;
	END IF;
	IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'competition_entrants') THEN
		ALTER PUBLICATION supabase_realtime ADD TABLE public.competition_entrants;
	END IF;
END $$;--> statement-breakpoint
