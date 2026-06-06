import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";

import { usePlayerStore } from "@/entities/players/model/player-store";
import type {
  CSStatsProfile,
  FaceitProfile,
  LeetifyProfile,
  PlayerByVanityUrlResponse,
  PlayerData,
  SteamProfile,
} from "@/entities/players/lib/types";

export type {
  CSStatsProfile,
  FaceitProfile,
  LeetifyProfile,
  PlayerByVanityUrlResponse,
  PlayerData,
  SteamProfile,
} from "@/entities/players/lib/types";

function isSteamId64(input: string): boolean {
  return /^\d{17}$/.test(input);
}

export function useGetPlayerByVanityUrl(input: string) {
  return useQuery<PlayerByVanityUrlResponse, Error>({
    queryKey: ["players", "input", input],
    queryFn: async () => {
      let steamId64: string;
      let vanityUrl: string;

      if (isSteamId64(input)) {
        steamId64 = input;
        vanityUrl = "";
      } else {
        const vanityResponse = await fetch(
          `/api/steam/vanity-to-id64/[id]?vanityUrl=${encodeURIComponent(input)}`,
        );

        if (!vanityResponse.ok) {
          const errorData = await vanityResponse.json();
          throw new Error(
            errorData.error || "Failed to resolve Steam vanity URL",
          );
        }

        const vanityData = await vanityResponse.json();

        if (!vanityData.success || !vanityData.data) {
          throw new Error("Invalid Steam vanity URL");
        }

        steamId64 = vanityData.data;
        vanityUrl = input;
      }

      const playerData: PlayerData = {
        steamId64,
        vanityUrl,
        steamProfile: null,
        leetifyProfile: null,
        faceitProfile: null,
        csstatsProfile: null,
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
  steamId64: string | undefined,
  options = {},
) {
  return useQuery<FaceitProfile, Error>({
    queryKey: ["players", "faceit", steamId64],
    queryFn: async () => {
      if (!steamId64) throw new Error("No Steam ID64 provided");
      const response = await fetch(`/api/faceit/profile/${steamId64}`);
      if (!response.ok) {
        throw new Error("Failed to fetch Faceit profile");
      }
      return response.json();
    },
    enabled: !!steamId64,
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

export function useFaceitProfile(steamId64: string) {
  const { updatePlayer, setLoading, setError } = usePlayerStore();
  const query = useGetFaceitProfile(steamId64, {
    enabled: !!steamId64,
  });

  useEffect(() => {
    if (!steamId64) return;

    setLoading("faceit", query.isLoading);
    setError("faceit", query.error?.message || null);

    if (query.data) {
      updatePlayer(steamId64, { faceitProfile: query.data });
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
