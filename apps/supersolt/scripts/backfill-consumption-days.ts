/**
 * One-shot: finalize consumption facts for closed days that were never
 * computed (write-once; already-final days are untouched). Use after a
 * sales-mirror backfill lands mapped history.
 * Run from apps/supersolt: pnpm tsx scripts/backfill-consumption-days.ts [lookbackDays]
 */

import { config } from "dotenv";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
config({ path: resolve(__dirname, "../.env.local") });
config({ path: resolve(__dirname, "../.env") });

async function main() {
  const lookbackDays = Number(process.argv[2] ?? 40);
  const { createServiceAppDb } = await import("@/server/db/create-app-db");
  const { consumptionService } = await import("@/server/consumption/consumption.service");
  const { consumptionRepo } = await import("@/server/consumption/consumption.repo");
  const { stockOnHandService } = await import("@/server/consumption/stock-on-hand.service");

  const appDb = createServiceAppDb();
  const venues = await consumptionRepo.listActiveVenues(appDb);

  for (const venue of venues) {
    const { daysComputed } = await consumptionService.backfillVenue(appDb, {
      venueId: venue.venueId,
      organisationId: venue.organisationId,
      timezone: venue.timezone,
      lookbackDays,
    });
    const cacheUpdates = await stockOnHandService.updateCacheForVenue(
      appDb,
      venue.venueId,
    );
    console.log(
      `${venue.venueId}: ${daysComputed} days finalized, ${cacheUpdates} stock levels cached`,
    );
  }
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
