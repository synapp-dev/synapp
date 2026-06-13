import { eq } from "drizzle-orm";

import type { AppDb } from "@/server/db/create-app-db";
import { venueXeroConnections } from "@/server/db/schema";

export type VenueXeroConnectionRow = {
  venueId: string;
  organisationId: string;
  xeroTenantId: string;
  xeroAccessToken: string;
  xeroRefreshToken: string;
  tokenExpiresAt: string | null;
  lastInvoiceSyncAt: string | null;
  lastInvoiceSyncError: string | null;
};

function mapRow(
  row: typeof venueXeroConnections.$inferSelect,
): VenueXeroConnectionRow {
  return {
    venueId: row.venueId,
    organisationId: row.organisationId,
    xeroTenantId: row.xeroTenantId,
    xeroAccessToken: row.xeroAccessToken,
    xeroRefreshToken: row.xeroRefreshToken,
    tokenExpiresAt: row.tokenExpiresAt,
    lastInvoiceSyncAt: row.lastInvoiceSyncAt,
    lastInvoiceSyncError: row.lastInvoiceSyncError,
  };
}

export const xeroConnectionsRepo = {
  async getConnectionForVenue(
    appDb: AppDb,
    venueId: string,
  ): Promise<VenueXeroConnectionRow | null> {
    const rows = await appDb.admin
      .select()
      .from(venueXeroConnections)
      .where(eq(venueXeroConnections.venueId, venueId))
      .limit(1);

    const row = rows[0];
    if (!row?.xeroAccessToken || !row.xeroRefreshToken) {
      return null;
    }
    return mapRow(row);
  },

  async updateTokens(
    appDb: AppDb,
    venueId: string,
    tokens: {
      xeroAccessToken: string;
      xeroRefreshToken: string;
      tokenExpiresAt: string;
      updatedAt: string;
    },
  ): Promise<void> {
    await appDb.admin
      .update(venueXeroConnections)
      .set({
        xeroAccessToken: tokens.xeroAccessToken,
        xeroRefreshToken: tokens.xeroRefreshToken,
        tokenExpiresAt: tokens.tokenExpiresAt,
        updatedAt: tokens.updatedAt,
      })
      .where(eq(venueXeroConnections.venueId, venueId));
  },
};
