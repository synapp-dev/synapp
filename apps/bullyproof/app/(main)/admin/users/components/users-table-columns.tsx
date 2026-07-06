import { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown } from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import { Badge } from "@workspace/ui/components/badge";
import {
  meApi,
  type UserWithRolesAndSchools,
} from "@/entities/me/api/endpoints";
import { ShieldCheck, Users as UsersIcon } from "lucide-react";
import { cn } from "@workspace/ui/lib/utils";

export type User = UserWithRolesAndSchools;

/**
 * Get badge styling based on days since last activity
 * @param lastLoginAt ISO timestamp string or null (from last_seen_at / activity tracking)
 * @returns className string for badge styling
 */
function getLastLoginBadgeStyle(lastLoginAt: string | null): string {
  if (!lastLoginAt) {
    // No recent activity - red
    return "bg-red-500/5 border-red-500/5 text-red-700 dark:text-red-400";
  }

  const now = new Date().getTime();
  const lastLogin = new Date(lastLoginAt).getTime();
  const daysSince = Math.floor((now - lastLogin) / (1000 * 60 * 60 * 24));

  if (daysSince < 2) {
    // Less than 2 days - green
    return "bg-green-500/5 border-green-500/5 text-green-700 dark:text-green-400";
  } else if (daysSince < 5) {
    // Less than 5 days - orange
    return "bg-orange-500/5 border-orange-500/5 text-orange-700 dark:text-orange-400";
  } else {
    // 5 or more days - red
    return "bg-red-500/5 border-red-500/5 text-red-700 dark:text-red-400";
  }
}

/**
 * Get dot color class based on days since last activity
 * @param lastLoginAt ISO timestamp string or null (from last_seen_at / activity tracking)
 * @returns className string for dot color
 */
function getLastLoginDotColor(lastLoginAt: string | null): string {
  if (!lastLoginAt) {
    // No recent activity - red
    return "bg-red-500";
  }

  const now = new Date().getTime();
  const lastLogin = new Date(lastLoginAt).getTime();
  const daysSince = Math.floor((now - lastLogin) / (1000 * 60 * 60 * 24));

  if (daysSince < 2) {
    // Less than 2 days - green
    return "bg-green-500";
  } else if (daysSince < 5) {
    // Less than 5 days - orange
    return "bg-orange-500";
  } else {
    // 5 or more days - red
    return "bg-red-500";
  }
}

/**
 * Format time since last activity in compact format (11h, 5d, 1w, 1y)
 * @param lastLoginAt ISO timestamp string or null (from last_seen_at / activity tracking)
 * @returns Formatted string like "11h", "5d", "1w", "1y", or "Never"
 */
function formatLastLogin(lastLoginAt: string | null): string {
  if (!lastLoginAt) {
    return "Never";
  }

  const now = new Date().getTime();
  const lastLogin = new Date(lastLoginAt).getTime();
  const diffMs = now - lastLogin;

  const minutes = Math.floor(diffMs / (1000 * 60));
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const weeks = Math.floor(days / 7);
  const years = Math.floor(days / 365);

  if (years > 0) {
    return `${years}y`;
  } else if (weeks > 0) {
    return `${weeks}w`;
  } else if (days > 0) {
    return `${days}d`;
  } else if (hours > 0) {
    return `${hours}h`;
  } else if (minutes > 0) {
    return `${minutes}m`;
  } else {
    return "Just now";
  }
}

export const columns: ColumnDef<User>[] = [
  {
    accessorKey: "name",
    header: ({ column }) => {
      return (
        <div className="text-left pl-4">
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="h-8 px-2 lg:px-3"
          >
            User
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        </div>
      );
    },
    cell: ({ row }) => {
      const user = row.original;
      const getFullName = (user: UserWithRolesAndSchools) => {
        const parts = [user.firstName, user.lastName].filter(Boolean);
        return parts.length > 0 ? parts.join(" ") : user.email;
      };

      const isSchoolLicenceAccount = (user: UserWithRolesAndSchools) => {
        return user.schoolRoles.some((sr) => sr.roleKey === "SCHOOL_LICENCE");
      };

      const getDisplayName = (user: UserWithRolesAndSchools) => {
        if (isSchoolLicenceAccount(user)) {
          const licenceSchoolRole = user.schoolRoles.find(
            (sr) => sr.roleKey === "SCHOOL_LICENCE"
          );
          const schoolName = licenceSchoolRole?.schoolName || "Unknown School";
          return schoolName;
        }
        return getFullName(user);
      };

      return (
        <div className="text-left pl-4">
          <div className="font-medium text-base flex items-center gap-2">
            {getDisplayName(user)}
            {isSchoolLicenceAccount(user) && (
              <Badge
                variant="outline"
                className="text-[10px] py-0 px-2 bg-transparent text-muted-foreground mt-0.5"
              >
                Licence
              </Badge>
            )}
          </div>
          <div className="text-xs text-muted-foreground -mt-0.5">{user.email}</div>
        </div>
      );
    },
  },
  {
    accessorKey: "roles",
    header: () => {
      return <div className="text-left">Access Levels</div>;
    },
    cell: ({ row }) => {
      const user = row.original;
      // This will be populated with role data
      return <div className="text-left">—</div>;
    },
  },
  {
    accessorKey: "lastLoginAt",
    header: ({ column }) => {
      return (
        <div className="text-left">
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="h-8 px-2 lg:px-3"
          >
            Last Active
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        </div>
      );
    },
    sortingFn: (rowA, rowB) => {
      const a = rowA.getValue("lastLoginAt") as string | null;
      const b = rowB.getValue("lastLoginAt") as string | null;

      // Null values (no activity) should sort last
      if (!a && !b) return 0;
      if (!a) return 1; // a is null, sort it after b
      if (!b) return -1; // b is null, sort it after a

      // Compare dates
      return new Date(a).getTime() - new Date(b).getTime();
    },
    cell: ({ row }) => {
      const lastLoginAt = row.getValue("lastLoginAt") as string | null;
      const badgeStyle = getLastLoginBadgeStyle(lastLoginAt);
      const dotColor = getLastLoginDotColor(lastLoginAt);
      const formattedTime = formatLastLogin(lastLoginAt);

      return (
        <div className="text-left">
          <Badge
            variant="outline"
            className={cn("flex items-center gap-1 px-2 py-1", badgeStyle)}
          >
            <div className={cn("h-1 w-1 rounded-full", dotColor)} />
            <span>{formattedTime}</span>
          </Badge>
        </div>
      );
    },
  },
  {
    accessorKey: "createdAt",
    header: ({ column }) => {
      return (
        <div className="text-left">
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="h-8 px-2 lg:px-3"
          >
            Created
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        </div>
      );
    },
    cell: ({ row }) => {
      const createdAt = row.getValue("createdAt") as string | null;
      const formatDate = (dateString: string | null) => {
        if (!dateString) return "N/A";
        const date = new Date(dateString);
        return date.toLocaleDateString("en-US", {
          year: "numeric",
          month: "short",
          day: "numeric",
        });
      };
      return (
        <div className="text-left text-sm text-muted-foreground">
          {formatDate(createdAt)}
        </div>
      );
    },
  },
];
