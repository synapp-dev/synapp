import { NextResponse } from "next/server";
import { eq, sql } from "drizzle-orm";
import { createServiceAppDb } from "@/server/db/create-app-db";
import {
  organisations,
  venueSquareConnections,
  venues,
} from "@/server/db/schema";
import { forecastRepo } from "@/server/forecast/forecast.repo";
import { squareConnectionsRepo } from "@/server/square/square-connections.repo";
import { runIncrementalSquareSync } from "@/server/square/square-sync.service";

function authorizeCron(request: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return process.env.NODE_ENV !== "production";
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(request: Request) {
  if (!authorizeCron(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (process.env.SQUARE_SYNC_CRON_ENABLED === "false") {
    return NextResponse.json({ skipped: true, reason: "disabled" });
  }

  const serviceDb = createServiceAppDb();
  const rows = await serviceDb.admin
    .select({
      venueId: venueSquareConnections.venueId,
      organisationId: venues.organisationId,
      timezone: venues.timezone,
    })
    .from(venueSquareConnections)
    .innerJoin(venues, eq(venues.id, venueSquareConnections.venueId))
    .innerJoin(organisations, eq(organisations.id, venues.organisationId))
    .where(sql`${venueSquareConnections.squareAccessToken} IS NOT NULL`);

  let synced = 0;
  let errors = 0;

  for (const row of rows) {
    try {
      const state = await forecastRepo.getVenueForecastStateAdmin(
        serviceDb,
        row.venueId,
      );
      // Load via the connection loader so an expired access token is
      // auto-refreshed with the stored refresh token before we hit Square;
      // the raw table token may be up to a month stale.
      const connection = await squareConnectionsRepo.loadConnectionForVenue(
        serviceDb,
        row.venueId,
        false,
      );
      if (!connection) continue;
      await runIncrementalSquareSync(serviceDb, {
        venueId: row.venueId,
        organisationId: row.organisationId,
        timezone: row.timezone ?? "Australia/Melbourne",
        accessToken: connection.squareAccessToken,
        environment: connection.environment,
        locationId: connection.squareLocationId,
        dataStartsFrom: state?.dataStartsFrom ?? null,
      });
      synced += 1;
    } catch (error) {
      console.error("[cron/square-sales-sync]", row.venueId, error);
      errors += 1;
    }
  }

  return NextResponse.json({ synced, errors, total: rows.length });
}

export async function POST(request: Request) {
  return GET(request);
}
