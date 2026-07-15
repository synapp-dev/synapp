/**
 * Read-only probe: joins Open-Meteo historical weather against daily_sales in memory
 * (no venue_weather_daily table required) and prints, per rain bucket, how revenue,
 * orders, and channel mix move relative to same-weekday means, plus the multipliers
 * the forecast engine would fit. Run from apps/supersolt:
 *   pnpm tsx scripts/weather-correlation.ts
 */

import { config } from "dotenv";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
config({ path: resolve(__dirname, "../.env.local") });
config({ path: resolve(__dirname, "../.env") });

type ChannelDay = {
  date: string;
  revenueCents: number;
  ordersCount: number;
  avgCheckCents: number;
  dineInRevenueCents: number;
  pickUpRevenueCents: number;
  deliveryRevenueCents: number;
  refundsCount: number;
  refundsValueCents: number;
  voidsCount: number;
};

function dayOfWeekUtc(isoDate: string): number {
  const [y, mo, d] = isoDate.split("-").map(Number);
  return new Date(Date.UTC(y ?? 0, (mo ?? 1) - 1, d ?? 1, 12)).getUTCDay();
}

function mean(values: number[]): number {
  return values.length === 0
    ? 0
    : values.reduce((a, v) => a + v, 0) / values.length;
}

function weekdayMeans(
  days: ChannelDay[],
  pick: (d: ChannelDay) => number,
): Map<number, number> {
  const byDow = new Map<number, number[]>();
  for (const day of days) {
    const dow = dayOfWeekUtc(day.date);
    const list = byDow.get(dow) ?? [];
    list.push(pick(day));
    byDow.set(dow, list);
  }
  const means = new Map<number, number>();
  for (const [dow, values] of byDow) {
    if (values.length >= 2) means.set(dow, mean(values));
  }
  return means;
}

function bucketRatios(
  days: ChannelDay[],
  buckets: Record<string, string>,
  pick: (d: ChannelDay) => number,
): Map<string, number[]> {
  const means = weekdayMeans(days, pick);
  const out = new Map<string, number[]>();
  for (const day of days) {
    const bucket = buckets[day.date];
    const wm = means.get(dayOfWeekUtc(day.date));
    if (!bucket || !wm || wm <= 0) continue;
    const list = out.get(bucket) ?? [];
    list.push(pick(day) / wm);
    out.set(bucket, list);
  }
  return out;
}

const fmtRatio = (values: number[] | undefined): string =>
  !values || values.length === 0
    ? "     n/a"
    : `${(mean(values) * 100).toFixed(1).padStart(6)}%`;

