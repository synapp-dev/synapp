import { apiFetch } from "@/lib/api/fetcher.client";

export type FeaturePermissionRow = {
  id: string;
  featureId: string;
  level: "global" | "role" | "school" | "school_role" | "user";
  targetId: string | null;
  schoolId?: string | null;
  enabled: boolean;
  visible?: boolean | null;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string | null;
};

export const featurePermissionsApi = {
  /**
   * Fetch all permissions at a level in one request.
   * level=global -> no targetId; level=role|school|user -> targetId required.
   * level=school_role -> requires schoolId (and optionally targetId for a specific role).
   */
  getBulkByLevel: async (
    level: "global" | "role" | "school" | "school_role" | "user",
    targetId?: string,
    schoolId?: string
  ) => {
    const params = new URLSearchParams({ level });
    if (targetId) params.set("targetId", targetId);
    if (schoolId) params.set("schoolId", schoolId);
    const result = await apiFetch<FeaturePermissionRow[]>(
      `/features/permissions?${params.toString()}`
    );
    return result;
  },
};
