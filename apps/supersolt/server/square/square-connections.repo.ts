import { eq } from "drizzle-orm";

import type { AppDb } from "@/server/db/create-app-db";
import type { RlsTx } from "@/server/db/drizzle";
import { venueSquareConnections } from "@/server/db/schema";
import { parseSquareEnvironment } from "@/server/square/config";
import {
  refreshSquareAccessToken,
  tokenExpiresAtIso,
} from "@/server/square/square-oauth";
import { shouldRefreshSquareToken } from "@/server/square/token-freshness";
import { isTestModeConfigured } from "@/server/test-mode/test-mode";

export type SquareConnectionRow = typeof venueSquareConnections.$inferSelect;

export type SquareConnectionCredentials = {
  squareAccessToken: string;
  environment: string;
  squareLocationId: string | null;
};

export const squareConnectionsRepo = {
  async getConnectionForVenueRls(
    tx: RlsTx,
    venueId: string,
  ): Promise<SquareConnectionCredentials | null> {
    const rows = await tx
      .select({
        squareAccessToken: venueSquareConnections.squareAccessToken,
        environment: venueSquareConnections.environment,
        squareLocationId: venueSquareConnections.squareLocationId,
      })
      .from(venueSquareConnections)
      .where(eq(venueSquareConnections.venueId, venueId))
      .limit(1);

    const row = rows[0];
    if (!row?.squareAccessToken) {
      return null;
    }
    return row;
  },

  async getConnectionForVenueAdmin(
    appDb: AppDb,
    venueId: string,
  ): Promise<SquareConnectionCredentials | null> {
    const rows = await appDb.admin
      .select({
        squareAccessToken: venueSquareConnections.squareAccessToken,
        environment: venueSquareConnections.environment,
        squareLocationId: venueSquareConnections.squareLocationId,
      })
      .from(venueSquareConnections)
      .where(eq(venueSquareConnections.venueId, venueId))
      .limit(1);

    const row = rows[0];
    if (!row?.squareAccessToken) {
      return null;
    }
    return row;
  },

  async updateLocationId(
    appDb: AppDb,
    args: { venueId: string; squareLocationId: string },
  ): Promise<void> {
    await appDb.admin
      .update(venueSquareConnections)
      .set({
        squareLocationId: args.squareLocationId,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(venueSquareConnections.venueId, args.venueId));
  },

  async loadConnectionForVenue(
    appDb: AppDb,
    venueId: string,
    rlsFirst: boolean,
  ): Promise<SquareConnectionCredentials | null> {
    // Test-mode mirror rows hold no tokens; delegate to the source venue's
    // row before the empty-token check. Gated on the env flag so the
    // mirror_source_venue_id column is never queried where the migration has
    // not been applied.
    if (isTestModeConfigured()) {
      const mirrored = await loadMirroredConnectionForVenue(appDb, venueId);
      if (mirrored) return mirrored;
    }

    let credentials: SquareConnectionCredentials | null = null;
    if (rlsFirst) {
      credentials = await appDb.rls((tx) =>
        squareConnectionsRepo.getConnectionForVenueRls(tx, venueId),
      );
    }
    if (!credentials) {
      credentials = await squareConnectionsRepo.getConnectionForVenueAdmin(appDb, venueId);
    }
    if (!credentials) return null;

    return ensureFreshAccessToken(appDb, venueId, credentials);
  },
};

/**
 * Resolves a test-mode mirror row to its source venue's credentials: token and
 * environment come from the source row (refresh stays keyed to the source
 * venue, preserving a single refresh chain), while the location id prefers the
 * mirror row's own value so a test venue can be re-pointed independently.
 * Returns null when the venue's row is not a mirror.
 */
async function loadMirroredConnectionForVenue(
  appDb: AppDb,
  venueId: string,
): Promise<SquareConnectionCredentials | null> {
  const rows = await appDb.admin
    .select({
      squareLocationId: venueSquareConnections.squareLocationId,
      mirrorSourceVenueId: venueSquareConnections.mirrorSourceVenueId,
    })
    .from(venueSquareConnections)
    .where(eq(venueSquareConnections.venueId, venueId))
    .limit(1);

  const sourceVenueId = rows[0]?.mirrorSourceVenueId;
  if (!sourceVenueId) return null;

  const source = await squareConnectionsRepo.getConnectionForVenueAdmin(
    appDb,
    sourceVenueId,
  );
  if (!source) return null;

  const fresh = await ensureFreshAccessToken(appDb, sourceVenueId, source);
  return {
    squareAccessToken: fresh.squareAccessToken,
    environment: fresh.environment,
    squareLocationId: rows[0]?.squareLocationId ?? fresh.squareLocationId,
  };
}

/**
 * Rotates the access token via the stored refresh token when it is expired or
 * inside the refresh buffer, so Square API calls never run on a dead token
 * (access tokens live ~30 days; before this, nothing ever called refresh and
 * every connection silently died a month after OAuth).
 *
 * Fail-safe by construction: the connection row is only written after a fully
 * successful refresh — any failure (env mismatch, missing OAuth config,
 * network, Square error) logs and returns the stored credentials unchanged,
 * degrading to exactly the pre-refresh behaviour. The stored refresh token is
 * never cleared here, so a manual reconnect is never forced by this path.
 */
const inFlightRefreshByVenue = new Map<string, Promise<SquareConnectionCredentials>>();

async function ensureFreshAccessToken(
  appDb: AppDb,
  venueId: string,
  credentials: SquareConnectionCredentials,
): Promise<SquareConnectionCredentials> {
  const inFlight = inFlightRefreshByVenue.get(venueId);
  if (inFlight) return inFlight;

  const task = (async () => {
    try {
      const rows = await appDb.admin
        .select({
          squareRefreshToken: venueSquareConnections.squareRefreshToken,
          tokenExpiresAt: venueSquareConnections.tokenExpiresAt,
          environment: venueSquareConnections.environment,
        })
        .from(venueSquareConnections)
        .where(eq(venueSquareConnections.venueId, venueId))
        .limit(1);
      const row = rows[0];
      if (!row?.squareRefreshToken) return credentials;
      if (!shouldRefreshSquareToken(row.tokenExpiresAt, Date.now())) {
        return credentials;
      }

      // Refresh goes through the env-configured OAuth app; a token from the
      // other Square environment can't be refreshed against this base URL.
      if (parseSquareEnvironment(row.environment) !== parseSquareEnvironment(process.env.SQUARE_ENVIRONMENT)) {
        console.warn("[square-oauth] token_refresh_skipped_env_mismatch", {
          venueId,
          rowEnvironment: row.environment,
        });
        return credentials;
      }

      const refreshed = await refreshSquareAccessToken(row.squareRefreshToken);
      if (!refreshed.ok) {
        console.warn("[square-oauth] token_refresh_failed", {
          venueId,
          message: refreshed.message,
        });
        return credentials;
      }

      // Keep the old expiry if Square's response omits one — writing null
      // would read as "never expires" and permanently disable refresh here.
      const newExpiresAt = tokenExpiresAtIso(refreshed.token.expires_at);
      await appDb.admin
        .update(venueSquareConnections)
        .set({
          squareAccessToken: refreshed.token.access_token,
          squareRefreshToken: refreshed.token.refresh_token,
          squareMerchantId: refreshed.token.merchant_id,
          ...(newExpiresAt ? { tokenExpiresAt: newExpiresAt } : {}),
          updatedAt: new Date().toISOString(),
        })
        .where(eq(venueSquareConnections.venueId, venueId));

      console.info("[square-oauth] token_refreshed", {
        venueId,
        expiresAt: refreshed.token.expires_at ?? null,
      });

      return { ...credentials, squareAccessToken: refreshed.token.access_token };
    } catch (error) {
      console.warn("[square-oauth] token_refresh_errored", {
        venueId,
        message: error instanceof Error ? error.message : String(error),
      });
      return credentials;
    } finally {
      inFlightRefreshByVenue.delete(venueId);
    }
  })();

  inFlightRefreshByVenue.set(venueId, task);
  return task;
}
