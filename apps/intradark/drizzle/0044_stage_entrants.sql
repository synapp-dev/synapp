-- Composite multi-stage support (plan §2 / P5). A stage can have an explicit
-- participant set (with seeds) — e.g. the top-N from a group stage advance into
-- a playoff stage. When a stage has NO rows here, drivers fall back to all season
-- entrants (the simple single-stage case).

CREATE TABLE "public"."competition_stage_entrants" (
	"stage_id" uuid NOT NULL,
	"entrant_id" uuid NOT NULL,
	"seed" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "competition_stage_entrants_pkey" PRIMARY KEY ("stage_id","entrant_id")
);
--> statement-breakpoint
ALTER TABLE "public"."competition_stage_entrants" ADD CONSTRAINT "competition_stage_entrants_stage_id_fkey" FOREIGN KEY ("stage_id") REFERENCES "public"."competition_stages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "public"."competition_stage_entrants" ADD CONSTRAINT "competition_stage_entrants_entrant_id_fkey" FOREIGN KEY ("entrant_id") REFERENCES "public"."competition_entrants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "competition_stage_entrants_stage_idx" ON "public"."competition_stage_entrants" USING btree ("stage_id");--> statement-breakpoint
ALTER TABLE "public"."competition_stage_entrants" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "competition_stage_entrants_read" ON "public"."competition_stage_entrants" FOR SELECT USING (true);--> statement-breakpoint
