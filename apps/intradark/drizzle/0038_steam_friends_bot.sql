-- Steam friends notification bot: DM job queue, deliveries ledger, per-user
-- notification prefs, friend roster, and scrim-event enqueue triggers.
-- See docs/steam-friends-bot/plan.md.

-- ============================================================================
-- steam_dm_jobs — unified outbound DM queue (direct = match; broadcast = fan-out)
-- ============================================================================
CREATE TABLE "public"."steam_dm_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" varchar(16) NOT NULL,        -- 'direct' | 'broadcast'
	"category" varchar(24) NOT NULL,    -- 'match' | 'news' | 'scrim' | 'broadcast'
	"steamid64" text,                   -- set for 'direct' jobs; null for 'broadcast'
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"dedup_key" text,
	"status" varchar(16) DEFAULT 'queued' NOT NULL, -- queued|running|done|error
	"attempts" integer DEFAULT 0 NOT NULL,
	"error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"started_at" timestamp with time zone,
	"finished_at" timestamp with time zone,
	CONSTRAINT "steam_dm_jobs_kind_chk" CHECK ("kind" IN ('direct','broadcast')),
	CONSTRAINT "steam_dm_jobs_status_chk" CHECK ("status" IN ('queued','running','done','error'))
);
--> statement-breakpoint
-- Idempotency: at most one job per logical event. Target-less ON CONFLICT DO NOTHING
-- on enqueue relies on this partial unique index.
CREATE UNIQUE INDEX "steam_dm_jobs_dedup_key_key" ON "public"."steam_dm_jobs" USING btree ("dedup_key") WHERE "dedup_key" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "steam_dm_jobs_drain_idx" ON "public"."steam_dm_jobs" USING btree ("status", "created_at");--> statement-breakpoint

-- ============================================================================
-- steam_dm_deliveries — per-recipient ledger so a retried broadcast never double-sends
-- ============================================================================
CREATE TABLE "public"."steam_dm_deliveries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_id" uuid NOT NULL,
	"steamid64" text NOT NULL,
	"sent_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "public"."steam_dm_deliveries" ADD CONSTRAINT "steam_dm_deliveries_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "public"."steam_dm_jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "steam_dm_deliveries_job_recipient_key" ON "public"."steam_dm_deliveries" USING btree ("job_id", "steamid64");--> statement-breakpoint

-- ============================================================================
-- steam_notification_prefs — per-user category toggles (master switch = friendship)
-- ============================================================================
CREATE TABLE "public"."steam_notification_prefs" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"notify_match" boolean DEFAULT true NOT NULL,
	"notify_news" boolean DEFAULT true NOT NULL,
	"notify_scrim" boolean DEFAULT true NOT NULL,
	"notify_broadcast" boolean DEFAULT true NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "public"."steam_notification_prefs" ADD CONSTRAINT "steam_notification_prefs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint

-- ============================================================================
-- steam_friends — roster of accounts that have added the bot (independent of the
-- live Steam friends-list so we can re-link a steamid to a user later)
-- ============================================================================
CREATE TABLE "public"."steam_friends" (
	"steamid64" text PRIMARY KEY NOT NULL,
	"user_id" uuid,
	"friend_status" varchar(16) DEFAULT 'active' NOT NULL, -- active|removed|blocked
	"added_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_dm_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "public"."steam_friends" ADD CONSTRAINT "steam_friends_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "steam_friends_user_id_idx" ON "public"."steam_friends" USING btree ("user_id");--> statement-breakpoint

-- ============================================================================
-- Row level security
-- Jobs + deliveries are service-role only (bot + Next admin client) — RLS on with
-- no policies = locked to service role. Prefs + friends are user-readable own-row.
-- ============================================================================
ALTER TABLE "public"."steam_dm_jobs" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "public"."steam_dm_deliveries" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "public"."steam_notification_prefs" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "public"."steam_friends" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint

CREATE POLICY "steam_notification_prefs_select_own" ON "public"."steam_notification_prefs" FOR SELECT TO authenticated USING (user_id = auth.uid());--> statement-breakpoint
CREATE POLICY "steam_notification_prefs_insert_own" ON "public"."steam_notification_prefs" FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());--> statement-breakpoint
CREATE POLICY "steam_notification_prefs_update_own" ON "public"."steam_notification_prefs" FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());--> statement-breakpoint

CREATE POLICY "steam_friends_select_own" ON "public"."steam_friends" FOR SELECT TO authenticated USING (user_id = auth.uid());--> statement-breakpoint

-- ============================================================================
-- Scrim enqueue triggers — scrim writes are browser→RPC (no server seam), so the
-- DB enqueues broadcast jobs directly. Drained by the bot's 5s poll (no poke;
-- scrim events are not latency-sensitive). SECURITY DEFINER so the RPC caller's
-- RLS doesn't block the insert into the service-role-only jobs table.
-- ============================================================================
CREATE OR REPLACE FUNCTION "public"."enqueue_scrim_listing_dm"()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
	INSERT INTO steam_dm_jobs (kind, category, payload, dedup_key)
	VALUES (
		'broadcast', 'scrim',
		jsonb_build_object(
			'audience', 'scrim_listing',
			'listing_id', NEW.id,
			'team_id', NEW.team_id,
			'min_tier_id', NEW.min_tier_id,
			'region_id', NEW.region_id
		),
		'scrim_listing:' || NEW.id::text
	)
	ON CONFLICT DO NOTHING;
	RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER "trg_scrim_listing_dm" AFTER INSERT ON "public"."scrim_listings" FOR EACH ROW EXECUTE FUNCTION "public"."enqueue_scrim_listing_dm"();--> statement-breakpoint

CREATE OR REPLACE FUNCTION "public"."enqueue_scrim_challenge_dm"()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
	INSERT INTO steam_dm_jobs (kind, category, payload, dedup_key)
	VALUES (
		'broadcast', 'scrim',
		jsonb_build_object(
			'audience', 'scrim_challenge',
			'challenge_id', NEW.id,
			'listing_id', NEW.scrim_listing_id,
			'challenger_team_id', NEW.team_id
		),
		'scrim_challenge:' || NEW.id::text
	)
	ON CONFLICT DO NOTHING;
	RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER "trg_scrim_challenge_dm" AFTER INSERT ON "public"."scrim_challenges" FOR EACH ROW EXECUTE FUNCTION "public"."enqueue_scrim_challenge_dm"();--> statement-breakpoint

CREATE OR REPLACE FUNCTION "public"."enqueue_scrim_accepted_dm"()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
	-- Notify the challenging (away) team that their challenge was accepted.
	INSERT INTO steam_dm_jobs (kind, category, payload, dedup_key)
	VALUES (
		'broadcast', 'scrim',
		jsonb_build_object(
			'audience', 'scrim_accepted',
			'scrim_id', NEW.id,
			'notify_team_id', NEW.away_team_id,
			'home_team_id', NEW.home_team_id,
			'match_time', NEW.match_time
		),
		'scrim_accepted:' || NEW.id::text
	)
	ON CONFLICT DO NOTHING;
	RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER "trg_scrim_accepted_dm" AFTER INSERT ON "public"."scrims" FOR EACH ROW EXECUTE FUNCTION "public"."enqueue_scrim_accepted_dm"();
