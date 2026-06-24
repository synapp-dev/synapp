import { and, eq, isNull } from "drizzle-orm";

import {
  FaceitPlayMock,
  type PlayCardMe,
} from "@/components/organisms/faceit-play-mock";
import { DEFAULT_RATING } from "@/entities/match-queue/lib/leagues";
import { getPlayerTeamForProfile } from "@/entities/teams/lib/queries";
import { getCurrentUserProfiles } from "@/lib/get-current-user-profiles";
import { db } from "@/server/db/drizzle";
import { playerRatings, teamPositions } from "@/server/db/schema";

/**
 * Transparent full-body character renders per player (public/images/players/soldier).
 * Used as the Play-card portrait; players without one fall back to their Steam avatar.
 */
const SOLDIER_PORTRAITS: Record<string, string> = {
  "76561197998479808": "/images/players/soldier/jourdain_soldier_trans.png",
};

/** Resolve the signed-in player's Play-card data (persona, avatar, ELO, declared role). */
async function loadMe(): Promise<PlayCardMe | null> {
  const me = await getCurrentUserProfiles();
  const steamid64 = me?.userProfile.steam_profile_id;
  if (!me || !steamid64) return null;

  const [rating, position, team] = await Promise.all([
    db
      .select({ rating: playerRatings.rating })
      .from(playerRatings)
      .where(eq(playerRatings.steamid64, steamid64))
      .limit(1),
    db
      .select({ position: teamPositions.position })
      .from(teamPositions)
      .where(
        and(
          eq(teamPositions.steamid64, steamid64),
          isNull(teamPositions.matchId),
        ),
      )
      .limit(1),
    getPlayerTeamForProfile(steamid64),
  ]);

  return {
    steamid64,
    name:
      me.steamProfile?.personaname ??
      me.userProfile.display_name ??
      me.userProfile.username ??
      "Player",
    portraitUrl: SOLDIER_PORTRAITS[steamid64] ?? null,
    avatarUrl: me.steamProfile?.avatarfull ?? me.userProfile.avatar_url ?? null,
    countryCode: me.steamProfile?.loccountrycode ?? null,
    rating: rating[0]?.rating ?? DEFAULT_RATING,
    // Placeholder global account rank — no leaderboard ranking source yet (cf. role seeding).
    rank: 387,
    position: position[0]?.position ?? null,
    teamName: team?.team.name ?? null,
    teamLogoUrl: team?.team.avatar ?? null,
    teamColor: team?.team.primaryColor ?? null,
  };
}

export default async function PlayPage() {
  const me = await loadMe();
  return <FaceitPlayMock me={me} />;
}
