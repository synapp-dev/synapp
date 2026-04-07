/**
 * Upserts per-week availability for every staff member at the Richmond venue for April 2026
 * (weeks whose Monday falls in late March–early May but cover April).
 *
 * Run from apps/supersolt: pnpm seed:richmond-april-weeks
 * Requires SUPABASE_SERVICE_ROLE_KEY + NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL).
 */

import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
config({ path: resolve(__dirname, "../.env.local") });
config({ path: resolve(__dirname, "../.env") });

/** ISO Mondays for roster weeks that overlap April 2026. */
const APRIL_2026_WEEK_MONDAYS = [
  "2026-03-30",
  "2026-04-06",
  "2026-04-13",
  "2026-04-20",
  "2026-04-27",
] as const;

function patternFor(userId: string, weekStart: string): boolean[] {
  let h = 0;
  const s = userId + weekStart;
  for (let i = 0; i < s.length; i += 1) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  }
  h = Math.abs(h);
  const days = [true, true, true, true, true, true, true];
  const a = h % 7;
  const b = (h >> 5) % 7;
  days[a] = false;
  if (b !== a) days[b] = false;
  return days;
}

function getSupabaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ||
    process.env.SUPABASE_URL?.trim() ||
    ""
  );
}

function getServiceRoleKey(): string {
  return process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || "";
}

async function main() {
  const url = getSupabaseUrl();
  const serviceKey = getServiceRoleKey();
  if (!url || !serviceKey) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL) or SUPABASE_SERVICE_ROLE_KEY.");
    process.exit(1);
  }

  const admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: exact, error: e1 } = await admin
    .from("venues")
    .select("id, organisation_id, slug, name")
    .eq("slug", "richmond")
    .eq("is_active", true)
    .is("archived_at", null)
    .maybeSingle();

  let venue = exact;
  if (!venue && !e1) {
    const { data: fuzzy } = await admin
      .from("venues")
      .select("id, organisation_id, slug, name")
      .ilike("slug", "%richmond%")
      .eq("is_active", true)
      .is("archived_at", null)
      .limit(1)
      .maybeSingle();
    venue = fuzzy ?? null;
  }

  if (e1) {
    console.error("Venue query failed:", e1.message);
    process.exit(1);
  }

  if (!venue) {
    console.error('No active venue with slug "richmond" (or slug containing "richmond").');
    process.exit(1);
  }

  console.log(`Using venue "${venue.name}" (${venue.slug})`);

  const { data: links, error: linkErr } = await admin
    .from("user_venues")
    .select("organisation_id, user_organisations!inner(user_profile_id)")
    .eq("venue_id", venue.id)
    .eq("is_active", true)
    .is("archived_at", null);

  if (linkErr) {
    console.error("user_venues:", linkErr.message);
    process.exit(1);
  }

  const staffIds = new Set<string>();
  for (const row of links ?? []) {
    const uo = row.user_organisations as
      | { user_profile_id: string }
      | { user_profile_id: string }[]
      | null
      | undefined;
    const uid = Array.isArray(uo) ? uo[0]?.user_profile_id : uo?.user_profile_id;
    if (uid) staffIds.add(uid);
  }

  if (staffIds.size === 0) {
    console.log("No staff assigned to this venue.");
    return;
  }

  const rows: Array<{
    organisation_id: string;
    venue_id: string;
    user_profile_id: string;
    week_start_monday: string;
    day_of_week: number;
    is_available: boolean;
  }> = [];

  for (const week of APRIL_2026_WEEK_MONDAYS) {
    for (const uid of staffIds) {
      const pat = patternFor(uid, week);
      for (let d = 0; d < 7; d += 1) {
        rows.push({
          organisation_id: venue.organisation_id,
          venue_id: venue.id,
          user_profile_id: uid,
          week_start_monday: week,
          day_of_week: d,
          is_available: pat[d]!,
        });
      }
    }
  }

  const { error: upErr } = await admin.from("venue_staff_week_instance_availability").upsert(rows, {
    onConflict: "venue_id,user_profile_id,week_start_monday,day_of_week",
  });

  if (upErr) {
    console.error("upsert venue_staff_week_instance_availability:", upErr.message);
    process.exit(1);
  }

  console.log(
    `Upserted ${rows.length} rows (${staffIds.size} staff × ${APRIL_2026_WEEK_MONDAYS.length} weeks × 7 days).`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
