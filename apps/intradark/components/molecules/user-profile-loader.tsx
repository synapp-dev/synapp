"use client";

import { useEffect } from "react";
import { useUserProfile } from "@/stores/user-profile-store";
import { createBrowserClient } from "@/utils/supabase/client";

export function UserProfileLoader() {
  const { setUser, setLoading } = useUserProfile();

  useEffect(() => {
    const loadUserProfile = async () => {
      setLoading(true);
      try {
        const supabase = createBrowserClient();
        const { data: { user: authUser } } = await supabase.auth.getUser();

        if (!authUser) {
          setUser(null);
          return;
        }

        const res = await fetch("/api/me", { credentials: "include" });
        if (res.ok) {
          const profile = await res.json();
          setUser({
            id: authUser.id,
            email: profile.email ?? authUser.email ?? "",
            name: profile.display_name ?? authUser.user_metadata?.name ?? authUser.user_metadata?.full_name,
            username: profile.username ?? null,
            display_name: profile.display_name ?? null,
            avatar_url: profile.avatar_url ?? authUser.user_metadata?.avatar_url,
          });
        } else {
          setUser({
            id: authUser.id,
            email: authUser.email ?? "",
            name: authUser.user_metadata?.name ?? authUser.user_metadata?.full_name,
            avatar_url: authUser.user_metadata?.avatar_url,
          });
        }
      } catch (error) {
        console.error("Error loading user profile:", error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    loadUserProfile();
  }, [setUser, setLoading]);

  return null;
}
