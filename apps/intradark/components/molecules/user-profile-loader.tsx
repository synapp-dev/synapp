"use client";

import { useEffect } from "react";
import { useUserProfile } from "@/stores/user-profile-store";

export function UserProfileLoader() {
  const { setUser, setLoading } = useUserProfile();

  useEffect(() => {
    const loadUserProfile = async () => {
      setLoading(true);
      try {
        // TODO: Implement your user profile loading logic here
        // Example with Supabase:
        // const supabase = createBrowserClient();
        // const { data } = await supabase.auth.getUser();
        // if (data.user) {
        //   setUser({
        //     id: data.user.id,
        //     email: data.user.email || '',
        //     name: data.user.user_metadata?.name,
        //     avatar_url: data.user.user_metadata?.avatar_url,
        //   });
        // }

        // For now, set a mock user for demonstration
        setUser({
          id: "1",
          email: "user@example.com",
          name: "John Doe",
          avatar_url: undefined,
        });
      } catch (error) {
        console.error("Error loading user profile:", error);
      } finally {
        setLoading(false);
      }
    };

    loadUserProfile();
  }, [setUser, setLoading]);

  return null;
}
