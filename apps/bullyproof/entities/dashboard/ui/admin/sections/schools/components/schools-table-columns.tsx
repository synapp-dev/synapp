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
  state: string;
  sector: "government" | "catholic" | "independent";
  activeTeachers: number;
  totalTeachers: number;
  lessonsDelivered: number;
  engagementPercentage: number;
  cultureRating: number;
  lastActiveDays: number;
  status: "active" | "pending" | "inactive";
  address?: string;
  joinedDate: string;
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
          <div className="text-sm font-medium">{school.state}</div>
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
    accessorKey: "teachers",
    header: "Teachers",
    cell: ({ row }) => {
      const school = row.original;
      return (
        <div className="text-sm">
          <span className="font-medium text-green-600">
            {school.activeTeachers}
          </span>
          <span className="text-muted-foreground">
            {" "}
            / {school.totalTeachers}
          </span>
        </div>
      );
    },
  },
  {
    accessorKey: "lessonsDelivered",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-8 px-2 lg:px-3"
        >
          Lessons Delivered
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const lessons = row.getValue("lessonsDelivered") as number;
      return <div className="font-medium">{lessons}</div>;
    },
  },
  {
    accessorKey: "engagementPercentage",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-8 px-2 lg:px-3"
        >
          Engagement %
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const engagement = row.getValue("engagementPercentage") as number;
      const getEngagementColor = (value: number) => {
        if (value >= 80) return "text-green-600 bg-green-50";
        if (value >= 50) return "text-yellow-600 bg-yellow-50";
        return "text-red-600 bg-red-50";
      };
      return (
        <Badge
          variant="outline"
          className={`${getEngagementColor(engagement)} border-0`}
        >
          {engagement}%
        </Badge>
      );
    },
  },
  {
    accessorKey: "cultureRating",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-8 px-2 lg:px-3"
        >
          Culture Rating
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const rating = row.getValue("cultureRating") as number;
      const getRatingColor = (value: number) => {
        if (value >= 4.5) return "text-green-600 bg-green-50";
        if (value >= 3.5) return "text-yellow-600 bg-yellow-50";
        return "text-red-600 bg-red-50";
      };
      return (
        <Badge
          variant="outline"
          className={`${getRatingColor(rating)} border-0`}
        >
          {rating.toFixed(1)}/5.0
        </Badge>
      );
    },
  },
  {
    accessorKey: "lastActiveDays",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-8 px-2 lg:px-3"
        >
          Last Active
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const days = row.getValue("lastActiveDays") as number;
      const getLastActiveText = (days: number) => {
        if (days === 0) return "Today";
        if (days === 1) return "1 day ago";
        return `${days} days ago`;
      };
      const getLastActiveColor = (days: number) => {
        if (days <= 3) return "text-green-600";
        if (days <= 7) return "text-yellow-600";
        return "text-red-600";
      };
      return (
        <div className={`text-sm ${getLastActiveColor(days)}`}>
          {getLastActiveText(days)}
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
