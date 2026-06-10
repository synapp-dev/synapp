/**
 * Seed steam_profiles for Steam auth.
 * Run from repo root: pnpm --filter intradark run seed
 * Or from apps/intradark: pnpm run seed
 *
 * Loads .env by default. For .env.local: dotenv -e .env.local -- pnpm run seed
 * Requires: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */

import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../types/supabase";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error(
    "Missing env: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required."
  );
  process.exit(1);
}

const admin = createClient<Database>(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const STEAM_PROFILES_SEED: Database["public"]["Tables"]["steam_profiles"]["Insert"][] = [
  {
    steamid64: "76561198000000000",
    steamid: "76561198000000000",
    personaname: "Test Steam User",
    profileurl: "https://steamcommunity.com/profiles/76561198000000000",
    avatar:
      "https://avatars.steamstatic.com/fef49e7fa7e1997310d705b2a6158ff8dc1cdfeb.jpg",
    avatarmedium:
      "https://avatars.steamstatic.com/fef49e7fa7e1997310d705b2a6158ff8dc1cdfeb_medium.jpg",
    avatarfull:
      "https://avatars.steamstatic.com/fef49e7fa7e1997310d705b2a6158ff8dc1cdfeb_full.jpg",
    personastate: 0,
    communityvisibilitystate: 3,
    profilestate: 1,
    commentpermission: 0,
  },
];

async function seedSteamTables() {
  console.log("🌱 Seeding Steam auth tables...");

  try {
    // Seed steam_profiles
    console.log("📦 Seeding steam_profiles...");
    const { error: steamError } = await admin
      .from("steam_profiles")
      .upsert(STEAM_PROFILES_SEED, { onConflict: "steamid64" });

    if (steamError) {
      console.error("steam_profiles seed error:", steamError);
      throw steamError;
    }
    console.log(`✅ Seeded ${STEAM_PROFILES_SEED.length} steam_profile(s)`);

    console.log("🎉 Steam tables seeding completed.");
    console.log(
      "   user_profiles are created by the trigger on auth.users insert (no seed needed)."
    );
  } catch (error) {
    console.error("💥 Seed failed:", error);
    process.exit(1);
  }
}

seedSteamTables()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
