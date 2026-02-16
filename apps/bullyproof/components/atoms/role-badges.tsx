"use client";

import { Badge } from "@workspace/ui/components/badge";
import { cn } from "@workspace/ui/lib/utils";
import { Award, FileBadge2, Shield, ShieldCheck, Users as UsersIcon } from "lucide-react";

export interface RoleBadgeItem {
  roleKey: string;
  roleName?: string;
  isPlatform?: boolean;
}

const ROLE_PRIORITY: Record<string, number> = {
  SCHOOL_STAFF: 1,
  SCHOOL_ADMIN: 2,
  TEACHER: 3,
  SCHOOL_LICENCE: 4,
  PLATFORM_ADMIN: 5,
};

function getRolePriority(roleKey: string): number {
  if (roleKey === "TEACHER" || roleKey?.includes("TEACHER")) return 3;
  return ROLE_PRIORITY[roleKey] ?? 6;
}

function getBadgeClasses(roleKey: string, isPlatform: boolean): string {
  if (roleKey === "TEACHER") {
    return "bg-[var(--role-teacher)] text-[var(--role-teacher-text)] border-[var(--role-teacher)]/50";
  }
  if (isPlatform && roleKey === "PLATFORM_ADMIN") {
    return "bg-[var(--role-platform-admin)] text-[var(--role-platform-admin-text)] border-[var(--role-platform-admin)]/50";
  }
  if (!isPlatform && roleKey === "SCHOOL_ADMIN") {
    return "bg-[var(--role-school-admin)] text-[var(--role-school-admin-text)] border-[var(--role-school-admin)]/50";
  }
  if (roleKey === "SCHOOL_STAFF") {
    return "bg-[var(--role-school-staff)] text-[var(--role-school-staff-text)] border-[var(--role-school-staff)]/50";
  }
  if (roleKey === "SCHOOL_LICENCE") {
    return "bg-[var(--role-school-licence)] text-[var(--role-school-licence-text)] border-[var(--role-school-licence)]/50";
  }
  return "";
}

function getRoleIcon(roleKey: string, isAdmin: boolean, roleName?: string) {
  if (roleKey === "SCHOOL_LICENCE") return FileBadge2;
  if (roleKey === "SCHOOL_ADMIN") return Shield;
  if (isAdmin) return ShieldCheck; // PLATFORM_ADMIN
  if (roleName?.toLowerCase().includes("ap teacher")) return Award;
  return UsersIcon;
}

export interface RoleBadgesProps {
  roles: RoleBadgeItem[];
  /** joined = contiguous badges, pill = separate with gaps */
  variant?: "joined" | "pill";
  /** Icon size: sm for compact (e.g. table), md for larger (e.g. cards) */
  size?: "sm" | "md";
  /** When true, last badge has no right border so a trailing sibling can connect */
  lastConnectsToRight?: boolean;
  className?: string;
}

export function RoleBadges({
  roles,
  variant = "joined",
  size = "sm",
  lastConnectsToRight = false,
  className,
}: RoleBadgesProps) {
  if (roles.length === 0) return null;

  const sortedRoles = [...roles].sort((a, b) => {
    const aPriority = getRolePriority(a.roleKey);
    const bPriority = getRolePriority(b.roleKey);
    return aPriority - bPriority;
  });

  const iconClass = size === "sm" ? "h-4 w-4" : "h-5 w-5";
  const isJoined = variant === "joined";

  return (
    <div
      className={cn(
        "flex flex-wrap",
        isJoined ? "gap-0" : "gap-1",
        className
      )}
    >
      {sortedRoles.map((role, idx) => {
        const roleKey = role.roleKey || "";
        const isPlatform = role.isPlatform ?? false;
        const isAdmin =
          roleKey.includes("ADMIN") || roleKey.includes("admin");
        const badgeClasses = getBadgeClasses(roleKey, isPlatform);
        const RoleIcon = getRoleIcon(roleKey, isAdmin, role.roleName);
        const displayName = role.roleName || roleKey || "Unknown";

        const isFirst = idx === 0;
        const isLast = idx === sortedRoles.length - 1;
        const roleCount = sortedRoles.length;

        let borderRadiusClass = "";
        if (isJoined) {
          if (roleCount === 1) {
            borderRadiusClass = "rounded-md";
          } else if (isFirst) {
            borderRadiusClass = "rounded-l-md rounded-r-none";
          } else if (isLast) {
            borderRadiusClass = "rounded-r-md rounded-l-none";
          } else {
            borderRadiusClass = "rounded-none";
          }
        } else {
          borderRadiusClass = "rounded-md";
        }

        const connectRight =
          isJoined && (!isLast || lastConnectsToRight);

        return (
          <Badge
            key={`${roleKey}-${idx}`}
            variant="default"
            className={cn(
              "flex items-center gap-1 z-10 border px-2 py-1",
              badgeClasses,
              connectRight && "border-r-0 -mr-[1px]",
              borderRadiusClass
            )}
          >
            <RoleIcon className={iconClass} />
            {displayName}
          </Badge>
        );
      })}
    </div>
  );
}
