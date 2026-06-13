import { NextResponse } from "next/server";
import { createServiceAppDb } from "@/server/db/create-app-db";
import { payrollService } from "@/server/workforce/payroll-export/payroll.service";

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
  const result = await payrollService.markStaleWebhookPayRuns(appDb, 4);
  return NextResponse.json(result);
}

export async function POST(request: Request) {
  return GET(request);
}
