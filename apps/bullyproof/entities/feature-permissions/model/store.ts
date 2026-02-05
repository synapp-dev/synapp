import { create } from "zustand";
import type { FeaturePermissionRow } from "../api/endpoints";

/** User features API returns { permission, feature } per row (for inherited + user override) */
export type UserFeaturePermissionRow = {
  permission: {
    level: "global" | "role" | "school" | "user";
    enabled: boolean;
    visible?: boolean | null;
    featureId: string;
  };
  feature: { id: string; key: string; name: string };
};

interface FeaturePermissionsState {
  /** Global: all global permissions (one per feature) */
  globalPermissions: FeaturePermissionRow[];
  /** Role: keyed by roleId */
  rolePermissions: Record<string, FeaturePermissionRow[]>;
  /** School: keyed by schoolId */
  schoolPermissions: Record<string, FeaturePermissionRow[]>;
  /** User: GET /users/[id]/features shape (permission + feature for inherited) */
  userPermissions: Record<string, UserFeaturePermissionRow[]>;

  setGlobalPermissions: (perms: FeaturePermissionRow[]) => void;
  setRolePermissions: (roleId: string, perms: FeaturePermissionRow[]) => void;
  setSchoolPermissions: (schoolId: string, perms: FeaturePermissionRow[]) => void;
  setUserPermissions: (userId: string, perms: UserFeaturePermissionRow[]) => void;

  /** Update a single permission in store after mutation (e.g. global) */
  updateGlobalPermission: (
    featureId: string,
    patch: { enabled?: boolean; visible?: boolean | null }
  ) => void;
  updateRolePermission: (
    roleId: string,
    featureId: string,
    patch: { enabled?: boolean; visible?: boolean | null }
  ) => void;
  updateSchoolPermission: (
    schoolId: string,
    featureId: string,
    patch: { enabled?: boolean; visible?: boolean | null }
  ) => void;
  updateUserPermission: (
    userId: string,
    featureId: string,
    patch: { enabled?: boolean; visible?: boolean | null }
  ) => void;

  /** Optimistic: add or update global permission (for instant toggle when no row yet) */
  setGlobalPermissionOptimistic: (
    featureId: string,
    value: { enabled: boolean; visible?: boolean | null }
  ) => void;
  /** Optimistic: add or update role permission */
  setRolePermissionOptimistic: (
    roleId: string,
    featureId: string,
    value: { enabled: boolean; visible?: boolean | null }
  ) => void;
  /** Optimistic: add or update school permission */
  setSchoolPermissionOptimistic: (
    schoolId: string,
    featureId: string,
    value: { enabled: boolean; visible?: boolean | null }
  ) => void;
  /** Remove global permission (rollback when was optimistically added) */
  removeGlobalPermissionOptimistic: (featureId: string) => void;
  removeRolePermissionOptimistic: (roleId: string, featureId: string) => void;
  removeSchoolPermissionOptimistic: (schoolId: string, featureId: string) => void;
}

