export interface SteamProfile {
  success: boolean;
  data: {
    steamid: string;
    personaname: string;
    avatarfull: string;
    profileurl: string;
    realname?: string;
    timecreated?: number;
    lastlogoff?: number;
    player_level: number;
    friends_count: number;
  };
}

export interface LeetifyProfile {
  meta: {
    name: string;
    steamAvatarUrl: string;
    steam64Id: string;
    faceitNickname?: string;
    vanityUrl?: string;
    isProPlan: boolean;
    isLeetifyStaff: boolean;
  };
  games: Array<{
    enemyTeamSteam64Ids: string[];
    isCompletedLongMatch: boolean;
    ownTeamSteam64Ids: string[];
    ownTeamTotalLeetifyRatingRounds: Record<string, number>;
    ownTeamTotalLeetifyRatings: Record<string, number>;
    ctLeetifyRating: number;
    ctLeetifyRatingRounds: number;
    dataSource: string;
    elo: number | null;
    gameFinishedAt: string;
    gameId: string;
    isCs2: boolean;
    mapName: string;
    matchResult: string;
    rankType: number;
    scores: [number, number];
    skillLevel: number;
    tLeetifyRating: number;
    tLeetifyRatingRounds: number;
    deaths: number;
    hasBannedPlayer: boolean;
    kills: number;
    partySize: number;
  }>;

  recentGameRatings: {
    aim: number;
    positioning: number;
    utility: number;
    clutch: number;
    leetify: number;
    ctLeetify: number;
    opening: number;
    tLeetify: number;
    gamesPlayed: number;
  };
  teammates: Array<{
    steamNickname: string;
    steamAvatarUrl: string;
    matchesPlayedTogether: number;
    winRateTogether: number;
    teammateLeetifyRating: number;
  }>;
  highlights?: Array<{
    url: string;
    thumbnailUrl?: string;
    description?: string;
  }>;
}

export interface FaceitProfile {
  result: string;
  payload: {
    id: string;
    nickname: string;
    avatar: string;
    country: string;
    games: {
      cs2?: {
        faceit_elo: number;
        skill_level: number;
        skill_level_label: string;
        region: string;
      };
      csgo?: {
        faceit_elo: number;
        skill_level: number;
        skill_level_label: string;
        region: string;
      };
    };
  };
}

export interface CSStatsProfile {
  success: boolean;
  data: {
    steamId: string;
    playerName: string;
    playerAvatar: string;
    ranks: Array<{
      season: number | null;
      current: number | null;
      peak: number | null;
      last_match: string | null;
      total_wins: number;
    }>;
    url: string;
  };
}

export interface PlayerData {
  steamId64: string;
  vanityUrl: string;
  steamProfile: SteamProfile | null;
  leetifyProfile: LeetifyProfile | null;
  faceitProfile: FaceitProfile | null;
  csstatsProfile: CSStatsProfile | null;
  lastUpdated: number;
  faceitUsername?: string;
  leetifyUsername?: string;
}

export type PlayerByVanityUrlResponse = {
  success: boolean;
  data: PlayerData | null;
  error?: string;
};

export type PlayerServiceKey = "steam" | "leetify" | "faceit" | "csstats";
