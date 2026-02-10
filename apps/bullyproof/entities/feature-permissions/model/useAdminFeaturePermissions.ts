"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/fetcher.client";
import { featurePermissionsApi, type FeaturePermissionRow } from "../api/endpoints";
import { featurePermissionsKeys } from "./keys";

/** User features API returns { permission, feature } per row (for inherited + user override) */
export type UserFeaturePermissionRow = {
  permission: {
    level: "global" | "role" | "school" | "school_role" | "user";
    enabled: boolean;
    visible?: boolean | null;
    featureId: string;
    schoolId?: string | null;
  };
  feature: { id: string; key: string; name: string };
};

/** Derive one permission per feature from bulk array (take first/latest per featureId) */
export function permissionsByFeatureId(
  rows: FeaturePermissionRow[]
): Record<string, FeaturePermissionRow> {
  const map: Record<string, FeaturePermissionRow> = {};
  for (const row of rows) {
    if (!map[row.featureId]) map[row.featureId] = row;
  }
  return map;
}

/**
 * Fetch global permissions in one request.
 */
export function useGlobalPermissionsQuery() {
  const query = useQuery({
    queryKey: featurePermissionsKeys.bulk("global"),
    queryFn: async () => {
      const result = await featurePermissionsApi.getBulkByLevel("global");
      if (result.error) throw new Error(result.error.message ?? "Failed to fetch");
      return result.data ?? [];
    },
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  return {
    ...query,
    byFeatureId: permissionsByFeatureId(query.data ?? []),
  };
}

/**
 * Fetch role permissions for a role in one request.
 */
export function useRolePermissionsQuery(roleId: string | null) {
  const query = useQuery({
    queryKey: featurePermissionsKeys.bulk("role", roleId ?? undefined),
    queryFn: async () => {
      if (!roleId) return [];
      const result = await featurePermissionsApi.getBulkByLevel("role", roleId);
      if (result.error) throw new Error(result.error.message ?? "Failed to fetch");
      return result.data ?? [];
    },
    enabled: !!roleId,
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  return {
    ...query,
    byFeatureId: permissionsByFeatureId(query.data ?? []),
  };
}

/**
 * Fetch school permissions for a school in one request.
 */
export function useSchoolPermissionsQuery(schoolId: string | null) {
  const query = useQuery({
    queryKey: featurePermissionsKeys.bulk("school", schoolId ?? undefined),
    queryFn: async () => {
      if (!schoolId) return [];
      const result = await featurePermissionsApi.getBulkByLevel("school", schoolId);
      if (result.error) throw new Error(result.error.message ?? "Failed to fetch");
      return result.data ?? [];
    },
    enabled: !!schoolId,
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  return {
    ...query,
    byFeatureId: permissionsByFeatureId(query.data ?? []),
  };
}

/**
 * Fetch school role permissions for a role within a school.
 */
export function useSchoolRolePermissionsQuery(schoolId: string | null, roleId: string | null) {
  const query = useQuery({
    queryKey: featurePermissionsKeys.bulk("school_role", roleId ?? undefined, schoolId ?? undefined),
    queryFn: async () => {
      if (!schoolId || !roleId) return [];
      const result = await featurePermissionsApi.getBulkByLevel("school_role", roleId, schoolId);
      if (result.error) throw new Error(result.error.message ?? "Failed to fetch");
      return result.data ?? [];
    },
    enabled: !!schoolId && !!roleId,
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  return {
    ...query,
    byFeatureId: permissionsByFeatureId(query.data ?? []),
  };
}

/**
 * Fetch user feature permissions (GET /users/[id]/features) in one request.
 */
export function useUserPermissionsQuery(userId: string | null) {
  const query = useQuery({
    queryKey: featurePermissionsKeys.userFeatures(userId ?? ""),
    queryFn: async () => {
      if (!userId) return [];
      const result = await apiFetch<UserFeaturePermissionRow[]>(
        `/users/${userId}/features`
      );
      if (result.error) return [];
      return result.data ?? [];
    },
    enabled: !!userId,
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  return {
    ...query,
    rows: query.data ?? [],
  };
}
