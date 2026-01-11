import type { UserWithRolesAndSchools } from "@/entities/me/api/endpoints";
import type { roles } from "@/server/db/schema";

export type Role = typeof roles.$inferSelect;

export interface UserDetailDrawerProps {
  user: UserWithRolesAndSchools | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUserUpdate?: () => void;
}

export interface RoleToRemove {
  roleId: string;
  roleKey: string;
  roleName: string;
  schoolId?: string;
  schoolName?: string;
  isPlatform: boolean;
}

export interface RoleToToggle {
  roleId: string;
  roleKey: string;
  roleName: string;
  schoolId: string;
  schoolName?: string;
  isAdding: boolean;
  willRemoveAll?: boolean;
}

export interface UnavailableRoleToAssign {
  roleId: string;
  roleName: string;
}

export type TabType = "details" | "roles" | "history";
export type HistorySubTabType = "details" | "roles";
export type AddRoleStep = "school" | "role" | "confirm";
