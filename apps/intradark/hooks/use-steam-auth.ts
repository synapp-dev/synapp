"use client";

import { useState, useEffect, useCallback } from "react";
import { fetchSteamProfile } from "@/utils/steam-profile";

interface SteamUserProfile {
  steamid: string;
  personaname: string;
  avatar: string;
  avatarmedium: string;
  avatarfull: string;
}

interface UseSteamAuthReturn {
  steamId: string | null;
  profile: SteamUserProfile | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  signOut: () => void;
}

function getSteamIdFromStorage(): string | null {
  try {
    const match = document.cookie.match(/(?:^|; )steamId=([^;]+)/);
    const fromCookie = match ? decodeURIComponent(match[1] || "") : "";
    const fromLocal = typeof window !== "undefined" ? localStorage.getItem("steamId") : null;
    return fromCookie || fromLocal || null;
  } catch {
    return null;
  }
}

export function useSteamAuth(): UseSteamAuthReturn {
  const [steamId, setSteamId] = useState<string | null>(null);
  const [profile, setProfile] = useState<SteamUserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const id = getSteamIdFromStorage();
      setSteamId(id);
      if (!id) {
        setProfile(null);
        return;
      }
      // Persist to localStorage for later
      try { localStorage.setItem("steamId", id); } catch {}
      const data = await fetchSteamProfile(id);
      if (!data) {
        setProfile(null);
        setError("Failed to load Steam profile");
        return;
      }
      setProfile({
        steamid: data.steamid,
        personaname: data.personaname,
        avatar: data.avatar,
        avatarmedium: data.avatarmedium,
        avatarfull: data.avatarfull,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load Steam profile");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const signOut = () => {
    try {
      // Clear cookie
      document.cookie = "steamId=; path=/; max-age=0";
      // Clear localStorage
      try { localStorage.removeItem("steamId"); } catch {}
      setSteamId(null);
      setProfile(null);
    } catch {}
  };

  return {
    steamId,
    profile,
    isLoading,
    error,
    refresh: load,
    signOut,
  };
}
