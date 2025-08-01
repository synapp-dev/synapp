"use client";

import { useState, useEffect } from "react";

import {
  getUserProfileWithSteam,
  linkSteamProfileToUser,
  unlinkSteamProfileFromUser,
} from "@/utils/steam-profile";
import type { Database } from "@/types/supabase";
import { createBrowserClient } from "@/utils/supabase/client";

type UserProfileWithSteam =
  Database["public"]["Functions"]["get_user_profile_with_steam"]["Returns"][0];

interface UseSteamAuthReturn {
  userProfile: UserProfileWithSteam | null;
  isLoading: boolean;
  error: string | null;
  linkSteamProfile: (steamid64: string) => Promise<boolean>;
  unlinkSteamProfile: () => Promise<boolean>;
  refreshProfile: () => Promise<void>;
}

export async function useSteamAuth(): Promise<UseSteamAuthReturn> {
  const [userProfile, setUserProfile] = useState<UserProfileWithSteam | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const supabase = await createBrowserClient();

  const fetchUserProfile = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const profile = await getUserProfileWithSteam();
      setUserProfile(profile);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to fetch user profile"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const linkSteamProfile = async (steamid64: string): Promise<boolean> => {
    try {
      setError(null);

      const success = await linkSteamProfileToUser(steamid64);

      if (success) {
        // Refresh the user profile to get updated data
        await fetchUserProfile();
      }

      return success;
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to link Steam profile"
      );
      return false;
    }
  };

  const unlinkSteamProfile = async (): Promise<boolean> => {
    try {
      setError(null);

      const success = await unlinkSteamProfileFromUser();

      if (success) {
        // Refresh the user profile to get updated data
        await fetchUserProfile();
      }

      return success;
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to unlink Steam profile"
      );
      return false;
    }
  };

  const refreshProfile = async () => {
    await fetchUserProfile();
  };

  // Listen for auth state changes
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_IN" && session?.user) {
        await fetchUserProfile();
      } else if (event === "SIGNED_OUT") {
        setUserProfile(null);
        setIsLoading(false);
      }
    });

    // Initial fetch
    fetchUserProfile();

    return () => subscription.unsubscribe();
  }, []);

  return {
    userProfile,
    isLoading,
    error,
    linkSteamProfile,
    unlinkSteamProfile,
    refreshProfile,
  };
}
