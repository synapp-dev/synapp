import { Badge } from "@workspace/ui/components/badge";
import { cn } from "@workspace/ui/lib/utils";
import { Users as UsersIcon, ShieldCheck } from "lucide-react";
import type { Role } from "./types";

interface RoleBadgeProps {
  role: Role;
  isSelected?: boolean;
  onClick?: () => void;
  className?: string;
}

export function RoleBadge({
  role,
  isSelected = false,
  onClick,
  className,
}: RoleBadgeProps) {
  const roleKey = role.key || "";

  const getBadgeClasses = (roleKey: string) => {
    if (roleKey === "TEACHER") {
      return "bg-[var(--role-teacher)] text-[var(--role-teacher-text)] border-[var(--role-teacher)]/50";
    } else if (roleKey === "SCHOOL_ADMIN") {
      return "bg-[var(--role-school-admin)] text-[var(--role-school-admin-text)] border-[var(--role-school-admin)]/50";
    } else if (roleKey === "SCHOOL_STAFF") {
      return "bg-[var(--role-school-staff)] text-[var(--role-school-staff-text)] border-[var(--role-school-staff)]/50";
    } else if (roleKey === "PLATFORM_ADMIN") {
      return "bg-[var(--role-platform-admin)] text-[var(--role-platform-admin-text)] border-[var(--role-platform-admin)]/50";
    }
    return "";
  };

  const getRoleColor = (roleKey: string) => {
    if (roleKey === "TEACHER") {
      return "var(--role-teacher)";
    } else if (roleKey === "SCHOOL_ADMIN") {
      return "var(--role-school-admin)";
    } else if (roleKey === "SCHOOL_STAFF") {
      return "var(--role-school-staff)";
    }
    return "var(--foreground)";
  };

  const roleColor = getRoleColor(roleKey);
  let RoleIcon = UsersIcon;
  if (roleKey === "TEACHER") {
    RoleIcon = UsersIcon;
  } else if (roleKey === "SCHOOL_ADMIN" || roleKey === "PLATFORM_ADMIN") {
    RoleIcon = ShieldCheck;
  }

  return (
    <Badge
      variant={isSelected ? "default" : "outline"}
      className={cn(
        "flex items-center gap-1 border px-2 py-1 transition-all",
        isSelected ? getBadgeClasses(roleKey) : "bg-transparent hover:animate-pulse",
        onClick && "cursor-pointer",
        className
      )}
      style={
        !isSelected
          ? {
              borderColor: `${roleColor}40`,
              color: roleColor,
            }
          : undefined
      }
      onClick={onClick}
    >
      <RoleIcon
        className="h-3 w-3"
        style={!isSelected ? { color: roleColor } : undefined}
      />
      {role.name}
    </Badge>
  );
}
