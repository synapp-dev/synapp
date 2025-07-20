import { create } from "zustand";

interface UserProfile {
  id: string;
  email: string;
  name?: string;
  avatar_url?: string;
}

interface UserProfileState {
  user: UserProfile | null;
  isLoading: boolean;
  setUser: (user: UserProfile | null) => void;
  setLoading: (loading: boolean) => void;
}

export const useUserProfileStore = create<UserProfileState>((set) => ({
  user: null,
  isLoading: false,
  setUser: (user) => set({ user }),
  setLoading: (isLoading) => set({ isLoading }),
}));

// Convenience hook
export const useUserProfile = () => {
  const { user, isLoading, setUser, setLoading } = useUserProfileStore();
  return { user, isLoading, setUser, setLoading };
};
