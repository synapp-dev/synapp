import { NextResponse } from "next/server";
import { createServiceAppDb } from "@/server/db/create-app-db";
import { timesheetService } from "@/server/workforce/timesheet.service";

function authorizeCron(request: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return process.env.NODE_ENV !== "production";
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(request: Request) {
  if (!authorizeCron(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const appDb = createServiceAppDb();
  await timesheetService.processAutoClockOuts(appDb);
  return NextResponse.json({ ok: true });
}
