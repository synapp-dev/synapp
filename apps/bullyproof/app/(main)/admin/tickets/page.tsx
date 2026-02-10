"use client";

import { Suspense, useState, useEffect, useCallback } from "react";
import { Loader2, Inbox, RefreshCw } from "lucide-react";
import { usePageTitle } from "@/hooks/use-page-title";
import { createBrowserClient } from "@/utils/supabase/client";
import { Button } from "@workspace/ui/components/button";
import { Skeleton } from "@workspace/ui/components/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import { TicketsTable } from "./components/tickets-table";
import { TicketDetailDialog } from "./components/ticket-detail-dialog";
import type { AdminTicket } from "./components/tickets-table";

function TicketsPageContent() {
  const [tickets, setTickets] = useState<AdminTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTicket, setSelectedTicket] = useState<AdminTicket | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const supabase = createBrowserClient();

  const fetchTickets = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        setError("You must be logged in.");
        return;
      }

      const res = await fetch("/api/feedback-tickets", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? `HTTP ${res.status}`);
      }

      const data = await res.json();
      setTickets(data);
    } catch (e: any) {
      console.error("[admin/tickets] fetch error:", e);
      setError(e.message ?? "Failed to load tickets");
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  const handleRowClick = (ticket: AdminTicket) => {
    setSelectedTicket(ticket);
    setDialogOpen(true);
  };

  const handleTicketUpdated = (updatedTicket: Partial<AdminTicket> & { id: string }) => {
    setTickets((prev) =>
      prev.map((t) => (t.id === updatedTicket.id ? { ...t, ...updatedTicket } : t))
    );
    if (selectedTicket?.id === updatedTicket.id) {
      setSelectedTicket((prev) => (prev ? { ...prev, ...updatedTicket } : prev));
    }
  };

  if (loading) {
    return <SkeletonTable />;
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
        <p className="text-sm">{error}</p>
        <Button variant="outline" size="sm" onClick={fetchTickets}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      </div>
    );
  }

  if (tickets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
        <Inbox className="h-12 w-12" />
        <p className="text-sm font-medium">No tickets yet</p>
        <p className="text-xs">Feedback tickets submitted by users will appear here.</p>
      </div>
    );
  }

  return (
    <>
      <TicketsTable tickets={tickets} onRowClick={handleRowClick} />
      <TicketDetailDialog
        ticket={selectedTicket}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onTicketUpdated={handleTicketUpdated}
      />
    </>
  );
}

function SkeletonTable() {
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
        </TableRow>
      </TableHeader>
      <TableBody>
        {Array.from({ length: 8 }, (_, i) => (
          <TableRow key={i}>
            <TableCell>
              <Skeleton className="h-5 w-16" />
            </TableCell>
            <TableCell>
              <Skeleton className="h-5 w-14" />
            </TableCell>
            <TableCell>
              <Skeleton className="h-4 w-64" />
            </TableCell>
            <TableCell>
              <div className="space-y-1">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-32" />
              </div>
            </TableCell>
            <TableCell>
              <Skeleton className="h-4 w-36" />
            </TableCell>
            <TableCell>
              <Skeleton className="h-4 w-16" />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export default function AdminTicketsPage() {
  usePageTitle(["admin", "tickets"]);
  return (
    <Suspense fallback={<SkeletonTable />}>
      <div className="space-y-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Tickets</h2>
          <p className="text-muted-foreground text-sm">
            Manage user feedback tickets, bug reports, and feature requests.
          </p>
        </div>
        <TicketsPageContent />
      </div>
    </Suspense>
  );
}
