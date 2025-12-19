import { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown, MoreHorizontal } from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import { Badge } from "@workspace/ui/components/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
export type School = {
  id: string;
  name: string;
  state: string | null;
  sector: "government" | "catholic" | "independent" | null;
  teacherCount: number;
  classCount: number;
  schoolAdminCount: number;
  schoolLicenceCount: number;
  activeLicence: boolean;
  status: "onboarding" | "active";
  slug: string | null;
  levels?: string[] | null; // Array of level names (e.g., ["Primary", "Secondary"])
};

// Helper function to format school levels
function formatSchoolLevel(levels: string[] | null | undefined): string {
  if (!levels || levels.length === 0) {
    return "—";
  }

  // Normalize level names to lowercase for comparison
  const normalizedLevels = levels.map((level) => level.toLowerCase().trim());

  const hasPrimary = normalizedLevels.some(
    (level) => level === "primary" || level.includes("primary")
  );
  const hasSecondary = normalizedLevels.some(
    (level) => level === "secondary" || level.includes("secondary")
  );

  if (hasPrimary && hasSecondary) {
    return "P-12";
  } else if (hasPrimary) {
    return "Primary";
  } else if (hasSecondary) {
    return "Secondary";
  }

  // Fallback: return first level capitalized
  return levels[0]
    ? levels[0].charAt(0).toUpperCase() + levels[0].slice(1).toLowerCase()
    : "—";
}

export const columns: ColumnDef<School>[] = [
  {
    accessorKey: "status",
    header: ({ column }) => {
      return (
        <div className="text-left">
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="h-8 px-2 lg:px-3"
          >
            Status
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        </div>
      );
    },
    cell: ({ row }) => {
      const status = row.getValue("status") as "onboarding" | "active";
      return (
        <div className="text-left">
          <Badge
            variant="default"
            className={
              status === "onboarding"
                ? "bg-orange-100 text-orange-800 hover:bg-orange-100"
                : "bg-green-100 text-green-800 hover:bg-green-100"
            }
          >
            {status === "onboarding" ? "Onboarding" : "Active"}
          </Badge>
        </div>
      );
    },
  },
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
            School Name
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        </div>
      );
    },
    cell: ({ row }) => {
      const school = row.original;
      return (
        <div className="text-left font-medium text-blue-600 hover:text-blue-800 cursor-pointer pl-4">
          {school.name}
        </div>
      );
    },
  },
  {
    accessorKey: "levels",
    header: ({ column }) => {
      return (
        <div className="text-left">
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="h-8 px-2 lg:px-3"
          >
            School Level
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        </div>
      );
    },
    cell: ({ row }) => {
      const school = row.original;
      const levelDisplay = formatSchoolLevel(school.levels);
      return (
        <div className="text-left text-sm font-medium">{levelDisplay}</div>
      );
    },
  },
  {
    accessorKey: "state",
    header: ({ column }) => {
      return (
        <div className="text-left">
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="h-8 px-2 lg:px-3"
          >
            State
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        </div>
      );
    },
    cell: ({ row }) => {
      const state = row.getValue("state") as string | null;
      return (
        <div className="text-left text-sm font-medium">
          {state ? state.toUpperCase() : "—"}
        </div>
      );
    },
  },
  {
    accessorKey: "sector",
    header: ({ column }) => {
      return (
        <div className="text-left">
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="h-8 px-2 lg:px-3"
          >
            Sector
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        </div>
      );
    },
    cell: ({ row }) => {
      const school = row.original;
      if (!school.sector) {
        return <div className="text-left text-sm">—</div>;
      }
      return (
        <div className="text-left">
          <Badge
            variant={
              school.sector === "government"
                ? "default"
                : school.sector === "catholic"
                  ? "secondary"
                  : "outline"
            }
            className="text-xs"
          >
            {school.sector === "government"
              ? "Government"
              : school.sector === "catholic"
                ? "Catholic"
                : "Independent"}
          </Badge>
        </div>
      );
    },
  },
  {
    accessorKey: "teacherCount",
    meta: {
      align: "right",
    },
    header: ({ column }) => {
      return (
        <div className="w-full flex justify-end">
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="h-8 px-2 lg:px-3"
          >
            Teachers
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        </div>
      );
    },
    cell: ({ row }) => {
      const teacherCount = row.getValue("teacherCount") as number;
      return (
        <div className="w-full text-right text-sm font-medium text-green-600">
          {teacherCount}
        </div>
      );
    },
  },
  {
    accessorKey: "classCount",
    meta: {
      align: "right",
    },
    header: ({ column }) => {
      return (
        <div className="w-full flex justify-end">
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="h-8 px-2 lg:px-3"
          >
            Classes
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        </div>
      );
    },
    cell: ({ row }) => {
      const classCount = row.getValue("classCount") as number;
      return (
        <div className="w-full text-right text-sm font-medium text-blue-600">
          {classCount}
        </div>
      );
    },
  },
  {
    id: "actions",
    enableHiding: false,
    header: () => {
      return <div className="text-center">Actions</div>;
    },
    cell: ({ row }) => {
      const school = row.original;

      return (
        <div className="text-center">
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
                onClick={() => navigator.clipboard.writeText(school.id)}
              >
                Copy school ID
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>View details</DropdownMenuItem>
              <DropdownMenuItem>Edit school</DropdownMenuItem>
              <DropdownMenuItem>Deactivate</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      );
    },
  },
];
