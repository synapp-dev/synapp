import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";

import { resolveDevice } from "@/lib/ac/device-auth";
import { db } from "@/server/db/drizzle";
import { acSignatures } from "@/server/db/schema";

/**
 * Server-delivered signature bundle. The client fetches this per session and matches
 * its system scan against it locally (the client is dumb; the server owns detection
 * logic — §Q3). `version` lets the client skip re-fetching when nothing changed.
 *
 * Authenticated by the device token. The actual *evaluation* of what's suspicious
 * stays server-side; this just ships the match list.
 */
export async function GET(req: Request) {
  const auth = await resolveDevice(req.headers.get("authorization"));
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
  }

  try {
    const sigs = await db
      .select({
        kind: acSignatures.kind,
        value: acSignatures.value,
        severity: acSignatures.severity,
        label: acSignatures.label,
        updatedAt: acSignatures.updatedAt,
      })
      .from(acSignatures)
      .where(eq(acSignatures.enabled, true));

    // Cheap version stamp: count + newest update. Changes whenever the enabled set
    // or any row's content changes, so the client can short-circuit unchanged fetches.
    const newest = sigs.reduce<string>(
      (max, s) => (s.updatedAt > max ? s.updatedAt : max),
      "",
    );
    const version = `${sigs.length}:${newest}`;

    return NextResponse.json({
      ok: true,
      version,
      signatures: sigs.map(({ kind, value, severity, label }) => ({
        kind,
        value,
        severity,
        label,
      })),
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("[ac/signatures]", message);
    return NextResponse.json({ ok: false, error: "Fetch failed" }, { status: 500 });
  }
}
