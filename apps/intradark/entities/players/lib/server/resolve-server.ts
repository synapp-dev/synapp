/**
 * Server-side identifier resolution: wires the pure resolver in `../resolve.ts`
 * to real DB + upstream lookups, and returns the canonical redirect target.
 */

import { createAdminClient } from "@/utils/supabase/admin";
import {
  resolveToSteamId64,
  canonicalPath,
  type ResolveLookups,
} from "@/entities/players/lib/resolve";
import {
  resolveSteamVanity,
  fetchFaceitByNickname,
  faceitSteamId64,
} from "@/entities/players/lib/server/sources";
import { ensurePlayer } from "@/entities/players/lib/server/registry";
import {
  EMPTY_PLAYER_SOCIAL_LINKS,
  type PlayerSocialLinks,
} from "@/entities/players/lib/social-links";

export interface ResolvedProfile {
  steamid64: string;
  linkedUsername: string | null;
  /** "First Last" from user_profiles; null when neither is set. */
  fullName: string | null;
  /** ISO 3166-1 alpha-2 for country-flag-icons; null when unknown. */
  countryFlag: string | null;
  /** Canonical anthem URL (Spotify or SoundCloud) set by the member; null when unset. */
  anthemUrl: string | null;
  /** Member-set social profile links; empty when unlinked or unset. */
  socialLinks: PlayerSocialLinks;
  canonical: string;
}

/**
 * Resolve any supported identifier (`@username`, steamid64, steam URL/vanity,
 * faceit nickname) to a steamid64 plus its canonical profile path.
 */
export async function resolvePlayerIdentifier(
  rawInput: string,
): Promise<ResolvedProfile | null> {
  const admin = createAdminClient();

  const lookups: ResolveLookups = {
    byUsername: async (username) => {
      const { data } = await admin
        .from("user_profiles")
        .select("steam_profile_id")
        .eq("username", username)
        .maybeSingle();
      return data?.steam_profile_id ? String(data.steam_profile_id) : null;
    },
    byVanity: (vanity) => resolveSteamVanity(vanity),
    byFaceitNickname: async (nickname) => {
      const raw = await fetchFaceitByNickname(nickname);
      return faceitSteamId64(raw);
    },
  };

  const resolved = await resolveToSteamId64(rawInput, lookups);
  if (!resolved) return null;

  // Seed the registry row and map it to an intradark account (if the steamid64
  // belongs to a member). Returns the linked account so a member's @username is
  // canonical immediately on first visit.
  const linked = await ensurePlayer(admin, resolved.steamid64);
  const linkedUsername = linked?.username ?? null;
  const fullName =
    [linked?.firstName, linked?.lastName]
      .filter((part): part is string => !!part && part.trim().length > 0)
      .join(" ")
      .trim() || null;

  const { data: playerRow } = await admin
    .from("players")
    .select("country_flag")
    .eq("steamid64", resolved.steamid64)
    .maybeSingle();

  return {
    steamid64: resolved.steamid64,
    linkedUsername,
    fullName,
    countryFlag: playerRow?.country_flag ?? null,
    anthemUrl: linked?.anthemUrl ?? null,
    socialLinks: linked?.socialLinks ?? EMPTY_PLAYER_SOCIAL_LINKS,
    canonical: canonicalPath(resolved.steamid64, linkedUsername),
  };
}
