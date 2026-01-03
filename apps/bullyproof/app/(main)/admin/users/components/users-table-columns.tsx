import { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown } from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import { Badge } from "@workspace/ui/components/badge";
import {
  meApi,
  type UserWithRolesAndSchools,
} from "@/entities/me/api/endpoints";
import { ShieldCheck, Users as UsersIcon } from "lucide-react";

export type User = UserWithRolesAndSchools;

export const columns: ColumnDef<User>[] = [
  {
    accessorKey: "name",
    header: ({ column }) => {
      return (
        <div className="text-left">
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
          return `${schoolName} (LICENCE)`;
        }
        return getFullName(user);
      };

      return (
        <div className="text-left">
          <div className="font-medium">{getDisplayName(user)}</div>
          <div className="text-sm text-muted-foreground">{user.email}</div>
        </div>
      );
    },
  },
  {
    accessorKey: "roles",
    header: () => {
      return <div className="text-left">Roles</div>;
    },
    cell: ({ row }) => {
      const user = row.original;
      // This will be populated with role data
      return <div className="text-left">—</div>;
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
