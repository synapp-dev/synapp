import { eq } from "drizzle-orm";

import type { AppDb } from "@/server/db/create-app-db";
import {
  organisations,
  venueSquareConnections,
  venueXeroConnections,
} from "@/server/db/schema";

/**
 * Test-run onboarding: a venue in a test organisation "connects" Square/Xero
 * by mirroring the connection of a real source venue instead of running OAuth.
 *
 * The mirror row copies identifiers (merchant/tenant, environment, location)
 * so status endpoints report connected, but holds empty placeholder tokens —
 * the connection loaders delegate token reads to the source venue's row, and
 * token refresh always writes back to the source row. That keeps a single
 * refresh chain per OAuth grant (critical for Xero, whose refresh tokens
 * rotate on every use).
 *
 * Everything here is inert unless TEST_MODE_SOURCE_VENUE_ID is set for the
 * environment, so production behaviour is unchanged by default and the
 * mirror_source_venue_id migration is only required once the flag is set.
 */
export function getTestModeSourceVenueId(): string | null {
  const value = process.env.TEST_MODE_SOURCE_VENUE_ID?.trim();
  return value ? value : null;
}

export function isTestModeConfigured(): boolean {
  return getTestModeSourceVenueId() !== null;
}

export async function isTestRunOrganisation(
  appDb: AppDb,
  organisationId: string,
): Promise<boolean> {
  const rows = await appDb.admin
    .select({ setupProgress: organisations.setupProgress })
    .from(organisations)
    .where(eq(organisations.id, organisationId))
    .limit(1);
  const progress = rows[0]?.setupProgress;
  if (!progress || typeof progress !== "object") {
    return false;
  }
  return (progress as { isTestRun?: unknown }).isTestRun === true;
}

export type TestMirrorConnectResult =
  | { ok: true }
  | { ok: false; code: "test_source_missing" };

export async function connectTestMirrorSquare(
  appDb: AppDb,
  args: { venueId: string; organisationId: string; sourceVenueId: string },
): Promise<TestMirrorConnectResult> {
  const rows = await appDb.admin
    .select({
      squareMerchantId: venueSquareConnections.squareMerchantId,
      squareAccessToken: venueSquareConnections.squareAccessToken,
      environment: venueSquareConnections.environment,
      squareLocationId: venueSquareConnections.squareLocationId,
      mirrorSourceVenueId: venueSquareConnections.mirrorSourceVenueId,
    })
    .from(venueSquareConnections)
    .where(eq(venueSquareConnections.venueId, args.sourceVenueId))
    .limit(1);

  const source = rows[0];
  // A mirror can only point at a venue with a real grant — no chaining.
  if (!source?.squareAccessToken || source.mirrorSourceVenueId) {
    return { ok: false, code: "test_source_missing" };
  }

  const nowIso = new Date().toISOString();
  const mirrorRow = {
    squareMerchantId: source.squareMerchantId,
    squareAccessToken: "",
    squareRefreshToken: "",
    tokenExpiresAt: null,
    environment: source.environment,
    squareLocationId: source.squareLocationId,
    mirrorSourceVenueId: args.sourceVenueId,
    updatedAt: nowIso,
  };
  await appDb.admin
    .insert(venueSquareConnections)
    .values({
      venueId: args.venueId,
      organisationId: args.organisationId,
      ...mirrorRow,
    })
    .onConflictDoUpdate({
      target: venueSquareConnections.venueId,
      set: mirrorRow,
    });

  return { ok: true };
}

export async function connectTestMirrorXero(
  appDb: AppDb,
  args: { venueId: string; organisationId: string; sourceVenueId: string },
): Promise<TestMirrorConnectResult> {
  const rows = await appDb.admin
    .select({
      xeroTenantId: venueXeroConnections.xeroTenantId,
      xeroTenantName: venueXeroConnections.xeroTenantName,
      xeroAccessToken: venueXeroConnections.xeroAccessToken,
      mirrorSourceVenueId: venueXeroConnections.mirrorSourceVenueId,
    })
    .from(venueXeroConnections)
    .where(eq(venueXeroConnections.venueId, args.sourceVenueId))
    .limit(1);

  const source = rows[0];
  if (!source?.xeroAccessToken || source.mirrorSourceVenueId) {
    return { ok: false, code: "test_source_missing" };
  }

  const nowIso = new Date().toISOString();
  const mirrorRow = {
    xeroTenantId: source.xeroTenantId,
    xeroTenantName: source.xeroTenantName,
    xeroAccessToken: "",
    xeroRefreshToken: "",
    tokenExpiresAt: null,
    updatedAt: nowIso,
  };
  await appDb.admin
    .insert(venueXeroConnections)
    .values({
      venueId: args.venueId,
      organisationId: args.organisationId,
      mirrorSourceVenueId: args.sourceVenueId,
      ...mirrorRow,
    })
    .onConflictDoUpdate({
      target: venueXeroConnections.venueId,
      set: { ...mirrorRow, mirrorSourceVenueId: args.sourceVenueId },
    });

  return { ok: true };
}
