import { create } from "zustand";
import { useQuery, UseQueryResult, QueryFunction } from "@tanstack/react-query";
import { useEffect } from "react";
import { useAuthFetch } from "@/hooks/useAuthFetch";

export interface UserProfile {
  biography_description: string | null;
  biography_title: string | null;
  birthday: string | null;
  business_number: string | null;
  created_at: string | null;
  email: string;
  first_name: string | null;
  id: string;
  last_name: string | null;
  linkedin_url: string | null;
  location: string | null;
  mobile_number: string | null;
  position_title: string | null;
  profile_picture_url: string | null;
  settings: any;
}

interface UserProfileStore {
  currentUser: UserProfile | null;
  setCurrentUser: (user: UserProfile | null) => void;
}

export const useUserProfileStore = create<UserProfileStore>((set) => ({
  currentUser: null,
  setCurrentUser: (user) => set({ currentUser: user }),
}));

export function useUserProfile(
  userId: string
): UseQueryResult<UserProfile, Error> {
  const { setCurrentUser } = useUserProfileStore();
  const authFetch = useAuthFetch();

  const fetchUserProfile: QueryFunction<
    UserProfile,
    [string, string]
  > = async ({ queryKey }) => {
    const [, userId] = queryKey;
    const res = await authFetch(`/api/system_users/${userId}`, {
      headers: { "x-user-id": userId },
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error || "Failed to fetch user");
    return json.data;
  };

  const query = useQuery<UserProfile, Error, UserProfile, [string, string]>({
    queryKey: ["user-profile", userId],
    queryFn: fetchUserProfile,
    enabled: !!userId,
  });

  useEffect(() => {
    if (query.data) setCurrentUser(query.data);
    if (query.error) setCurrentUser(null);
  }, [query.data, query.error, setCurrentUser]);

  return query;
}
