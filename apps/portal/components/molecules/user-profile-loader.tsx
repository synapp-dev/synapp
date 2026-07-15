"use client";

import { useEffect, useState } from "react";
import { createBrowserClient } from "@/utils/supabase/client";
import { useUserProfile } from "@/stores/user-profile/user-profile-store";

export function UserProfileLoader() {
  const [userId, setUserId] = useState<string | null>(null);

  // Get the current user's ID from Supabase
  useEffect(() => {
    const getUser = async () => {
      const supabase = createBrowserClient();
      const { data } = await supabase.auth.getUser();
      if (data.user?.id) {
        setUserId(data.user.id);
      }
    };
    getUser();
  }, []);

  // Call useUserProfile with the userId to fetch and set the user profile
  useUserProfile(userId || "");

  // This component doesn't render anything, it just handles the data fetching
  return null;
}
