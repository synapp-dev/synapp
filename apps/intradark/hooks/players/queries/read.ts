import { useQuery } from "@tanstack/react-query";

// Type definitions
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

// Response types
export type PlayerByVanityUrlResponse = {
  success: boolean;
  data: PlayerData | null;
  error?: string;
};

// Helper function to check if input is a Steam ID64
function isSteamId64(input: string): boolean {
  return /^\d{17}$/.test(input);
}

// Main hook for getting player data by vanity URL or Steam ID64
export function useGetPlayerByVanityUrl(input: string) {
  return useQuery<PlayerByVanityUrlResponse, Error>({
    queryKey: ["players", "input", input],
    queryFn: async () => {
      let steamId64: string;
      let vanityUrl: string;

      if (isSteamId64(input)) {
        // Input is already a Steam ID64
        steamId64 = input;
        vanityUrl = ""; // We'll try to get vanity URL from Steam profile later
      } else {
        // Input is a vanity URL, resolve it to Steam ID64
        const vanityResponse = await fetch(
          `/api/steam/vanity-to-id64/[id]?vanityUrl=${encodeURIComponent(input)}`
        );

        if (!vanityResponse.ok) {
          const errorData = await vanityResponse.json();
          throw new Error(
            errorData.error || "Failed to resolve Steam vanity URL"
          );
        }

        const vanityData = await vanityResponse.json();

        if (!vanityData.success || !vanityData.data) {
          throw new Error("Invalid Steam vanity URL");
        }

        steamId64 = vanityData.data;
        vanityUrl = input;
      }

      // Return basic player data - individual services will fetch their own data
      const playerData: PlayerData = {
        steamId64,
        vanityUrl,
        steamProfile: null, // Will be fetched by useSteamProfile
        leetifyProfile: null, // Will be fetched by useLeetifyProfile
        faceitProfile: null, // Will be fetched by useFaceitProfile if needed
        csstatsProfile: null, // Will be fetched by useCSStatsProfile
        lastUpdated: Date.now(),
        faceitUsername: "",
        leetifyUsername: "",
      };

      return {
        success: true,
        data: playerData,
      };
    },
    enabled: !!input,
  });
}

// Individual profile hooks
export function useGetSteamProfile(steamId64: string) {
  return useQuery<SteamProfile, Error>({
    queryKey: ["players", "steam", steamId64],
    queryFn: async () => {
      const response = await fetch(`/api/steam/profile/${steamId64}`);
      if (!response.ok) {
        throw new Error("Failed to fetch Steam profile");
      }
      return response.json();
    },
    enabled: !!steamId64,
  });
}

export function useGetLeetifyProfile(steamId64: string) {
  return useQuery<LeetifyProfile, Error>({
    queryKey: ["players", "leetify", steamId64],
    queryFn: async () => {
      const response = await fetch(`/api/leetify/profile/${steamId64}`);
      if (!response.ok) {
        throw new Error("Failed to fetch Leetify profile");
      }
      return response.json();
    },
    enabled: !!steamId64,
  });
}

export function useGetFaceitProfile(
  faceitNickname: string | undefined,
  options = {}
) {
  return useQuery<FaceitProfile, Error>({
    queryKey: ["players", "faceit", faceitNickname],
    queryFn: async () => {
      if (!faceitNickname) throw new Error("No Faceit nickname provided");
      const response = await fetch(`/api/faceit/profile/${faceitNickname}`);
      if (!response.ok) {
        throw new Error("Failed to fetch Faceit profile");
      }
      return response.json();
    },
    enabled: !!faceitNickname,
    ...options,
  });
}

export function useGetCSStatsProfile(steamId64: string) {
  return useQuery<CSStatsProfile, Error>({
    queryKey: ["players", "csstats", steamId64],
    queryFn: async () => {
      const response = await fetch(`/api/csstats/profile/${steamId64}`);
      if (!response.ok) {
        throw new Error("Failed to fetch CSStats profile");
      }
      return response.json();
    },
    enabled: !!steamId64,
  });
}

// Canonical Faceit profile hook for player store system
import { usePlayerStore } from "@/stores/players/player-store";
import { useEffect } from "react";

export function useFaceitProfile(steamId64: string, faceitNickname: string) {
  const { updatePlayer, setLoading, setError } = usePlayerStore();
  const query = useGetFaceitProfile(faceitNickname, {
    enabled: !!faceitNickname,
  });

  useEffect(() => {
    if (!faceitNickname || !steamId64) return;
    setLoading("faceit", query.isLoading);
    setError("faceit", query.error?.message || null);
    if (query.data) {
      updatePlayer(steamId64, { faceitProfile: query.data });
    }
  }, [
    query.data,
    query.isLoading,
    query.error,
    faceitNickname,
    steamId64,
    updatePlayer,
    setLoading,
    setError,
  ]);

  return {
    profile: query.data,
    isLoading: query.isLoading,
    error: query.error?.message || null,
    isError: query.isError,
    refetch: query.refetch,
  };
}

// Canonical Steam profile hook for player store system
export function useSteamProfile(steamId64: string) {
  const { updatePlayer, setLoading, setError } = usePlayerStore();
  const query = useGetSteamProfile(steamId64);

  useEffect(() => {
    if (!steamId64) return;
    setLoading("steam", query.isLoading);
    setError("steam", query.error?.message || null);
    if (query.data?.success) {
      updatePlayer(steamId64, { steamProfile: query.data });
    }
  }, [
    query.data,
    query.isLoading,
    query.error,
    steamId64,
    updatePlayer,
    setLoading,
    setError,
  ]);

  return {
    profile: query.data?.success ? query.data : null,
    isLoading: query.isLoading,
    error: query.error?.message || null,
    isError: query.isError,
    refetch: query.refetch,
  };
}

// Canonical Leetify profile hook for player store system
export function useLeetifyProfile(steamId64: string) {
  const { updatePlayer, setLoading, setError } = usePlayerStore();
  const query = useGetLeetifyProfile(steamId64);

  useEffect(() => {
    if (!steamId64) return;
    setLoading("leetify", query.isLoading);
    setError("leetify", query.error?.message || null);
    if (query.data) {
      updatePlayer(steamId64, { leetifyProfile: query.data });
    }
  }, [
    query.data,
    query.isLoading,
    query.error,
    steamId64,
    updatePlayer,
    setLoading,
    setError,
  ]);

  return {
    profile: query.data,
    isLoading: query.isLoading,
    error: query.error?.message || null,
    isError: query.isError,
    refetch: query.refetch,
  };
}

// Canonical CSStats profile hook for player store system
export function useCSStatsProfile(steamId64: string) {
  const { updatePlayer, setLoading, setError } = usePlayerStore();
  const query = useGetCSStatsProfile(steamId64);

  useEffect(() => {
    if (!steamId64) return;
    setLoading("csstats", query.isLoading);
    setError("csstats", query.error?.message || null);
    if (query.data?.success) {
      updatePlayer(steamId64, { csstatsProfile: query.data });
    }
  }, [
    query.data,
    query.isLoading,
    query.error,
    steamId64,
    updatePlayer,
    setLoading,
    setError,
  ]);

  return {
    profile: query.data?.success ? query.data : null,
    isLoading: query.isLoading,
    error: query.error?.message || null,
    isError: query.isError,
    refetch: query.refetch,
  };
}
