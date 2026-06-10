/**
 * One-off backfill for the players registry.
 *
 *  - Seeds a players row for every known steam_profiles entry.
 *  - Links players.user_profile_id for every user_profiles row that already has
 *    a steam_profile_id.
 *
 * Run: pnpm --filter intradark backfill:players
 */
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_ADMIN_KEY;

if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_ADMIN_KEY");
  process.exit(1);
}

const admin = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main(): Promise<void> {
  // 1. Seed players from steam_profiles.
  const { data: steamProfiles, error: spErr } = await admin
    .from("steam_profiles")
    .select("steamid64");
  if (spErr) throw new Error(spErr.message);

  for (const sp of steamProfiles ?? []) {
    const { error } = await admin
      .from("players")
      .upsert({ steamid64: sp.steamid64 }, { onConflict: "steamid64" });
    if (error) console.error(`seed ${sp.steamid64}:`, error.message);
  }
  console.log(`Seeded ${steamProfiles?.length ?? 0} players from steam_profiles`);

  // 2. Link accounts that already have a steam_profile_id.
  const { data: profiles, error: upErr } = await admin
    .from("user_profiles")
    .select("id, steam_profile_id")
    .not("steam_profile_id", "is", null);
  if (upErr) throw new Error(upErr.message);

  let linked = 0;
  for (const p of profiles ?? []) {
    if (p.steam_profile_id == null) continue;
    const { error } = await admin
      .from("players")
      .upsert(
        { steamid64: p.steam_profile_id, user_profile_id: p.id },
        { onConflict: "steamid64" },
      );
    if (error) {
      console.error(`link ${p.steam_profile_id}:`, error.message);
    } else {
      linked += 1;
    }
  }
  console.log(`Linked ${linked} player(s) to intradark accounts`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
