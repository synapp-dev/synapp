import { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown } from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import { Badge } from "@workspace/ui/components/badge";
export type School = {
  id: string;
  name: string;
  state: string | null;
  sector: "government" | "catholic" | "independent" | null;
  teacherCount: number;
  classCount: number;
  schoolAdminCount: number;
  schoolLicenceCount: number;
  staffCount?: number; // Number of users with SCHOOL_STAFF role
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

  // Filter out null/undefined/non-string values and normalize level names to lowercase for comparison
  const normalizedLevels = levels
    .filter((level): level is string => typeof level === "string" && level != null)
    .map((level) => level.toLowerCase().trim())
    .filter((level) => level.length > 0); // Remove empty strings after trimming

  if (normalizedLevels.length === 0) {
    return "—";
  }

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
  const firstLevel = normalizedLevels[0];
  return firstLevel
    ? firstLevel.charAt(0).toUpperCase() + firstLevel.slice(1).toLowerCase()
    : "—";
}

export const columns: ColumnDef<School>[] = [
  {
    accessorKey: "status",
    meta: {
      align: "right",
    },
    header: ({ column }) => {
      return (
        <div className="text-right pl-1">
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
        <div className="text-right flex items-center justify-end pl-1">
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
        <div className="text-left pl-2">
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
        <div className="text-left font-medium text-blue-600 hover:text-blue-800 cursor-pointer">
          {school.name}
        </div>
      );
    },
  },
  {
    accessorKey: "levels",
    header: ({ column }) => {
      return (
        <div className="text-left pl-2">
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
        <div className="text-left pl-2">
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
        <div className="text-left pl-2">
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
            variant="outline"
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
    accessorKey: "staffCount",
    meta: {
      align: "right",
    },
    header: ({ column }) => {
      return (
        <div className="w-full flex justify-end pr-2">
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="h-8 px-2 lg:px-3"
          >
            Staff
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        </div>
      );
    },
    cell: ({ row }) => {
      const staffCount = (row.getValue("staffCount") as number) ?? 0;
      return (
        <div className="w-full text-right text-sm font-medium text-purple-600">
          {staffCount}
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
        <div className="w-full flex justify-end pr-2">
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
        <div className="w-full flex justify-end pr-2">
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
];
