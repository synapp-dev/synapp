-- Double-elimination support (plan §3.1 / P5). Fixtures gain loser-routing (the
-- losers bracket) and a bracket marker for display: 'wb' winners, 'lb' losers,
-- 'gf' grand final. Single-elim leaves these null/'wb'.

ALTER TABLE "public"."competition_fixtures" ADD COLUMN "bracket" varchar(8);--> statement-breakpoint
ALTER TABLE "public"."competition_fixtures" ADD COLUMN "loser_fixture_id" uuid;--> statement-breakpoint
ALTER TABLE "public"."competition_fixtures" ADD COLUMN "loser_slot" varchar(8);--> statement-breakpoint
ALTER TABLE "public"."competition_fixtures" ADD CONSTRAINT "competition_fixtures_loser_fixture_id_fkey" FOREIGN KEY ("loser_fixture_id") REFERENCES "public"."competition_fixtures"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
