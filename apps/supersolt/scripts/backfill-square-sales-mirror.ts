/**
 * Backfill Square payment mirror (90 days) for all connected venues.
 * Run from apps/supersolt: pnpm backfill:square-sales-mirror
 */

import { config } from "dotenv";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
config({ path: resolve(__dirname, "../.env.local") });
config({ path: resolve(__dirname, "../.env") });

const STAGGER_MS = 2_000;

async function main() {
  const { eq } = await import("drizzle-orm");
  const { createServiceAppDb } = await import("@/server/db/create-app-db");
  const { venueSquareConnections, venues } = await import("@/server/db/schema");
  const { forecastRepo } = await import("@/server/forecast/forecast.repo");
  const { DEFAULT_BACKFILL_DAYS, runBackfillSquareSync } = await import(
    "@/server/square/square-sync.service"
  );

  const appDb = createServiceAppDb();
  const rows = await appDb.admin
    .select({
      venueId: venueSquareConnections.venueId,
      organisationId: venues.organisationId,
      timezone: venues.timezone,
      accessToken: venueSquareConnections.squareAccessToken,
      environment: venueSquareConnections.environment,
      locationId: venueSquareConnections.squareLocationId,
      venueName: venues.name,
    })
    .from(venueSquareConnections)
    .innerJoin(venues, eq(venues.id, venueSquareConnections.venueId));

  console.info(`[backfill] ${rows.length} Square-connected venue(s)`);

  for (let i = 0; i < rows.length; i += 1) {
    const row = rows[i]!;
    if (i > 0) {
      await new Promise((r) => setTimeout(r, STAGGER_MS));
    }

    console.info(`[backfill] ${row.venueName} (${row.venueId})`);
    try {
      const state = await forecastRepo.getVenueForecastStateAdmin(
        appDb,
        row.venueId,
      );
      const result = await runBackfillSquareSync(appDb, {
        venueId: row.venueId,
        organisationId: row.organisationId,
        timezone: row.timezone,
        accessToken: row.accessToken,
        environment: row.environment,
        locationId: row.locationId,
        daysBack: DEFAULT_BACKFILL_DAYS,
        dataStartsFrom: state?.dataStartsFrom ?? null,
      });
      console.info(
        `[backfill] ok payments=${result.paymentCount} days=${result.dayCount}`,
      );
    } catch (error) {
      console.error(`[backfill] failed ${row.venueId}`, error);
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
