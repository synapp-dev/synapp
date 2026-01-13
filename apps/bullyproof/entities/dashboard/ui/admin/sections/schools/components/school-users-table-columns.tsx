import { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown } from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import { Badge } from "@workspace/ui/components/badge";
import { Checkbox } from "@workspace/ui/components/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
import { MoreHorizontal, ShieldCheck, Users as UsersIcon, FileBadge2 } from "lucide-react";
import type { UserWithRolesAndSchools } from "@/entities/me/api/endpoints";
import { cn } from "@workspace/ui/lib/utils";

export type SchoolUser = UserWithRolesAndSchools;

export const createSchoolUsersColumns = (
  schoolId: string
): ColumnDef<SchoolUser>[] => [
  {
    id: "select",
    header: ({ table }) => (
      <div className="pl-2">
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected()
              ? true
              : table.getIsSomePageRowsSelected()
                ? "indeterminate"
                : false
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
        />
      </div>
    ),
    cell: ({ row }) => (
      <div className="pl-2">
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
        />
      </div>
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorFn: (row) => {
      const fullName = [row.firstName, row.lastName]
        .filter(Boolean)
        .join(" ");
      return fullName || row.email || "Unknown User";
    },
    id: "name",
    filterFn: (row, id, value) => {
      const user = row.original;
      const fullName = [user.firstName, user.lastName]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      const email = user.email.toLowerCase();
      const searchValue = (value as string)?.toLowerCase() || "";
      return fullName.includes(searchValue) || email.includes(searchValue);
    },
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
    accessorKey: "role",
    header: () => {
      return <div className="text-left">Roles</div>;
    },
    cell: ({ row }) => {
      const user = row.original;
      const schoolRoles = user.schoolRoles.filter(
        (role) => role.schoolId === schoolId && role.roleKey
      );

      if (schoolRoles.length === 0) {
        return <span className="text-sm text-muted-foreground">None</span>;
      }

      const getBadgeClasses = (roleKey: string) => {
        if (roleKey === "TEACHER") {
          return "bg-[var(--role-teacher)] text-[var(--role-teacher-text)] border-[var(--role-teacher)]/50";
        } else if (roleKey === "SCHOOL_ADMIN") {
          return "bg-[var(--role-school-admin)] text-[var(--role-school-admin-text)] border-[var(--role-school-admin)]/50";
        } else if (roleKey === "SCHOOL_STAFF") {
          return "bg-[var(--role-school-staff)] text-[var(--role-school-staff-text)] border-[var(--role-school-staff)]/50";
        } else if (roleKey === "SCHOOL_LICENCE") {
          return "bg-[var(--role-school-licence)] text-[var(--role-school-licence-text)] border-[var(--role-school-licence)]/50";
        }
        return "";
      };

      // Sort roles in order: SCHOOL_STAFF, SCHOOL_ADMIN, TEACHER (or any teacher variant)
      const sortedRoles = [...schoolRoles].sort((a, b) => {
        const getRolePriority = (roleKey: string): number => {
          if (roleKey === "SCHOOL_STAFF") return 1;
          if (roleKey === "SCHOOL_ADMIN") return 2;
          if (roleKey === "TEACHER" || roleKey.includes("TEACHER")) return 3;
          return 4;
        };

        const aPriority = getRolePriority(a.roleKey || "");
        const bPriority = getRolePriority(b.roleKey || "");

        return aPriority - bPriority;
      });

      const roleCount = sortedRoles.length;

      return (
        <div className="flex items-center gap-0 flex-wrap">
          {sortedRoles.map((role, roleIdx) => {
            const roleKey = role.roleKey || "";
            const badgeClasses = getBadgeClasses(roleKey);
            const isFirst = roleIdx === 0;
            const isLast = roleIdx === roleCount - 1;
            const isAdmin = roleKey.includes("ADMIN") || roleKey.includes("admin");

            // Determine border radius classes
            let borderRadiusClass = "";
            if (roleCount === 1) {
              borderRadiusClass = "rounded-md";
            } else if (isFirst) {
              borderRadiusClass = "rounded-l-md rounded-r-none";
            } else if (isLast) {
              borderRadiusClass = "rounded-r-md rounded-l-none";
            } else {
              borderRadiusClass = "rounded-none";
            }

            return (
              <Badge
                key={`${role.roleKey}-${roleIdx}`}
                variant="default"
                className={cn(
                  "flex items-center gap-1 z-10 border px-2 py-1",
                  badgeClasses,
                  !isLast && "border-r-0 -mr-[1px]",
                  borderRadiusClass
                )}
              >
                {roleKey === "SCHOOL_LICENCE" ? (
                  <FileBadge2 className="h-3 w-3" />
                ) : isAdmin ? (
                  <ShieldCheck className="h-3 w-3" />
                ) : (
                  <UsersIcon className="h-3 w-3" />
                )}
                {role.roleName || roleKey}
              </Badge>
            );
          })}
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
  {
    id: "actions",
    enableHiding: false,
    cell: ({ row }) => {
      const user = row.original;

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem
              onClick={() => navigator.clipboard.writeText(user.id)}
            >
              Copy user ID
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>View user details</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];
