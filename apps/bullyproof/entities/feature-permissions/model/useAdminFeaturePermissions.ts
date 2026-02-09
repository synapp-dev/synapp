"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/fetcher.client";
import { featurePermissionsApi } from "../api/endpoints";
import { featurePermissionsKeys } from "./keys";
import {
  useFeaturePermissionsStore,
  permissionsByFeatureId,
  type UserFeaturePermissionRow,
} from "./store";

/** Composite key helper matching the store */
function schoolRoleKey(schoolId: string, roleId: string) {
  return `${schoolId}:${roleId}`;
}

/**
 * Fetch global permissions in one request and populate the store.
 * Admin/features page reads from store; if store is empty, this hook triggers the fetch.
 */
export function useGlobalPermissionsQuery() {
  const { globalPermissions, setGlobalPermissions } = useFeaturePermissionsStore();

  const query = useQuery({
    queryKey: featurePermissionsKeys.bulk("global"),
    queryFn: async () => {
      const result = await featurePermissionsApi.getBulkByLevel("global");
      if (result.error) throw new Error(result.error.message ?? "Failed to fetch");
      const data = result.data ?? [];
      setGlobalPermissions(data);
      return data;
    },
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    initialData: () =>
      globalPermissions.length > 0 ? globalPermissions : undefined,
  });

  return {
    ...query,
    /** Permissions from store (or query data); keyed by featureId for UI */
    byFeatureId: permissionsByFeatureId(query.data ?? globalPermissions),
  };
}

/**
 * Fetch role permissions for a role in one request and populate the store.
 */
export function useRolePermissionsQuery(roleId: string | null) {
  const { rolePermissions, setRolePermissions } = useFeaturePermissionsStore();

  const query = useQuery({
    queryKey: featurePermissionsKeys.bulk("role", roleId ?? undefined),
    queryFn: async () => {
      if (!roleId) return [];
      const result = await featurePermissionsApi.getBulkByLevel("role", roleId);
      if (result.error) throw new Error(result.error.message ?? "Failed to fetch");
      const data = result.data ?? [];
      setRolePermissions(roleId, data);
      return data;
    },
    enabled: !!roleId,
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    initialData: () => (roleId ? rolePermissions[roleId] : undefined),
  });

  return {
    ...query,
    byFeatureId: permissionsByFeatureId(query.data ?? (roleId ? rolePermissions[roleId] ?? [] : [])),
  };
}

/**
 * Fetch school permissions for a school in one request and populate the store.
 */
export function useSchoolPermissionsQuery(schoolId: string | null) {
  const { schoolPermissions, setSchoolPermissions } = useFeaturePermissionsStore();

  const query = useQuery({
    queryKey: featurePermissionsKeys.bulk("school", schoolId ?? undefined),
    queryFn: async () => {
      if (!schoolId) return [];
      const result = await featurePermissionsApi.getBulkByLevel("school", schoolId);
      if (result.error) throw new Error(result.error.message ?? "Failed to fetch");
      const data = result.data ?? [];
      setSchoolPermissions(schoolId, data);
      return data;
    },
    enabled: !!schoolId,
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    initialData: () =>
      schoolId ? schoolPermissions[schoolId] : undefined,
  });

  return {
    ...query,
    byFeatureId: permissionsByFeatureId(
      query.data ?? (schoolId ? schoolPermissions[schoolId] ?? [] : [])
    ),
  };
}

/**
 * Fetch school role permissions for a role within a school.
 * level=school_role, schoolId required, targetId = roleId.
 */
export function useSchoolRolePermissionsQuery(schoolId: string | null, roleId: string | null) {
  const { schoolRolePermissions, setSchoolRolePermissions } = useFeaturePermissionsStore();
  const key = schoolId && roleId ? schoolRoleKey(schoolId, roleId) : null;

  const query = useQuery({
    queryKey: featurePermissionsKeys.bulk("school_role", roleId ?? undefined, schoolId ?? undefined),
    queryFn: async () => {
      if (!schoolId || !roleId) return [];
      const result = await featurePermissionsApi.getBulkByLevel("school_role", roleId, schoolId);
      if (result.error) throw new Error(result.error.message ?? "Failed to fetch");
      const data = result.data ?? [];
      setSchoolRolePermissions(schoolId, roleId, data);
      return data;
    },
    enabled: !!schoolId && !!roleId,
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    initialData: () => (key ? schoolRolePermissions[key] : undefined),
  });

  return {
    ...query,
    byFeatureId: permissionsByFeatureId(
      query.data ?? (key ? schoolRolePermissions[key] ?? [] : [])
    ),
  };
}

/**
 * Fetch user feature permissions (GET /users/[id]/features) in one request and populate the store.
 * Returns shape with permission + feature for inherited resolution.
 */
export function useUserPermissionsQuery(userId: string | null) {
  const { userPermissions, setUserPermissions } = useFeaturePermissionsStore();

  const query = useQuery({
    queryKey: featurePermissionsKeys.userFeatures(userId ?? ""),
    queryFn: async () => {
      if (!userId) return [];
      const result = await apiFetch<UserFeaturePermissionRow[]>(
        `/users/${userId}/features`
      );
      if (result.error) return [];
      const data = result.data ?? [];
      setUserPermissions(userId, data);
      return data;
    },
    enabled: !!userId,
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    initialData: () => (userId ? userPermissions[userId] : undefined),
  });

  return {
    ...query,
    rows: query.data ?? (userId ? userPermissions[userId] ?? [] : []),
  };
}
