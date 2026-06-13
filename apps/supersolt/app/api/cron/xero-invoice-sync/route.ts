import { NextResponse } from "next/server";
import { and, eq, sql } from "drizzle-orm";
import { createAppDb, createServiceAppDb } from "@/server/db/create-app-db";
import { organisations, userOrganisations, venueXeroConnections, venues } from "@/server/db/schema";
import { syncVenueXeroInvoices } from "@/server/xero/xero-invoices.service";
import { syncVenueXeroSuppliers } from "@/server/xero/xero-suppliers.service";
import { buildRequestAuthContext } from "@/server/auth/context";

function authorizeCron(request: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return process.env.NODE_ENV !== "production";
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(request: Request) {
  if (!authorizeCron(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const serviceDb = createServiceAppDb();
  const rows = await serviceDb.admin
    .select({
      venueId: venueXeroConnections.venueId,
      venueSlug: venues.slug,
      orgSlug: organisations.slug,
      organisationId: venues.organisationId,
    })
    .from(venueXeroConnections)
    .innerJoin(venues, eq(venues.id, venueXeroConnections.venueId))
    .innerJoin(organisations, eq(organisations.id, venues.organisationId))
    .where(sql`${venueXeroConnections.xeroTenantId} IS NOT NULL`);

  let synced = 0;
  let errors = 0;

  for (const row of rows) {
    try {
      const adminRow = await serviceDb.admin
        .select({ userId: userOrganisations.userProfileId })
        .from(userOrganisations)
        .where(
          and(
            eq(userOrganisations.organisationId, row.organisationId),
            eq(userOrganisations.isActive, true),
          ),
        )
        .limit(1);

      const userId = adminRow[0]?.userId;
      if (!userId) {
        errors += 1;
        continue;
      }

      const ctx = await buildRequestAuthContext(userId, createAppDb({ sub: userId, role: "authenticated" }));
      await syncVenueXeroSuppliers(ctx, {
        organisationSlug: row.orgSlug,
        venueSlug: row.venueSlug,
      });
      await syncVenueXeroInvoices(ctx, {
        organisationSlug: row.orgSlug,
        venueSlug: row.venueSlug,
        daysBack: 7,
      });
      synced += 1;
    } catch (error) {
      console.error("[cron/xero-invoice-sync]", row.venueId, error);
      errors += 1;
    }
  }

  return NextResponse.json({ synced, errors });
}

export async function POST(request: Request) {
  return GET(request);
}
