import type { LeetifyView } from "@/entities/players/lib/parse-leetify";

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

/**
 * Normalized Leetify view rendered by the player profile. Derived from the
 * Leetify web app API (`api.cs-prod.leetify.com/api/profile/id/{steamid64}`).
 * See `normalizeLeetify` in `parse-leetify.ts`.
 */
export type LeetifyProfile = LeetifyView;

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
