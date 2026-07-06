import type { RoleRow } from "@/types/db";
import type { UserWithRolesAndSchools } from "@/entities/me/api/endpoints";
import type { UserUpdateContext } from "@/entities/users/lib/refresh-selected-user";

export type Role = RoleRow;

export interface UserDetailDrawerProps {
  user: UserWithRolesAndSchools | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUserUpdate?: (context?: UserUpdateContext) => void | Promise<void>;
  onDeleteUserClick?: () => void;
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

export type TabType = "details" | "roles" | "positions" | "classes" | "history" | "features";
export type HistorySubTabType = "details" | "roles";
export type AddRoleStep = "school" | "role" | "confirm";
