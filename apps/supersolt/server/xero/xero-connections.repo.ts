import { eq } from "drizzle-orm";

import type { AppDb } from "@/server/db/create-app-db";
import { venueXeroConnections } from "@/server/db/schema";
import { isTestModeConfigured } from "@/server/test-mode/test-mode";

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

const connectionColumns = {
  venueId: venueXeroConnections.venueId,
  organisationId: venueXeroConnections.organisationId,
  xeroTenantId: venueXeroConnections.xeroTenantId,
  xeroAccessToken: venueXeroConnections.xeroAccessToken,
  xeroRefreshToken: venueXeroConnections.xeroRefreshToken,
  tokenExpiresAt: venueXeroConnections.tokenExpiresAt,
  lastInvoiceSyncAt: venueXeroConnections.lastInvoiceSyncAt,
  lastInvoiceSyncError: venueXeroConnections.lastInvoiceSyncError,
};

async function getRawConnectionForVenue(appDb: AppDb, venueId: string) {
  const rows = await appDb.admin
    .select(connectionColumns)
    .from(venueXeroConnections)
    .where(eq(venueXeroConnections.venueId, venueId))
    .limit(1);
  return rows[0] ?? null;
}

/**
 * Test-mode mirror rows hold no tokens; resolve to the source venue's row so
 * token refresh writes back to the source (single refresh chain — Xero
 * rotates refresh tokens on every use). Callers stamp sync markers with their
 * own scoped venue id, so those stay on the mirror venue. Gated on the env
 * flag so mirror_source_venue_id is never queried where the migration has not
 * been applied.
 */
async function resolveMirrorSourceVenueId(
  appDb: AppDb,
  venueId: string,
): Promise<string | null> {
  if (!isTestModeConfigured()) {
    return null;
  }
  const rows = await appDb.admin
    .select({ mirrorSourceVenueId: venueXeroConnections.mirrorSourceVenueId })
    .from(venueXeroConnections)
    .where(eq(venueXeroConnections.venueId, venueId))
    .limit(1);
  return rows[0]?.mirrorSourceVenueId ?? null;
}

export const xeroConnectionsRepo = {
  async getConnectionForVenue(
    appDb: AppDb,
    venueId: string,
  ): Promise<VenueXeroConnectionRow | null> {
    const sourceVenueId = await resolveMirrorSourceVenueId(appDb, venueId);
    const row = await getRawConnectionForVenue(appDb, sourceVenueId ?? venueId);
    if (!row?.xeroAccessToken || !row.xeroRefreshToken) {
      return null;
    }
    return row;
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
