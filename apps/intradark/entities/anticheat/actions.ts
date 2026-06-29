"use server";

import { and, eq, gt, isNull } from "drizzle-orm";

import { AC_ACCEPT_FRESHNESS_S } from "@/lib/ac/constants";
import { mintPairingToken } from "@/lib/ac/pairing";
import { getCurrentUserProfiles } from "@/lib/get-current-user-profiles";
import { db } from "@/server/db/drizzle";
import { acDevices, acSessions } from "@/server/db/schema";

/**
 * Anticheat client actions for the web app: mint a deep-link pairing token, and read
 * the signed-in user's AC status. See docs/anticheat-client-build-decisions.md §Q4.
 */

export type AcPairLinkResult =
  | { ok: true; url: string }
  | { ok: false; error: string };

/** Mint a short-lived pairing token and return the `intradark-ac://` deep link. */
export async function createAcPairingLink(): Promise<AcPairLinkResult> {
  const me = await getCurrentUserProfiles();
  if (!me) return { ok: false, error: "Sign in to pair a device." };
  if (!process.env.AC_PAIRING_SECRET) {
    return { ok: false, error: "Anticheat pairing isn't configured yet." };
  }
  const token = await mintPairingToken({
    userId: me.user.id,
    steamid64: me.userProfile.steam_profile_id ?? null,
  });
  return {
    ok: true,
    url: `intradark-ac://pair?token=${encodeURIComponent(token)}`,
  };
}

export type AcStatus = { paired: boolean; live: boolean };

/**
 * Whether the user has a paired device and a currently-live AC session. Degrades
 * gracefully to "not paired" if the AC tables aren't migrated yet (the feature is
 * optional and must never 500 the settings page).
 */
export async function getAcStatus(): Promise<AcStatus> {
  const me = await getCurrentUserProfiles();
  if (!me) return { paired: false, live: false };

  try {
    const devices = await db
      .select({ id: acDevices.id })
      .from(acDevices)
      .where(and(eq(acDevices.userId, me.user.id), isNull(acDevices.revokedAt)))
      .limit(1);

    const cutoff = new Date(Date.now() - AC_ACCEPT_FRESHNESS_S * 1000).toISOString();
    const live = await db
      .select({ id: acSessions.id })
      .from(acSessions)
      .where(
        and(
          eq(acSessions.userId, me.user.id),
          eq(acSessions.status, "active"),
          gt(acSessions.lastHeartbeatAt, cutoff),
        ),
      )
      .limit(1);

    return { paired: devices.length > 0, live: live.length > 0 };
  } catch (e) {
    // e.g. relation "ac_devices" does not exist (migration 0042 not applied yet).
    console.warn("[ac] getAcStatus degraded:", e instanceof Error ? e.message : e);
    return { paired: false, live: false };
  }
}
