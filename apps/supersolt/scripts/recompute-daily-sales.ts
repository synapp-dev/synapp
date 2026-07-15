/**
 * Recompute daily_sales facts from the payment mirror (no Square API calls).
 * Repairs days frozen by the historical no-op upsert in forecast.repo.ts.
 * Run from apps/supersolt: pnpm tsx scripts/recompute-daily-sales.ts [daysBack]
 */

import { config } from "dotenv";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
config({ path: resolve(__dirname, "../.env.local") });
config({ path: resolve(__dirname, "../.env") });

const DEFAULT_DAYS_BACK = 90;

function calendarDatesBack(timezone: string, daysBack: number): string[] {
  const dates: string[] = [];
  const now = new Date();
  for (let i = 0; i <= daysBack; i += 1) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    dates.push(
      new Intl.DateTimeFormat("en-CA", {
        timeZone: timezone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(d),
    );
  }
  return [...new Set(dates)].sort();
}

async function main() {
  const daysBack = Number(process.argv[2]) || DEFAULT_DAYS_BACK;

  const { eq } = await import("drizzle-orm");
  const { createServiceAppDb } = await import("@/server/db/create-app-db");
  const { venueSquareConnections, venues } = await import("@/server/db/schema");
  const { recomputeDailySalesForDates } = await import(
    "@/server/square/daily-sales-recompute"
  );

  const appDb = createServiceAppDb();
  const rows = await appDb.admin
    .select({
      venueId: venueSquareConnections.venueId,
      timezone: venues.timezone,
      venueName: venues.name,
    })
    .from(venueSquareConnections)
    .innerJoin(venues, eq(venues.id, venueSquareConnections.venueId));

  console.info(`[recompute] ${rows.length} Square-connected venue(s), ${daysBack} days back`);

  for (const row of rows) {
    const dates = calendarDatesBack(row.timezone, daysBack);
    const count = await recomputeDailySalesForDates(appDb, {
      venueId: row.venueId,
      timezone: row.timezone,
      dates,
    });
    console.info(`[recompute] ${row.venueName}: ${count} day(s) recomputed`);
  }

  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
