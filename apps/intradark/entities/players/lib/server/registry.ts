/**
 * Server-only helpers for the `players` registry and account mapping.
 * All writes use the Supabase admin (service-role) client.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";
import {
  playerSocialLinksFromRow,
  type PlayerSocialLinks,
} from "@/entities/players/lib/social-links";

type Admin = SupabaseClient<Database>;

export interface LinkedAccount {
  userProfileId: string;
  username: string | null;
  displayName: string | null;
  firstName: string | null;
  lastName: string | null;
  anthemUrl: string | null;
  socialLinks: PlayerSocialLinks;
}

/**
 * Ensure a `players` registry row exists for this steamid64. Also attempts to
 * link it to an intradark account (by matching user_profiles.steam_profile_id).
 * Returns the linked account, if any.
 */
export async function ensurePlayer(
  admin: Admin,
  steamid64: string,
  extra?: {
    steamVanity?: string | null;
    faceitNickname?: string | null;
    faceitPlayerId?: string | null;
    /** ISO 3166-1 alpha-2 for country-flag-icons (e.g. AU, NZ). */
    countryFlag?: string | null;
  },
): Promise<LinkedAccount | null> {
  await admin
    .from("players")
    .upsert(
      {
        steamid64,
        steam_vanity: extra?.steamVanity ?? undefined,
        faceit_nickname: extra?.faceitNickname ?? undefined,
        faceit_player_id: extra?.faceitPlayerId ?? undefined,
        country_flag: extra?.countryFlag ?? undefined,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "steamid64" },
    );

  return mapAccountBySteamId(admin, steamid64);
}

/**
 * If a user_profiles row has this steamid64 as its steam_profile_id, set the
 * players.user_profile_id mapping and return the linked account.
 */
export async function mapAccountBySteamId(
  admin: Admin,
  steamid64: string,
): Promise<LinkedAccount | null> {
  const { data: profile } = await admin
    .from("user_profiles")
    .select(
      "id, username, display_name, first_name, last_name, anthem_url, twitch_url, x_url, instagram_url",
    )
    .eq("steam_profile_id", steamid64)
    .maybeSingle();

  if (!profile) return null;

  // Write-once: only set the bond when unset, so an authenticated Steam ←→
  // intradark link can never be overwritten by the resolver. The source of
  // truth is user_profiles.steam_profile_id (set at Steam login); this column
  // is a denormalized cache of it.
  await admin
    .from("players")
    .update({ user_profile_id: profile.id, updated_at: new Date().toISOString() })
    .eq("steamid64", steamid64)
    .is("user_profile_id", null);

  return {
    userProfileId: profile.id,
    username: profile.username ?? null,
    displayName: profile.display_name ?? null,
    firstName: profile.first_name ?? null,
    lastName: profile.last_name ?? null,
    anthemUrl: profile.anthem_url ?? null,
    socialLinks: playerSocialLinksFromRow(profile),
  };
}

/** Mark the registry row as freshly fetched (drives staleness checks). */
export async function touchPlayerFetched(
  admin: Admin,
  steamid64: string,
): Promise<void> {
  await admin
    .from("players")
    .update({ last_fetched_at: new Date().toISOString() })
    .eq("steamid64", steamid64);
}

/** Look up the linked intradark username for a steamid64, if any. */
export async function getLinkedUsername(
  admin: Admin,
  steamid64: string,
): Promise<string | null> {
  const { data } = await admin
    .from("players")
    .select("user_profile_id, user_profiles:user_profile_id(username)")
    .eq("steamid64", steamid64)
    .maybeSingle();

  const joined = data?.user_profiles as { username: string | null } | null | undefined;
  return joined?.username ?? null;
}
