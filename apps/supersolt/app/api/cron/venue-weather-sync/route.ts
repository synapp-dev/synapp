import { NextResponse } from "next/server";
import { createServiceAppDb } from "@/server/db/create-app-db";
import { isWeatherForecastEnabled } from "@/server/weather/weather-flag";
import { runDailyWeatherSync } from "@/server/weather/weather.service";

function authorizeCron(request: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return process.env.NODE_ENV !== "production";
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(request: Request) {
  if (!authorizeCron(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isWeatherForecastEnabled()) {
    return NextResponse.json({ ok: true, skipped: "WEATHER_FORECAST_ENABLED is not true" });
  }

  const appDb = createServiceAppDb();
  const result = await runDailyWeatherSync(appDb);
  return NextResponse.json({ ok: true, ...result });
}