async function main() {
  const { createServiceAppDb } = await import("@/server/db/create-app-db");
  const { forecastRepo } = await import("@/server/forecast/forecast.repo");
  const { weatherRepo } = await import("@/server/weather/weather.repo");
  const { resolveVenueCoordinates } = await import(
    "@/server/weather/weather.service"
  );
  const { fetchArchiveDailyWeather, fetchForecastDailyWeather } = await import(
    "@/server/weather/open-meteo"
  );
  const { conditionBucketForRain, WEATHER_BUCKETS } = await import(
    "@/server/weather/weather-buckets"
  );
  const { fitWeatherMultipliers } = await import(
    "@/server/weather/weather-multipliers"
  );
  const { addDaysCalendarIso } = await import("@/lib/date/calendar-iso");
  const { todayCalendarIsoInVenue } = await import("@/lib/roster/venue-time");

  const appDb = createServiceAppDb();
  const venues = await weatherRepo.listActiveVenuesForWeather(appDb);

  for (const venue of venues) {
    const salesRows = await forecastRepo.listDailySalesHistory(
      appDb,
      venue.venueId,
    );
    const days: ChannelDay[] = salesRows
      .map((r) => ({
        date: r.date,
        revenueCents: r.revenueCents,
        ordersCount: r.ordersCount,
        avgCheckCents: r.avgCheckCents,
        dineInRevenueCents: r.dineInRevenueCents,
        pickUpRevenueCents: r.pickUpRevenueCents,
        deliveryRevenueCents: r.deliveryRevenueCents,
        refundsCount: r.refundsCount,
        refundsValueCents: r.refundsValueCents,
        voidsCount: r.voidsCount,
      }))
      .filter((d) => d.ordersCount > 0);

    if (days.length < 14) {
      console.log(`\n=== ${venue.venueId}: only ${days.length} trading days, skipping`);
      continue;
    }

    const coordinates = await resolveVenueCoordinates(venue);
    if (!coordinates) {
      console.log(`\n=== ${venue.venueId}: no coordinates resolvable, skipping`);
      continue;
    }

    const todayIso = todayCalendarIsoInVenue(venue.timezone);
    const firstDay = days[0]!.date;
    const archiveCutoff = addDaysCalendarIso(todayIso, -8);

    const observations = [
      ...(firstDay < archiveCutoff
        ? await fetchArchiveDailyWeather({
            latitude: coordinates.latitude,
            longitude: coordinates.longitude,
            timezone: venue.timezone,
            fromDate: firstDay,
            toDate: archiveCutoff,
          })
        : []),
      ...(await fetchForecastDailyWeather({
        latitude: coordinates.latitude,
        longitude: coordinates.longitude,
        timezone: venue.timezone,
        pastDays: 14,
        forecastDays: 1,
      })),
    ];

    const buckets: Record<string, string> = {};
    const rainByDate: Record<string, number> = {};
    for (const o of observations) {
      if (o.date >= todayIso) continue;
      buckets[o.date] = conditionBucketForRain(o.rainMm);
      rainByDate[o.date] = o.rainMm;
    }

    const paired = days.filter((d) => buckets[d.date] !== undefined);
    console.log(
      `\n=== venue ${venue.venueId} (${venue.suburb ?? "?"}) @ ${coordinates.latitude.toFixed(3)},${coordinates.longitude.toFixed(3)}`,
    );
    console.log(
      `trading days: ${days.length}, with weather: ${paired.length} (${firstDay} .. ${days[days.length - 1]!.date})`,
    );

    const revenue = bucketRatios(paired, buckets, (d) => d.revenueCents);
    const orders = bucketRatios(paired, buckets, (d) => d.ordersCount);
    const avgCheck = bucketRatios(paired, buckets, (d) => d.avgCheckCents);
    const delivery = bucketRatios(paired, buckets, (d) => d.deliveryRevenueCents);
    const pickUp = bucketRatios(paired, buckets, (d) => d.pickUpRevenueCents);
    const dineIn = bucketRatios(paired, buckets, (d) => d.dineInRevenueCents);

    console.log(
      "\nbucket        days  revenue  orders  avgchk  dine-in  pickup  delivery  del.share",
    );
    for (const bucket of WEATHER_BUCKETS) {
      const bucketDays = paired.filter((d) => buckets[d.date] === bucket);
      const share = bucketDays
        .filter((d) => d.revenueCents > 0)
        .map((d) => d.deliveryRevenueCents / d.revenueCents);
      console.log(
        [
          bucket.padEnd(12),
          String(bucketDays.length).padStart(4),
          fmtRatio(revenue.get(bucket)),
          fmtRatio(orders.get(bucket)),
          fmtRatio(avgCheck.get(bucket)),
          fmtRatio(dineIn.get(bucket)),
          fmtRatio(pickUp.get(bucket)),
          fmtRatio(delivery.get(bucket)),
          `${(mean(share) * 100).toFixed(1).padStart(7)}%`,
        ].join("  "),
      );
    }

    const multipliers = fitWeatherMultipliers({
      history: paired,
      bucketsByDate: buckets as Record<string, "dry" | "light_rain" | "heavy_rain">,
    });
    console.log("\nfitted forecast multipliers (shrunk toward 1, dry-normalised):");
    console.log(JSON.stringify(multipliers, null, 2));
  }

  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
