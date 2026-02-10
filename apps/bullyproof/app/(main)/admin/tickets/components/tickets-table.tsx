"use client";

import {
  Bug,
  Lightbulb,
  HelpCircle,
  MessageSquare,
  Clock,
  MessageCircle,
} from "lucide-react";
import { Badge } from "@workspace/ui/components/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AdminNote {
  id: string;
  authorId: string;
  authorName: string;
  authorRole: string;
  text: string;
  createdAt: string;
  readByUser: boolean;
}

export interface AdminTicket {
  id: string;
  userId: string;
  type: string;
  pagePath: string;
  description: string;
  screenshotUrl: string | null;
  status: string;
  adminNotes: AdminNote[] | null;
  createdAt: string;
  updatedAt: string | null;
  submitterFirstName: string | null;
  submitterLastName: string | null;
  submitterEmail: string | null;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TYPE_BADGE_MAP: Record<string, { label: string; className: string }> = {
  bug: {
    label: "Bug",
    className:
      "bg-red-100 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-400 dark:border-red-800",
  },
  feature: {
    label: "Feature",
    className:
      "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-400 dark:border-blue-800",
  },
  question: {
    label: "Question",
    className:
      "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-400 dark:border-amber-800",
  },
  feedback: {
    label: "Feedback",
    className:
      "bg-green-100 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-400 dark:border-green-800",
  },
};

const STATUS_BADGE_MAP: Record<string, { label: string; className: string }> = {
  open: {
    label: "Open",
    className:
      "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-400 dark:border-amber-800",
  },
  in_progress: {
    label: "In Progress",
    className:
      "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-400 dark:border-blue-800",
  },
  resolved: {
    label: "Resolved",
    className:
      "bg-green-100 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-400 dark:border-green-800",
  },
  closed: {
    label: "Closed",
    className: "bg-muted text-muted-foreground border-border",
  },
};

const TYPE_ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  bug: Bug,
  feature: Lightbulb,
  question: HelpCircle,
  feedback: MessageSquare,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffSec < 60) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 30) return `${diffDay}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

function getSubmitterName(ticket: AdminTicket): string {
  const parts = [ticket.submitterFirstName, ticket.submitterLastName].filter(Boolean);
  return parts.length > 0 ? parts.join(" ") : "Unknown";
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface TicketsTableProps {
  tickets: AdminTicket[];
  onRowClick: (ticket: AdminTicket) => void;
}

export function TicketsTable({ tickets, onRowClick }: TicketsTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[100px]">Status</TableHead>
          <TableHead className="w-[90px]">Type</TableHead>
          <TableHead>Description</TableHead>
          <TableHead className="w-[180px]">Submitted By</TableHead>
          <TableHead className="w-[200px]">Page</TableHead>
          <TableHead className="w-[100px]">Created</TableHead>
          <TableHead className="w-[60px]">Notes</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {tickets.map((ticket) => {
          const typeBadge = TYPE_BADGE_MAP[ticket.type] ?? {
            label: ticket.type,
            className: "bg-muted text-muted-foreground",
          };
          const statusBadge = STATUS_BADGE_MAP[ticket.status] ?? {
            label: ticket.status,
            className: "bg-muted text-muted-foreground",
          };
          const TypeIcon = TYPE_ICON_MAP[ticket.type] ?? MessageSquare;
          const notesCount = Array.isArray(ticket.adminNotes) ? ticket.adminNotes.length : 0;

          return (
            <TableRow
              key={ticket.id}
              className="cursor-pointer"
              onClick={() => onRowClick(ticket)}
            >
              <TableCell>
                <Badge variant="outline" className={`text-xs ${statusBadge.className}`}>
                  {statusBadge.label}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-1.5">
                  <TypeIcon className={`h-3.5 w-3.5 ${TYPE_BADGE_MAP[ticket.type]?.className.includes("text-red") ? "text-red-500" : TYPE_BADGE_MAP[ticket.type]?.className.includes("text-blue") ? "text-blue-500" : TYPE_BADGE_MAP[ticket.type]?.className.includes("text-amber") ? "text-amber-500" : "text-green-500"}`} />
                  <Badge variant="outline" className={`text-xs ${typeBadge.className}`}>
                    {typeBadge.label}
                  </Badge>
                </div>
              </TableCell>
              <TableCell className="max-w-[300px]">
                <p className="truncate text-sm">{ticket.description}</p>
              </TableCell>
              <TableCell>
                <div className="space-y-0.5">
                  <p className="text-sm font-medium truncate">{getSubmitterName(ticket)}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {ticket.submitterEmail}
                  </p>
                </div>
              </TableCell>
              <TableCell>
                <p className="text-xs text-muted-foreground truncate max-w-[180px]">
                  {ticket.pagePath}
                </p>
              </TableCell>
              <TableCell>
                <span className="text-xs text-muted-foreground whitespace-nowrap flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {timeAgo(ticket.createdAt)}
                </span>
              </TableCell>
              <TableCell>
                {notesCount > 0 && (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <MessageCircle className="h-3.5 w-3.5" />
                    {notesCount}
                  </span>
                )}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
