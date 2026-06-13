import { NextResponse } from "next/server";
import { createServiceAppDb } from "@/server/db/create-app-db";
import { invoicesRepo } from "@/server/invoices/invoices.repo";

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
  const cutoff = new Date();
  cutoff.setHours(cutoff.getHours() - 48);

  const stale = await invoicesRepo.listStalePendingReview(appDb, cutoff.toISOString());

  return NextResponse.json({
    staleCount: stale.length,
    stale: stale.map((s) => ({
      id: s.id,
      venueId: s.venueId,
      supplierName: s.supplierName,
      totalCents: s.totalCents,
      syncedAt: s.syncedAt,
    })),
  });
}
