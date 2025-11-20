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
  slug: string | null;
};

export const columns: ColumnDef<School>[] = [
  {
    accessorKey: "name",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-8 px-2 lg:px-3"
        >
          School Name
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const school = row.original;
      return (
        <div className="font-medium text-blue-600 hover:text-blue-800 cursor-pointer">
          {school.name}
        </div>
      );
    },
  },
  {
    accessorKey: "state",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-8 px-2 lg:px-3"
        >
          State / Sector
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const school = row.original;
      return (
        <div className="space-y-1">
          <div className="text-sm font-medium">{school.state || "—"}</div>
          {school.sector && (
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
          )}
        </div>
      );
    },
  },
  {
    accessorKey: "teacherCount",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-8 px-2 lg:px-3"
        >
          Teachers
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const teacherCount = row.getValue("teacherCount") as number;
      return (
        <div className="text-sm font-medium text-green-600">
          {teacherCount}
        </div>
      );
    },
  },
  {
    id: "actions",
    enableHiding: false,
    cell: ({ row }) => {
      const school = row.original;

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
      );
    },
  },
];
