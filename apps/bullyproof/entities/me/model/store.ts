import { create } from "zustand";
import type { vUserProfileExpanded } from "@/drizzle/schema";

type UserProfile = typeof vUserProfileExpanded.$inferSelect;

type MeState = {
  currentUser: UserProfile | null;
  setCurrentUser: (user: UserProfile | null) => void;
  users: Record<string, UserProfile>;
  setUser: (id: string, user: UserProfile) => void;
  clearUsers: () => void;
  loading: boolean;
  setLoading: (loading: boolean) => void;
};

export const useMeStore = create<MeState>((set) => ({
  currentUser: null,
  setCurrentUser: (user) => set({ currentUser: user }),
  users: {},
  setUser: (id, user) =>
    set((state) => ({
      users: { ...state.users, [id]: user },
    })),
  clearUsers: () => set({ users: {} }),
  loading: false,
  setLoading: (loading) => set({ loading }),
}));

// Compatibility hook that matches the old user-profile-store interface
export const useUserProfile = () => {
  const currentUser = useMeStore((s) => s.currentUser);
  const setUser = useMeStore((s) => s.setUser);
  const setLoading = useMeStore((s) => s.setLoading);
  const loading = useMeStore((s) => s.loading);

  return {
    currentUser,
    setUser,
    setLoading,
    loading,
  };
};

// Hook to check if current user is a platform admin
export const useIsPlatformAdmin = () => {
  const currentUser = useMeStore((s) => s.currentUser);
  return currentUser?.platformRoles?.includes("PLATFORM_ADMIN") ?? false;
};

// Hook to check if current user is a teacher
export const useIsTeacher = () => {
  const currentUser = useMeStore((s) => s.currentUser);
  // Check both platform roles and school roles for TEACHER
  const hasPlatformTeacherRole =
    currentUser?.platformRoles?.includes("TEACHER") ?? false;
  const schoolRoles = currentUser?.schoolRoles;
  const hasSchoolTeacherRole = Array.isArray(schoolRoles)
    ? schoolRoles.some((role: any) => role.roleKey === "TEACHER")
    : false;
  return hasPlatformTeacherRole || hasSchoolTeacherRole;
};
