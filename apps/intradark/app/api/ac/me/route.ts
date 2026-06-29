import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";

import { resolveDevice } from "@/lib/ac/device-auth";
import { db } from "@/server/db/drizzle";
import { steamProfiles, userProfiles } from "@/server/db/schema";
import { createAdminClient } from "@/utils/supabase/admin";

/**
 * The paired user's identity for the AC client UI (username / avatar / email).
 * Authenticated by the device token. Pulls display fields from user_profiles +
 * steam_profiles; falls back to the auth email when the profile email is empty.
 */
export async function GET(req: Request) {
  const auth = await resolveDevice(req.headers.get("authorization"));
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
  }

  try {
    const [prof] = await db
      .select({
        username: userProfiles.username,
        displayName: userProfiles.displayName,
        avatarUrl: userProfiles.avatarUrl,
        email: userProfiles.email,
        steamid64: userProfiles.steamProfileId,
        personaname: steamProfiles.personaname,
        steamAvatar: steamProfiles.avatarfull,
      })
      .from(userProfiles)
      .leftJoin(
        steamProfiles,
        eq(steamProfiles.steamid64, userProfiles.steamProfileId),
      )
      .where(eq(userProfiles.userId, auth.userId))
      .limit(1);

    let email = prof?.email ?? null;
    if (!email) {
      try {
        const admin = createAdminClient();
        const { data } = await admin.auth.admin.getUserById(auth.userId);
        email = data.user?.email ?? null;
      } catch {
        // ignore — email is best-effort
      }
    }

    return NextResponse.json({
      ok: true,
      username:
        prof?.displayName ?? prof?.personaname ?? prof?.username ?? "Player",
      avatarUrl: prof?.steamAvatar ?? prof?.avatarUrl ?? null,
      email,
      steamid64: prof?.steamid64 ?? null,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("[ac/me]", message);
    return NextResponse.json({ ok: false, error: "Lookup failed" }, { status: 500 });
  }
}
