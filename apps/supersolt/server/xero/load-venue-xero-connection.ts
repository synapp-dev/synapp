import type { AppDb } from "@/server/db/create-app-db";
import {
  refreshXeroAccessToken,
  tokenExpiresAtIso,
} from "@/server/xero/xero-oauth";
import {
  xeroConnectionsRepo,
  type VenueXeroConnectionRow,
} from "@/server/xero/xero-connections.repo";

export type { VenueXeroConnectionRow };

const TOKEN_REFRESH_BUFFER_MS = 5 * 60 * 1000;

function tokenNeedsRefresh(expiresAt: string | null): boolean {
  if (!expiresAt) {
    return true;
  }
  const expiresMs = new Date(expiresAt).getTime();
  if (Number.isNaN(expiresMs)) {
    return true;
  }
  return expiresMs - Date.now() < TOKEN_REFRESH_BUFFER_MS;
}

export async function loadVenueXeroConnectionForVenue(
  appDb: AppDb,
  venueId: string,
): Promise<VenueXeroConnectionRow | null> {
  return xeroConnectionsRepo.getConnectionForVenue(appDb, venueId);
}

export async function ensureVenueXeroAccessToken(
  appDb: AppDb,
  connection: VenueXeroConnectionRow,
): Promise<{ ok: true; accessToken: string } | { ok: false; message: string }> {
  if (!tokenNeedsRefresh(connection.tokenExpiresAt)) {
    return { ok: true, accessToken: connection.xeroAccessToken };
  }

  const refreshed = await refreshXeroAccessToken(connection.xeroRefreshToken);
  if (!refreshed.ok) {
    return { ok: false, message: refreshed.message };
  }

  const tokenExpires = tokenExpiresAtIso(refreshed.token.expires_in);
  const nowIso = new Date().toISOString();

  try {
    await xeroConnectionsRepo.updateTokens(appDb, connection.venueId, {
      xeroAccessToken: refreshed.token.access_token,
      xeroRefreshToken: refreshed.token.refresh_token,
      tokenExpiresAt: tokenExpires ?? new Date().toISOString(),
      updatedAt: nowIso,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Token update failed";
    return { ok: false, message };
  }

  return { ok: true, accessToken: refreshed.token.access_token };
}
