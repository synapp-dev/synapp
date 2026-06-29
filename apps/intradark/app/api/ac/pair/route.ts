import { NextResponse } from "next/server";
import { z } from "zod";

import { generateDeviceToken, hashDeviceToken } from "@/lib/ac/device-token";
import { verifyPairingToken } from "@/lib/ac/pairing";
import { db } from "@/server/db/drizzle";
import { acDevices } from "@/server/db/schema";

/**
 * AC device pairing. The desktop client posts the short-lived pairing token it
 * received via the `intradark-ac://pair?token=…` deep link; we verify it, mint a
 * long-lived device token, store its hash in ac_devices, and return the raw token
 * ONCE (the client stows it in the OS credential vault).
 * See docs/anticheat-client-build-decisions.md §Q4.
 */

const bodySchema = z.object({
  token: z.string().min(1),
  label: z.string().max(120).optional(),
  osInfo: z.record(z.string(), z.unknown()).optional(),
});

export async function POST(req: Request) {
  // Fail closed: pairing is impossible without the signing secret.
  if (!process.env.AC_PAIRING_SECRET) {
    return NextResponse.json(
      { ok: false, error: "Pairing not configured" },
      { status: 500 },
    );
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "Invalid body", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  let claims;
  try {
    claims = await verifyPairingToken(parsed.data.token);
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid or expired pairing token" },
      { status: 401 },
    );
  }

  const deviceToken = generateDeviceToken();
  const tokenHash = hashDeviceToken(deviceToken);

  try {
    const [device] = await db
      .insert(acDevices)
      .values({
        userId: claims.userId,
        tokenHash,
        label: parsed.data.label ?? null,
        osInfo: parsed.data.osInfo ?? {},
      })
      .returning({ id: acDevices.id });

    if (!device) {
      return NextResponse.json({ ok: false, error: "Pairing failed" }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      deviceId: device.id,
      // Shown exactly once — the client must persist this securely.
      deviceToken,
      steamid64: claims.steamid64,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("[ac/pair]", message);
    return NextResponse.json({ ok: false, error: "Pairing failed" }, { status: 500 });
  }
}
