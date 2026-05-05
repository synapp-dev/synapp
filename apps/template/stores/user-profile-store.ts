import { useMeStore } from "@/entities/me/model/store";

type LegacyUserProfile = {
  id: string;
  email: string;
  name?: string;
  avatar_url?: string;
};

function toLegacyUser(user: ReturnType<typeof useMeStore.getState>["currentUser"]): LegacyUserProfile | null {
  if (!user || !user.email) {
    return null;
  }

  return {
    id: user.id,
    email: user.email,
    name: user.fullName ?? undefined,
    avatar_url: user.avatarUrl ?? undefined,
  };
}

// Backward-compatible adapter around the new entities/me store.
export const useUserProfileStore = () => {
  const user = useMeStore((state) => toLegacyUser(state.currentUser));
  const isLoading = useMeStore((state) => state.isLoading);
  const setCurrentUser = useMeStore((state) => state.setCurrentUser);
  const setLoading = useMeStore((state) => state.setLoading);

  return {
    user,
    isLoading,
    setUser: (legacyUser: LegacyUserProfile | null) => {
      if (!legacyUser) {
        setCurrentUser(null);
        return;
      }

      setCurrentUser({
        id: legacyUser.id,
        email: legacyUser.email,
        fullName: legacyUser.name ?? null,
        avatarUrl: legacyUser.avatar_url ?? null,
        role: null,
        features: [],
      });
    },
    setLoading,
  };
};

export const useUserProfile = useUserProfileStore;
