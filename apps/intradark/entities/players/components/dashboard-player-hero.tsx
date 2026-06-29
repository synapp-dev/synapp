"use client";

import {
  EMPTY_PLAYER_SOCIAL_LINKS,
  type PlayerSocialLinks,
} from "@/entities/players/lib/social-links";
import {
  useGetSteamProfile,
  useGetLeetifyProfile,
} from "@/entities/players/hooks/queries";
import { DashboardPlayerHeader } from "@/entities/players/components/dashboard-player-header";
import type { TeamSummary } from "@/entities/teams/types";

export interface DashboardPlayerHeroProps {
  steamid64: string;
  /** intradark username; drives the verified badge + alias precedence. */
  linkedUsername?: string | null;
  /** "First Last" from user_profiles; shown under the alias. */
  fullName?: string | null;
  /** ISO 3166-1 alpha-2 country code for the subtitle flag. */
  countryFlag?: string | null;
  /** Canonical anthem URL (Spotify or SoundCloud); null when unset. */
  anthemUrl?: string | null;
  /** Member-set social links from user_profiles. */
  socialLinks?: PlayerSocialLinks;
  /** Most recently joined team; drives header watermark + team badge. */
  team?: TeamSummary | null;
}

/**
 * The viewer's profile header, rendered as a dashboard widget. Reuses the exact
 * {@link PlayerHeader} from the player profile (Steam avatar/name + Leetify
 * Premier/pro flags live; FACEIT elo and legitimacy self-fetch), but skips the
 * anthem autoplay choreography and tabs — this is a display card, not the page.
 */
export function DashboardPlayerHero({
  steamid64,
  linkedUsername,
  fullName = null,
  countryFlag = null,
  anthemUrl = null,
  socialLinks = EMPTY_PLAYER_SOCIAL_LINKS,
  team = null,
}: DashboardPlayerHeroProps) {
  const { data } = useGetSteamProfile(steamid64);
  const { data: leetify } = useGetLeetifyProfile(steamid64);
  const steam = data?.success ? data.data : null;
  const steamName = steam?.personaname || null;

  const name = linkedUsername || steamName || steamid64;
  const premierRating = leetify?.premierRating ?? leetify?.premier ?? null;

  return (
    <DashboardPlayerHeader
      name={name}
      subtitle={fullName}
      countryFlag={countryFlag}
      avatarSrc={steam?.avatarfull || null}
      steamid64={steamid64}
      isMember={!!linkedUsername}
      premierRating={premierRating}
      csgoPro={leetify?.csgoPro ?? false}
      cs2Pro={leetify?.cs2Pro ?? false}
      anthemUrl={anthemUrl}
      socialLinks={socialLinks}
      team={team}
    />
  );
}
