-- Anticheat client backend: paired devices, client sessions (+ env attestation
-- snapshot), forensic events, the server-delivered signature list, and the admin
-- review queue. See docs/anticheat-client-build-decisions.md.
--
-- ALL tables are service-role only (RLS enabled, no policies). Clients never touch
-- the DB directly — everything flows through /api/ac/* (mirrors the CS2 ingest).
-- Admin reads go through a service-role server seam, like steam_dm_jobs (0038).

-- ============================================================================
-- ac_devices — one row per paired machine. Token stored hashed, never raw.
-- ============================================================================
CREATE TABLE "public"."ac_devices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token_hash" text NOT NULL,            -- sha-256 of the device token
	"label" varchar(120),                  -- e.g. the machine name
	"os_info" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone,
	"revoked_at" timestamp with time zone   -- null = active
);
--> statement-breakpoint
ALTER TABLE "public"."ac_devices" ADD CONSTRAINT "ac_devices_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "ac_devices_token_hash_key" ON "public"."ac_devices" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "ac_devices_user_id_idx" ON "public"."ac_devices" USING btree ("user_id");--> statement-breakpoint

-- ============================================================================
-- ac_sessions — one row per client run. The accept gate reads last_heartbeat_at.
-- Environment attestation is embedded (informational only in v1 — never a gate).
-- No per-heartbeat table: heartbeats bump last_heartbeat_at + heartbeat_count.
-- ============================================================================
CREATE TABLE "public"."ac_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"device_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,                 -- denormalized for fast gate reads
	"steamid64" text,                        -- resolved at session start (for match correlation / kick)
	"match_id" uuid,                         -- set while the player is in a match
	"app_version" varchar(32),
	"status" varchar(16) DEFAULT 'active' NOT NULL,  -- active|ended|stale
	-- Environment attestation snapshot (informational; nullable until collected)
	"tpm_present" boolean,
	"secure_boot" boolean,
	"iommu" boolean,
	"vbs" boolean,
	"os_build" text,
	"env_raw" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"last_heartbeat_at" timestamp with time zone,
	"heartbeat_count" integer DEFAULT 0 NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ended_at" timestamp with time zone,
	CONSTRAINT "ac_sessions_status_chk" CHECK ("status" IN ('active','ended','stale'))
);
--> statement-breakpoint
ALTER TABLE "public"."ac_sessions" ADD CONSTRAINT "ac_sessions_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "public"."ac_devices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "public"."ac_sessions" ADD CONSTRAINT "ac_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "public"."ac_sessions" ADD CONSTRAINT "ac_sessions_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
-- The gate query: latest live heartbeat per user.
CREATE INDEX "ac_sessions_user_heartbeat_idx" ON "public"."ac_sessions" USING btree ("user_id", "last_heartbeat_at");--> statement-breakpoint
CREATE INDEX "ac_sessions_match_id_idx" ON "public"."ac_sessions" USING btree ("match_id") WHERE "match_id" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "ac_sessions_status_idx" ON "public"."ac_sessions" USING btree ("status");--> statement-breakpoint

-- ============================================================================
-- ac_signatures — server-owned detection list, served as a versioned bundle to
-- the (dumb) client. The server owns all detection logic.
-- ============================================================================
CREATE TABLE "public"."ac_signatures" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" varchar(16) NOT NULL,             -- hash|process_name|driver_name|window
	"value" text NOT NULL,                    -- the sha-256 / name / pattern to match
	"severity" varchar(16) DEFAULT 'medium' NOT NULL,  -- info|low|medium|high|critical
	"label" varchar(160),
	"enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ac_signatures_kind_chk" CHECK ("kind" IN ('hash','process_name','driver_name','window')),
	CONSTRAINT "ac_signatures_severity_chk" CHECK ("severity" IN ('info','low','medium','high','critical'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX "ac_signatures_kind_value_key" ON "public"."ac_signatures" USING btree ("kind", "value");--> statement-breakpoint
CREATE INDEX "ac_signatures_enabled_idx" ON "public"."ac_signatures" USING btree ("enabled", "updated_at");--> statement-breakpoint

-- ============================================================================
-- ac_events — forensic findings. Idempotent on a composite content key (the
-- client supplies no trustworthy id — same lesson as match_events / MatchZy).
-- ============================================================================
CREATE TABLE "public"."ac_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid,                        -- null for session-less events (e.g. backend_unverified)
	"user_id" uuid NOT NULL,
	"steamid64" text,
	"match_id" uuid,
	"kind" text NOT NULL,                     -- signature_match|new_driver|new_process|env_snapshot|ac_dropout|kicked|backend_unverified
	"severity" varchar(16) DEFAULT 'info' NOT NULL,
	"signature_id" uuid,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"dedup_key" text,                         -- composite content hash; partial-unique below
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ac_events_severity_chk" CHECK ("severity" IN ('info','low','medium','high','critical'))
);
--> statement-breakpoint
ALTER TABLE "public"."ac_events" ADD CONSTRAINT "ac_events_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."ac_sessions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "public"."ac_events" ADD CONSTRAINT "ac_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "public"."ac_events" ADD CONSTRAINT "ac_events_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "public"."ac_events" ADD CONSTRAINT "ac_events_signature_id_fkey" FOREIGN KEY ("signature_id") REFERENCES "public"."ac_signatures"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "ac_events_dedup_key_key" ON "public"."ac_events" USING btree ("dedup_key") WHERE "dedup_key" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "ac_events_user_created_idx" ON "public"."ac_events" USING btree ("user_id", "created_at");--> statement-breakpoint
CREATE INDEX "ac_events_match_id_idx" ON "public"."ac_events" USING btree ("match_id") WHERE "match_id" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "ac_events_triage_idx" ON "public"."ac_events" USING btree ("severity", "kind", "created_at");--> statement-breakpoint

-- ============================================================================
-- ac_flags — admin review queue. NOTHING auto-bans; every actionable finding
-- lands here and a human decides. Confirmed flags feed Veritas penalties.
-- ============================================================================
CREATE TABLE "public"."ac_flags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"event_id" uuid,
	"status" varchar(16) DEFAULT 'open' NOT NULL,   -- open|reviewing|confirmed|dismissed
	"severity" varchar(16) DEFAULT 'medium' NOT NULL,
	"reviewed_by" uuid,
	"resolution" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ac_flags_status_chk" CHECK ("status" IN ('open','reviewing','confirmed','dismissed')),
	CONSTRAINT "ac_flags_severity_chk" CHECK ("severity" IN ('info','low','medium','high','critical'))
);
--> statement-breakpoint
ALTER TABLE "public"."ac_flags" ADD CONSTRAINT "ac_flags_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "public"."ac_flags" ADD CONSTRAINT "ac_flags_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."ac_events"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "public"."ac_flags" ADD CONSTRAINT "ac_flags_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "auth"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ac_flags_status_created_idx" ON "public"."ac_flags" USING btree ("status", "created_at");--> statement-breakpoint
CREATE INDEX "ac_flags_user_id_idx" ON "public"."ac_flags" USING btree ("user_id");--> statement-breakpoint
-- One open/active flag per source event (idempotent flag creation from the ingest).
CREATE UNIQUE INDEX "ac_flags_event_id_key" ON "public"."ac_flags" USING btree ("event_id") WHERE "event_id" IS NOT NULL;--> statement-breakpoint

-- ============================================================================
-- Row level security — service-role only (RLS on, no policies), like steam_dm_jobs.
-- ============================================================================
ALTER TABLE "public"."ac_devices" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "public"."ac_sessions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "public"."ac_signatures" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "public"."ac_events" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "public"."ac_flags" ENABLE ROW LEVEL SECURITY;
