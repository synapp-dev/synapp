-- School-scoped AP Culture Rating benchmark, comparative periods, and report requests.

CREATE TABLE "school_culture_benchmarks" (
	"school_id" uuid PRIMARY KEY NOT NULL,
	"period_start" date NOT NULL,
	"period_end" date NOT NULL,
	"metrics" jsonb NOT NULL,
	"source_notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	CONSTRAINT "school_culture_benchmarks_period_order" CHECK (period_end >= period_start)
);
--> statement-breakpoint
ALTER TABLE "school_culture_benchmarks" ADD CONSTRAINT "school_culture_benchmarks_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "school_culture_benchmarks" ADD CONSTRAINT "school_culture_benchmarks_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."user_profile"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "school_culture_benchmarks" ADD CONSTRAINT "school_culture_benchmarks_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."user_profile"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "school_culture_benchmarks" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "school_culture_benchmarks_select" ON "school_culture_benchmarks" AS PERMISSIVE FOR SELECT TO authenticated USING (true);
--> statement-breakpoint
CREATE POLICY "school_culture_benchmarks_insert" ON "school_culture_benchmarks" AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (true);
--> statement-breakpoint
CREATE POLICY "school_culture_benchmarks_update" ON "school_culture_benchmarks" AS PERMISSIVE FOR UPDATE TO authenticated USING (true);
--> statement-breakpoint
CREATE POLICY "school_culture_benchmarks_delete" ON "school_culture_benchmarks" AS PERMISSIVE FOR DELETE TO authenticated USING (true);
--> statement-breakpoint

CREATE TABLE "school_culture_comparative_periods" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"school_id" uuid NOT NULL,
	"period_start" date NOT NULL,
	"period_end" date NOT NULL,
	"metrics" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	CONSTRAINT "school_culture_comparative_periods_order" CHECK (period_end >= period_start)
);
--> statement-breakpoint
CREATE INDEX "idx_school_culture_comparative_school" ON "school_culture_comparative_periods" USING btree ("school_id");
--> statement-breakpoint
ALTER TABLE "school_culture_comparative_periods" ADD CONSTRAINT "school_culture_comparative_periods_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "school_culture_comparative_periods" ADD CONSTRAINT "school_culture_comparative_periods_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."user_profile"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "school_culture_comparative_periods" ADD CONSTRAINT "school_culture_comparative_periods_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."user_profile"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "school_culture_comparative_periods" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "school_culture_comparative_periods_select" ON "school_culture_comparative_periods" AS PERMISSIVE FOR SELECT TO authenticated USING (true);
--> statement-breakpoint
CREATE POLICY "school_culture_comparative_periods_insert" ON "school_culture_comparative_periods" AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (true);
--> statement-breakpoint
CREATE POLICY "school_culture_comparative_periods_update" ON "school_culture_comparative_periods" AS PERMISSIVE FOR UPDATE TO authenticated USING (true);
--> statement-breakpoint
CREATE POLICY "school_culture_comparative_periods_delete" ON "school_culture_comparative_periods" AS PERMISSIVE FOR DELETE TO authenticated USING (true);
--> statement-breakpoint

CREATE TABLE "school_culture_report_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"comparative_period_id" uuid NOT NULL,
	"status" text NOT NULL,
	"requested_at" timestamp with time zone,
	"requested_by" uuid,
	"completed_at" timestamp with time zone,
	"delivered_storage_path" text,
	"delivered_mime_type" text,
	"delivered_display_name" text,
	"delivered_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "school_culture_report_requests_status_check" CHECK (status = ANY (ARRAY['draft'::text, 'requested'::text, 'in_review'::text, 'completed'::text, 'rejected'::text]))
);
--> statement-breakpoint
CREATE UNIQUE INDEX "ux_school_culture_report_comparative" ON "school_culture_report_requests" USING btree ("comparative_period_id");
--> statement-breakpoint
ALTER TABLE "school_culture_report_requests" ADD CONSTRAINT "school_culture_report_requests_comparative_period_id_fkey" FOREIGN KEY ("comparative_period_id") REFERENCES "public"."school_culture_comparative_periods"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "school_culture_report_requests" ADD CONSTRAINT "school_culture_report_requests_requested_by_fkey" FOREIGN KEY ("requested_by") REFERENCES "public"."user_profile"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "school_culture_report_requests" ADD CONSTRAINT "school_culture_report_requests_delivered_by_fkey" FOREIGN KEY ("delivered_by") REFERENCES "public"."user_profile"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "school_culture_report_requests" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "school_culture_report_requests_select" ON "school_culture_report_requests" AS PERMISSIVE FOR SELECT TO authenticated USING (true);
--> statement-breakpoint
CREATE POLICY "school_culture_report_requests_insert" ON "school_culture_report_requests" AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (true);
--> statement-breakpoint
CREATE POLICY "school_culture_report_requests_update" ON "school_culture_report_requests" AS PERMISSIVE FOR UPDATE TO authenticated USING (true);
--> statement-breakpoint
CREATE POLICY "school_culture_report_requests_delete" ON "school_culture_report_requests" AS PERMISSIVE FOR DELETE TO authenticated USING (true);
