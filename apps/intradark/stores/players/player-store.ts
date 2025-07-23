import { create } from "zustand";
import { useEffect } from "react";

import type { PlayerData } from "@/hooks/players/queries/read";
import { useGetPlayerByVanityUrl } from "@/hooks/players/queries/read";
import {
  useSteamProfile,
  useLeetifyProfile,
  useCSStatsProfile,
} from "@/hooks/players/queries/read";
import { useFaceitProfile } from "@/hooks/players/queries/read";

// --- Types ---
type PlayerStore = {
  players: Record<string, PlayerData>;
  selectedPlayer: PlayerData | null;
  setSelectedPlayer: (player: PlayerData | null) => void;
  updatePlayer: (steamId64: string, data: Partial<PlayerData>) => void;
  getPlayer: (steamId64: string) => PlayerData | null;
  clearPlayers: () => void;
  loading: {
    steam: boolean;
    leetify: boolean;
    faceit: boolean;
    csstats: boolean;
  };
  error: {
    steam: string | null;
    leetify: string | null;
    faceit: string | null;
    csstats: string | null;
  };
  setLoading: (service: keyof PlayerStore["loading"], value: boolean) => void;
  setError: (service: keyof PlayerStore["error"], value: string | null) => void;
};

export const usePlayerStore = create<PlayerStore>((set, get) => ({
  players: {},
  selectedPlayer: null,
  setSelectedPlayer: (player) => set({ selectedPlayer: player }),
  updatePlayer: (steamId64, data) =>
    set((state) => ({
      players: {
        ...state.players,
        [steamId64]: {
          steamId64,
          vanityUrl: state.players[steamId64]?.vanityUrl || "",
          faceitUsername: state.players[steamId64]?.faceitUsername || "",
          leetifyUsername: state.players[steamId64]?.leetifyUsername || "",
          steamProfile: state.players[steamId64]?.steamProfile || null,
          leetifyProfile: state.players[steamId64]?.leetifyProfile || null,
          faceitProfile: state.players[steamId64]?.faceitProfile || null,
          csstatsProfile: state.players[steamId64]?.csstatsProfile || null,
          ...data,
          lastUpdated: Date.now(),
        } as PlayerData,
      },
    })),
  getPlayer: (steamId64) => get().players[steamId64] || null,
  clearPlayers: () => set({ players: {}, selectedPlayer: null }),
  loading: {
    steam: false,
    leetify: false,
    faceit: false,
    csstats: false,
  },
  error: {
    steam: null,
    leetify: null,
    faceit: null,
    csstats: null,
  },
  setLoading: (service, value) =>
    set((state) => ({
      loading: { ...state.loading, [service]: value },
    })),
  setError: (service, value) =>
    set((state) => ({
      error: { ...state.error, [service]: value },
    })),
}));

