import { create } from "zustand";
import { persist } from "zustand/middleware";

interface SteamUser {
  steamId: string;
  displayName: string;
  profileUrl?: string;
  avatar?: string;
  avatarFull?: string;
  realName?: string;
  timeCreated?: number;
}

interface SteamAuthState {
  user: SteamUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setUser: (user: SteamUser | null) => void;
  setLoading: (loading: boolean) => void;
  logout: () => void;
}

export const useSteamAuthStore = create<SteamAuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      setUser: (user) =>
        set({
          user,
          isAuthenticated: !!user,
        }),
      setLoading: (isLoading) => set({ isLoading }),
      logout: () =>
        set({
          user: null,
          isAuthenticated: false,
        }),
    }),
    {
      name: "steam-auth-storage",
    }
  )
);
