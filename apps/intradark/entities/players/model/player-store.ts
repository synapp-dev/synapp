import { create } from "zustand";

import type { PlayerData, PlayerServiceKey } from "@/entities/players/lib/types";

type PlayerStoreState = {
  selectedPlayer: PlayerData | null;
  players: Record<string, PlayerData>;
  loading: Record<PlayerServiceKey, boolean>;
  errors: Record<PlayerServiceKey, string | null>;
  setSelectedPlayer: (player: PlayerData | null) => void;
  updatePlayer: (steamId64: string, patch: Partial<PlayerData>) => void;
  setLoading: (service: PlayerServiceKey, isLoading: boolean) => void;
  setError: (service: PlayerServiceKey, error: string | null) => void;
};

const defaultLoading: Record<PlayerServiceKey, boolean> = {
  steam: false,
  leetify: false,
  faceit: false,
  csstats: false,
};

const defaultErrors: Record<PlayerServiceKey, string | null> = {
  steam: null,
  leetify: null,
  faceit: null,
  csstats: null,
};

export const usePlayerStore = create<PlayerStoreState>((set) => ({
  selectedPlayer: null,
  players: {},
  loading: defaultLoading,
  errors: defaultErrors,
  setSelectedPlayer: (player) => set({ selectedPlayer: player }),
  updatePlayer: (steamId64, patch) =>
    set((state) => {
      const existing = state.players[steamId64];
      if (!existing) {
        return state;
      }

      const updated = { ...existing, ...patch };
      return {
        players: {
          ...state.players,
          [steamId64]: updated,
        },
        selectedPlayer:
          state.selectedPlayer?.steamId64 === steamId64
            ? updated
            : state.selectedPlayer,
      };
    }),
  setLoading: (service, isLoading) =>
    set((state) => ({
      loading: { ...state.loading, [service]: isLoading },
    })),
  setError: (service, error) =>
    set((state) => ({
      errors: { ...state.errors, [service]: error },
    })),
}));