// Main hook for getting player data by vanity URL or Steam ID64
export function usePlayerByVanityUrl(input: string) {
  const { setSelectedPlayer, updatePlayer, setLoading, setError, getPlayer } =
    usePlayerStore();

  // 1. Fetch base player info
  const queryResult = useGetPlayerByVanityUrl(input);

  // 2. Fetch Steam, Leetify, CSStats in parallel (if steamId64 available)
  const steamId64 = queryResult.data?.data?.steamId64;

  // --- Loading/Error for Steam ---
  const {
    profile: steamProfile,
    isLoading: steamLoading,
    error: steamError,
    refetch: refetchSteam,
  } = useSteamProfile(steamId64 || "");
  // --- Loading/Error for Leetify ---
  const {
    profile: leetifyProfile,
    isLoading: leetifyLoading,
    error: leetifyError,
    refetch: refetchLeetify,
  } = useLeetifyProfile(steamId64 || "");
  // --- Loading/Error for CSStats ---
  const {
    profile: csstatsProfile,
    isLoading: csstatsLoading,
    error: csstatsError,
    refetch: refetchCSStats,
  } = useCSStatsProfile(steamId64 || "");
  // --- Faceit depends on Leetify ---
  const faceitNickname = leetifyProfile?.meta?.faceitNickname;
  const {
    profile: faceitProfile,
    isLoading: faceitLoading,
    error: faceitError,
    refetch: refetchFaceit,
  } = useFaceitProfile(steamId64 || "", faceitNickname || "");

  // --- Update Zustand loading/error states ---
  // Steam
  useEffect(() => {
    setLoading("steam", steamLoading);
    setError("steam", steamError ? String(steamError) : null);
  }, [steamLoading, steamError, setLoading, setError]);
  // Leetify
  useEffect(() => {
    setLoading("leetify", leetifyLoading);
    setError("leetify", leetifyError ? String(leetifyError) : null);
  }, [leetifyLoading, leetifyError, setLoading, setError]);
  // CSStats
  useEffect(() => {
    setLoading("csstats", csstatsLoading);
    setError("csstats", csstatsError ? String(csstatsError) : null);
  }, [csstatsLoading, csstatsError, setLoading, setError]);
  // Faceit
  useEffect(() => {
    setLoading("faceit", faceitLoading);
    setError("faceit", faceitError ? String(faceitError) : null);
  }, [faceitLoading, faceitError, setLoading, setError]);

  // --- Store updates for player data ---
  useEffect(() => {
    if (queryResult.data?.success && queryResult.data.data) {
      updatePlayer(queryResult.data.data.steamId64, queryResult.data.data);
      setSelectedPlayer(queryResult.data.data);
    }
  }, [queryResult.data, updatePlayer, setSelectedPlayer]);

  useEffect(() => {
    if (steamId64 && leetifyProfile) {
      updatePlayer(steamId64, { leetifyProfile });
    }
  }, [steamId64, leetifyProfile, updatePlayer]);

  useEffect(() => {
    if (steamId64 && steamProfile) {
      updatePlayer(steamId64, { steamProfile });
    }
  }, [steamId64, steamProfile, updatePlayer]);

  useEffect(() => {
    if (steamId64 && csstatsProfile) {
      updatePlayer(steamId64, { csstatsProfile });
    }
  }, [steamId64, csstatsProfile, updatePlayer]);

  useEffect(() => {
    if (steamId64 && faceitProfile) {
      updatePlayer(steamId64, { faceitProfile });
    }
  }, [steamId64, faceitProfile, updatePlayer]);

  // --- Compose return object ---
  // Get the player from the store (will be updated by effects)
  const player = steamId64 ? getPlayer(steamId64) : null;

  // Combined loading: any service or base query is loading
  const isLoading =
    queryResult.isLoading ||
    steamLoading ||
    leetifyLoading ||
    faceitLoading ||
    csstatsLoading;

  // Combined error: base query or any service error
  const error =
    queryResult.error?.message ||
    steamError ||
    leetifyError ||
    faceitError ||
    csstatsError ||
    (queryResult.data && !queryResult.data.success && queryResult.data.error) ||
    null;

  // Combined refetch: refetch all queries
  const refetch = () => {
    queryResult.refetch();
    refetchSteam();
    refetchLeetify();
    refetchFaceit();
    refetchCSStats();
  };

  return {
    player,
    isLoading,
    error,
    refetch,
    // Individual service states for advanced usage
    steamProfileData: steamProfile,
    steamProfileLoading: steamLoading,
    steamProfileError: steamError,
    leetifyProfileData: leetifyProfile,
    leetifyProfileLoading: leetifyLoading,
    leetifyProfileError: leetifyError,
    faceitProfileData: faceitProfile,
    faceitProfileLoading: faceitLoading,
    faceitProfileError: faceitError,
    csstatsProfileData: csstatsProfile,
    csstatsProfileLoading: csstatsLoading,
    csstatsProfileError: csstatsError,
  };
}

// Individual service hooks for independent usage
export {
  useSteamProfile,
  useLeetifyProfile,
  useFaceitProfile,
  useCSStatsProfile,
} from "@/hooks/players/queries/read";
