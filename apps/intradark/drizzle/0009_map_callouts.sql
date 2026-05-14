CREATE TABLE "public"."map_callouts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"map_id" uuid NOT NULL,
	"slug" varchar(128) NOT NULL,
	"label" text NOT NULL,
	"polygon_ring" jsonb NOT NULL,
	"priority" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "public"."map_callouts" ADD CONSTRAINT "map_callouts_map_id_fkey" FOREIGN KEY ("map_id") REFERENCES "public"."maps"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "map_callouts_map_id_slug_key" ON "public"."map_callouts" USING btree ("map_id", "slug");
--> statement-breakpoint
CREATE INDEX "map_callouts_map_id_idx" ON "public"."map_callouts" USING btree ("map_id");
