import "server-only";

import { and, eq, isNull } from "drizzle-orm";

import { hashDeviceToken, parseBearer } from "@/lib/ac/device-token";
import { db } from "@/server/db/drizzle";
import { acDevices } from "@/server/db/schema";

/**
 * Resolve the calling AC client from its `Authorization: Bearer <device-token>` header.
 * Looks the token hash up in ac_devices (active, non-revoked) and returns the owning
 * account. Mirrors the fail-closed posture of lib/cs2-ingest-auth, but per-device.
 */
export type DeviceAuth =
  | { ok: true; deviceId: string; userId: string }
  | { ok: false; status: 401; error: string };

export async function resolveDevice(authHeader: string | null): Promise<DeviceAuth> {
  const token = parseBearer(authHeader);
  if (!token) return { ok: false, status: 401, error: "Unauthorized" };

  const tokenHash = hashDeviceToken(token);
  const rows = await db
    .select({ id: acDevices.id, userId: acDevices.userId })
    .from(acDevices)
    .where(and(eq(acDevices.tokenHash, tokenHash), isNull(acDevices.revokedAt)))
    .limit(1);

  const device = rows[0];
  if (!device) return { ok: false, status: 401, error: "Unauthorized" };

  // Touch last_seen (best-effort; never fail the request on this).
  try {
    await db
      .update(acDevices)
      .set({ lastSeenAt: new Date().toISOString() })
      .where(eq(acDevices.id, device.id));
  } catch {
    // ignore
  }

  return { ok: true, deviceId: device.id, userId: device.userId };
}
