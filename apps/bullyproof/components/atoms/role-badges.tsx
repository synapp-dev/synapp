"use client";

import { Badge } from "@workspace/ui/components/badge";
import { cn } from "@workspace/ui/lib/utils";
import { Award, FileBadge2, Shield, ShieldCheck, Users as UsersIcon } from "lucide-react";
import Image from "next/image";
import type { ComponentType } from "react";

export interface RoleBadgeItem {
  roleKey: string;
  roleName?: string;
  isPlatform?: boolean;
}

/** Display order: school admin, then teacher/AP, then staff, then licence, then platform/other. */
const ROLE_PRIORITY: Record<string, number> = {
  SCHOOL_ADMIN: 1,
  TEACHER: 2,
  SCHOOL_STAFF: 3,
  SCHOOL_LICENCE: 4,
  PLATFORM_ADMIN: 5,
};

function getRolePriority(roleKey: string): number {
  const k = roleKey || "";
  if (k === "SCHOOL_ADMIN") return 1;
  if (k === "TEACHER" || k.includes("TEACHER")) return 2;
  if (k === "SCHOOL_STAFF") return 3;
  if (k === "SCHOOL_LICENCE") return 4;
  return ROLE_PRIORITY[k] ?? 6;
}

function getBadgeClasses(roleKey: string, isPlatform: boolean): string {
  const normalizedRoleKey = roleKey.toUpperCase();

  if (normalizedRoleKey === "INTRADARK_DEV") {
    return "bg-gradient-to-br from-[#ffd86f] via-[#c29b32] to-[#7b5a00] text-white border-[#c29b32]/60";
  }
  if (isPlatform && normalizedRoleKey === "PLATFORM_MODERATOR") {
    return "bg-gradient-to-br from-[#2aa6ae] via-[#00858e] to-[#00626a] text-white border-[#00858e]/60";
  }
  if (isPlatform && normalizedRoleKey === "PLATFORM_STAFF") {
    return "bg-gradient-to-br from-[#6f9fbd] via-[#5b86a3] to-[#3f6784] text-white border-[#5b86a3]/60";
  }
  if (
    isPlatform &&
    (normalizedRoleKey === "GOVERNMENT_VIEWER" ||
      normalizedRoleKey === "GOVERNMENT_ADMIN")
  ) {
    return "bg-gradient-to-br from-[#9ca3af] via-[#6b7280] to-[#4b5563] text-white border-[#6b7280]/60";
  }
  if (roleKey === "TEACHER") {
    return "bg-[var(--role-teacher)] text-[var(--role-teacher-text)] border-[var(--role-teacher)]/50";
  }
  if (isPlatform && normalizedRoleKey === "PLATFORM_ADMIN") {
    return "bg-gradient-to-br from-[#f3967f] via-[var(--role-platform-admin)] to-[#c95f41] text-[var(--role-platform-admin-text)] border-[var(--role-platform-admin)]/60";
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

function getRoleIcon(
  roleKey: string,
  isAdmin: boolean,
  roleName?: string
): string | ComponentType<{ className?: string }> {
  const normalizedRoleKey = roleKey.toUpperCase();

  if (normalizedRoleKey === "INTRADARK_DEV") return "/images/intradark-blue-star.svg";
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
  /**
   * Show only the highest access level. Each level includes the ones below it
   * (School Admin > AP Teacher > Staff), so lists display one badge per user.
   */
  highestOnly?: boolean;
  className?: string;
}

export function RoleBadges({
  roles,
  variant = "joined",
  size = "sm",
  lastConnectsToRight = false,
  highestOnly = false,
  className,
}: RoleBadgesProps) {
  if (roles.length === 0) return null;

  const prioritised = [...roles].sort((a, b) => {
    const aPriority = getRolePriority(a.roleKey);
    const bPriority = getRolePriority(b.roleKey);
    if (aPriority !== bPriority) return aPriority - bPriority;
    return (a.roleName || a.roleKey).localeCompare(b.roleName || b.roleKey);
  });
  const sortedRoles = highestOnly ? prioritised.slice(0, 1) : prioritised;

  const iconClass = size === "sm" ? "h-4 w-4" : "h-5 w-5";
  const badgeTextShadowClass = "[text-shadow:0_1px_0_rgba(255,255,255,0.22),0_2px_3px_rgba(0,0,0,0.58)]";
  const badgeIconShadowClass =
    "[filter:drop-shadow(0_1px_0_rgba(255,255,255,0.22))_drop-shadow(0_2px_3px_rgba(0,0,0,0.58))]";
  const intradarkIconShadowClass =
    "[filter:drop-shadow(0_1px_0_rgba(255,255,255,0.11))_drop-shadow(0_1px_2px_rgba(0,0,0,0.29))]";
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
        const roleIcon = getRoleIcon(roleKey, isAdmin, role.roleName);
        const RoleIcon = typeof roleIcon === "string" ? null : roleIcon;
        const displayName = role.roleName || roleKey || "Unknown";
        const isIntradarkDev =
          typeof roleIcon === "string" &&
          roleIcon === "/images/intradark-blue-star.svg";

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
            {typeof roleIcon === "string" ? (
              <Image
                src={roleIcon}
                alt="Role Icon"
                aria-hidden="true"
                className={cn(
                  iconClass,
                  isIntradarkDev ? intradarkIconShadowClass : badgeIconShadowClass,
                  isIntradarkDev && "motion-safe:animate-spin-slow",
                  isIntradarkDev && "!h-3 !w-3"
                )}
                width={12}
                height={12}
              />
            ) : (
              RoleIcon && (
                <RoleIcon
                  className={cn(iconClass, "text-current", badgeIconShadowClass)}
                />
              )
            )}
            <span className={badgeTextShadowClass}>{displayName}</span>
          </Badge>
        );
      })}
    </div>
  );
}
