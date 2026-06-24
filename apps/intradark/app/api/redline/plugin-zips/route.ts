import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

import { guardRedlineRoute } from "@/entities/redline/lib/guard";

/**
 * GET /api/redline/plugin-zips
 * Lists the plugin overlay zips in the public `cs2-plugins` bucket so the
 * provision UI can offer them as a ZIP_URL dropdown. The bucket is the single
 * source of truth — `scripts/package-cs2-plugins.mjs --upload` populates it.
 * Gated by the same `sandbox.access` capability as the rest of /api/redline/*.
 */

const BUCKET = "cs2-plugins";

export type PluginZip = {
  name: string;
  url: string;
  /** Parsed from the filename: `deathmatch` | `pug` | etc. */
  kind: string;
  /** Parsed from the filename: the trailing version tag. */
  version: string;
  size: number | null;
  updatedAt: string | null;
};

/** `deathmatch-20260624-2142.zip` → { kind: "deathmatch", version: "20260624-2142" }. */
function parseName(name: string): { kind: string; version: string } {
  const base = name.replace(/\.zip$/i, "");
  const dash = base.indexOf("-");
  if (dash === -1) return { kind: base, version: "" };
  return { kind: base.slice(0, dash), version: base.slice(dash + 1) };
}

export async function GET() {
  const denied = await guardRedlineRoute();
  if (denied) return denied;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_ADMIN_KEY;
  if (!url || !serviceKey) {
    return NextResponse.json({ configured: false, zips: [] });
  }

  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await admin.storage.from(BUCKET).list("", {
    limit: 100,
    sortBy: { column: "name", order: "desc" },
  });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 502 });
  }

  const zips: PluginZip[] = (data ?? [])
    .filter((o) => o.name.toLowerCase().endsWith(".zip"))
    .map((o) => {
      const { kind, version } = parseName(o.name);
      return {
        name: o.name,
        url: admin.storage.from(BUCKET).getPublicUrl(o.name).data.publicUrl,
        kind,
        version,
        size: (o.metadata as { size?: number } | null)?.size ?? null,
        updatedAt: o.updated_at ?? null,
      };
    });

  return NextResponse.json({ configured: true, zips });
}
