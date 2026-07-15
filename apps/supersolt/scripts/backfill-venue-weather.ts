/**
 * One-shot: seed venue_weather_daily for all active venues (archive backfill from each
 * venue's earliest daily_sales date + 16-day forward forecast), then print what the
 * forecast engine would do with it. Run from apps/supersolt:
 *   pnpm tsx scripts/backfill-venue-weather.ts
 */

import { config } from "dotenv";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
config({ path: resolve(__dirname, "../.env.local") });
config({ path: resolve(__dirname, "../.env") });

async function main() {
  const { createServiceAppDb } = await import("@/server/db/create-app-db");
  const { runDailyWeatherSync, getForecastWeatherContext } = await import(
    "@/server/weather/weather.service"
  );
  const { weatherRepo } = await import("@/server/weather/weather.repo");
  const { forecastRepo } = await import("@/server/forecast/forecast.repo");

  const appDb = createServiceAppDb();
  const forceBackfill = process.argv.includes("--force");
  const result = await runDailyWeatherSync(appDb, { forceBackfill });
  console.log("sync:", JSON.stringify({ forceBackfill, ...result }));

  const venues = await weatherRepo.listActiveVenuesForWeather(appDb);
  for (const venue of venues) {
    const rows = await weatherRepo.listWeatherForVenue(appDb, {
      venueId: venue.venueId,
    });
    if (rows.length === 0) {
      console.log(`${venue.venueId} (${venue.suburb ?? "?"}): no weather rows`);
      continue;
    }
    const forward = rows.filter((r) => r.isForecast).length;
    console.log(
      `${venue.venueId} (${venue.suburb ?? "?"}): ${rows.length} days ` +
        `(${rows[0]!.date} .. ${rows[rows.length - 1]!.date}, ${forward} forecast)`,
    );

    const salesRows = await forecastRepo.listDailySalesHistory(appDb, venue.venueId);
    const context = await getForecastWeatherContext(appDb, {
      venueId: venue.venueId,
      history: salesRows,
    });
    if (context) {
      console.log("  fitted multipliers:", JSON.stringify(context.multipliers));
      const upcoming = rows.filter((r) => r.isForecast).slice(0, 7);
      console.log(
        "  next 7 days:",
        upcoming
          .map((r) => `${r.date} ${r.conditionBucket} (${r.rainMm}mm)`)
          .join(", "),
      );
    }
  }

  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