export const useFeaturePermissionsStore = create<FeaturePermissionsState>(
  (set) => ({
    globalPermissions: [],
    rolePermissions: {},
    schoolPermissions: {},
    userPermissions: {},

    setGlobalPermissions: (perms) =>
      set({ globalPermissions: perms }),

    setRolePermissions: (roleId, perms) =>
      set((state) => ({
        rolePermissions: { ...state.rolePermissions, [roleId]: perms },
      })),

    setSchoolPermissions: (schoolId, perms) =>
      set((state) => ({
        schoolPermissions: { ...state.schoolPermissions, [schoolId]: perms },
      })),

    setUserPermissions: (userId, perms) =>
      set((state) => ({
        userPermissions: { ...state.userPermissions, [userId]: perms },
      })),

    updateGlobalPermission: (featureId, patch) =>
      set((state) => {
        const list = [...state.globalPermissions];
        const idx = list.findIndex((p) => p.featureId === featureId);
        if (idx === -1) return state;
        list[idx] = { ...list[idx], ...patch };
        return { globalPermissions: list };
      }),

    updateRolePermission: (roleId, featureId, patch) =>
      set((state) => {
        const list = state.rolePermissions[roleId];
        if (!list) return state;
        const idx = list.findIndex((p) => p.featureId === featureId);
        if (idx === -1) return state;
        const next = [...list];
        next[idx] = { ...next[idx], ...patch };
        return {
          rolePermissions: { ...state.rolePermissions, [roleId]: next },
        };
      }),

    updateSchoolPermission: (schoolId, featureId, patch) =>
      set((state) => {
        const list = state.schoolPermissions[schoolId];
        if (!list) return state;
        const idx = list.findIndex((p) => p.featureId === featureId);
        if (idx === -1) return state;
        const next = [...list];
        next[idx] = { ...next[idx], ...patch };
        return {
          schoolPermissions: { ...state.schoolPermissions, [schoolId]: next },
        };
      }),

    updateUserPermission: (userId, featureId, patch) =>
      set((state) => {
        const list = state.userPermissions[userId];
        if (!list) return state;
        const next = list.map((row) =>
          row.feature.id === featureId
            ? {
                ...row,
                permission: { ...row.permission, ...patch },
              }
            : row
        );
        return {
          userPermissions: { ...state.userPermissions, [userId]: next },
        };
      }),

    setGlobalPermissionOptimistic: (featureId, value) =>
      set((state) => {
        const list = [...state.globalPermissions];
        const idx = list.findIndex((p) => p.featureId === featureId);
        const row = {
          featureId,
          level: "global" as const,
          targetId: null,
          enabled: value.enabled,
          visible: value.visible ?? value.enabled,
          id: "",
        };
        if (idx >= 0) list[idx] = { ...list[idx], ...row };
        else list.push(row as FeaturePermissionRow);
        return { globalPermissions: list };
      }),

    setRolePermissionOptimistic: (roleId, featureId, value) =>
      set((state) => {
        const list = [...(state.rolePermissions[roleId] ?? [])];
        const idx = list.findIndex((p) => p.featureId === featureId);
        const row = {
          featureId,
          level: "role" as const,
          targetId: roleId,
          enabled: value.enabled,
          visible: value.visible ?? value.enabled,
          id: "",
        };
        if (idx >= 0) list[idx] = { ...list[idx], ...row };
        else list.push(row as FeaturePermissionRow);
        return {
          rolePermissions: { ...state.rolePermissions, [roleId]: list },
        };
      }),

    setSchoolPermissionOptimistic: (schoolId, featureId, value) =>
      set((state) => {
        const list = [...(state.schoolPermissions[schoolId] ?? [])];
        const idx = list.findIndex((p) => p.featureId === featureId);
        const row = {
          featureId,
          level: "school" as const,
          targetId: schoolId,
          enabled: value.enabled,
          visible: value.visible ?? value.enabled,
          id: "",
        };
        if (idx >= 0) list[idx] = { ...list[idx], ...row };
        else list.push(row as FeaturePermissionRow);
        return {
          schoolPermissions: { ...state.schoolPermissions, [schoolId]: list },
        };
      }),

    removeGlobalPermissionOptimistic: (featureId) =>
      set((state) => ({
        globalPermissions: state.globalPermissions.filter(
          (p) => p.featureId !== featureId
        ),
      })),

    removeRolePermissionOptimistic: (roleId, featureId) =>
      set((state) => {
        const list = state.rolePermissions[roleId]?.filter(
          (p) => p.featureId !== featureId
        ) ?? [];
        return {
          rolePermissions: { ...state.rolePermissions, [roleId]: list },
        };
      }),

    removeSchoolPermissionOptimistic: (schoolId, featureId) =>
      set((state) => {
        const list = state.schoolPermissions[schoolId]?.filter(
          (p) => p.featureId !== featureId
        ) ?? [];
        return {
          schoolPermissions: { ...state.schoolPermissions, [schoolId]: list },
        };
      }),
  })
);

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
