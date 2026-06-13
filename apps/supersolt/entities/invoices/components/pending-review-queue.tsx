"use client";

import { useMemo, useState } from "react";
import type { UseQueryResult } from "@tanstack/react-query";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Checkbox } from "@workspace/ui/components/checkbox";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Badge } from "@workspace/ui/components/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import type { InvoicesListPayload } from "@/entities/invoices/model/types";
import { invoicesApi } from "@/entities/invoices/api/endpoints";
import { invoiceKeys } from "@/entities/invoices/model/keys";

function formatCurrency(cents: number): string {
  const abs = Math.abs(cents);
  const formatted = `$${(abs / 100).toLocaleString("en-AU", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
  return cents < 0 ? `−${formatted}` : formatted;
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));
}

type PendingReviewQueueProps = {
  organisation: string;
  venue: string;
  listQuery: UseQueryResult<InvoicesListPayload>;
  onOpenInvoice: (invoiceId: string) => void;
};

export function PendingReviewQueue({
  organisation,
  venue,
  listQuery,
  onOpenInvoice,
}: PendingReviewQueueProps) {
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");

  const invoices = listQuery.data?.invoices ?? [];
  const meta = listQuery.data?.meta;

  const filtered = useMemo(() => {
    if (!search.trim()) return invoices;
    const q = search.toLowerCase();
    return invoices.filter(
      (inv) =>
        inv.invoiceNumber?.toLowerCase().includes(q) ||
        inv.supplierName?.toLowerCase().includes(q),
    );
  }, [invoices, search]);

  const bulkMutation = useMutation({
    mutationFn: () =>
      invoicesApi.bulkApprove({
        organisationSlug: organisation,
        venueSlug: venue,
        invoiceIds: [...selected],
      }),
    onSuccess: (res) => {
      if (res.error || !res.data) {
        toast.error("Bulk approve failed", { description: res.error?.message });
        return;
      }
      toast.success(`Approved ${res.data.approved.length} invoice(s)`);
      if (res.data.failed.length) {
        toast.warning(`${res.data.failed.length} failed`, {
          description: res.data.failed.map((f) => f.reason).join("; "),
        });
      }
      setSelected(new Set());
      void queryClient.invalidateQueries({ queryKey: invoiceKeys.all });
    },
  });

  const totalPending = (meta?.pendingReviewCount ?? 0) + (invoices.filter((i) => i.reviewStatus === "pending_approval").length);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {totalPending} awaiting review
          {meta?.disputedCount ? ` · ${meta.disputedCount} disputes` : ""}
          {meta?.duplicateCount ? ` · ${meta.duplicateCount} duplicates` : ""}
        </p>
        {selected.size > 0 ? (
          <Button size="sm" disabled={bulkMutation.isPending} onClick={() => bulkMutation.mutate()}>
            Approve selected ({selected.size})
          </Button>
        ) : null}
      </div>

      <Input
        placeholder="Search pending invoices..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-md"
      />

      <div className="overflow-hidden rounded-md border">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-10" />
              <TableHead>Date</TableHead>
              <TableHead>Supplier</TableHead>
              <TableHead>Invoice #</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Source</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {listQuery.isPending ? (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">
                  Loading…
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">
                  All caught up. New invoices will appear here automatically.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((inv) => (
                <TableRow
                  key={inv.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => onOpenInvoice(inv.id)}
                >
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={selected.has(inv.id)}
                      onCheckedChange={(checked) => {
                        setSelected((prev) => {
                          const next = new Set(prev);
                          if (checked) next.add(inv.id);
                          else next.delete(inv.id);
                          return next;
                        });
                      }}
                    />
                  </TableCell>
                  <TableCell>{formatDate(inv.invoiceDate)}</TableCell>
                  <TableCell className="font-medium">{inv.supplierName ?? "—"}</TableCell>
                  <TableCell className="font-mono text-sm">{inv.invoiceNumber ?? "—"}</TableCell>
                  <TableCell className="text-right font-medium">{formatCurrency(inv.totalCents)}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{inv.reviewStatus.replace("_", " ")}</Badge>
                  </TableCell>
                  <TableCell className="capitalize">{inv.source}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
