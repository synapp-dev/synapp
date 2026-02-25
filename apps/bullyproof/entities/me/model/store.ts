import { create } from "zustand";
import type { vUserProfileExpanded } from "@/drizzle/schema";

type UserProfile = typeof vUserProfileExpanded.$inferSelect;

// Per-level permission: enabled = can use feature; visible = show in nav (null = follow enabled)
export type FeaturePermissionLevel = {
  enabled: boolean;
  visible: boolean | null;
};

// Feature permissions structure: featureKey -> { global?, schools, roles, schoolRoles, user? } with enabled + visible per level
export type FeaturePermissions = Record<
  string,
  {
    global?: FeaturePermissionLevel;
    schools: Record<string, FeaturePermissionLevel>;
    roles: Record<string, FeaturePermissionLevel>; // platform roles
    schoolRoles: Record<string, Record<string, FeaturePermissionLevel>>; // schoolId -> roleId -> permission
    user?: FeaturePermissionLevel;
  }
>;

// Extended user profile with feature permissions
export type UserProfileWithFeatures = UserProfile & {
  featurePermissions?: FeaturePermissions;
  schoolIds?: string[];
  roleIds?: string[];
  /** When true, user bypasses maintenance mode (e.g. dev key matches MAINTENANCE_BYPASS_DEV_KEY). */
  maintenanceBypass?: boolean;
};

type MeState = {
  currentUser: UserProfileWithFeatures | null;
  viewAsUser: UserProfileWithFeatures | null;
  viewAsStartedAt: number | null;
  setCurrentUser: (user: UserProfileWithFeatures | null) => void;
  startViewAsMode: (user: UserProfileWithFeatures) => void;
  stopViewAsMode: () => void;
};

export const useMeStore = create<MeState>((set) => ({
  currentUser: null,
  viewAsUser: null,
  viewAsStartedAt: null,
  setCurrentUser: (user) => set({ currentUser: user }),
  startViewAsMode: (user) =>
    set({
      viewAsUser: user,
      viewAsStartedAt: Date.now(),
    }),
  stopViewAsMode: () => set({ viewAsUser: null, viewAsStartedAt: null }),
}));

