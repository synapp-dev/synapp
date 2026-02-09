export const featurePermissionsKeys = {
  all: ["feature-permissions"] as const,
  /** Bulk: all permissions at level (one fetch per level/target) */
  bulk: (level: "global" | "role" | "school" | "school_role" | "user", targetId?: string, schoolId?: string) =>
    [...featurePermissionsKeys.all, "bulk", level, targetId ?? null, schoolId ?? null] as const,
  /** User features (GET /users/[id]/features) - different shape with inherited */
  userFeatures: (userId: string) =>
    [...featurePermissionsKeys.all, "user-features", userId] as const,
};
