"use client";

import { useMemo, useState } from "react";
import type { UseQueryResult } from "@tanstack/react-query";
import { Badge } from "@workspace/ui/components/badge";
import { Input } from "@workspace/ui/components/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import type { InvoicesListPayload } from "@/entities/invoices/model/types";

function formatCurrency(cents: number): string {
  return `$${(Math.abs(cents) / 100).toLocaleString("en-AU", { minimumFractionDigits: 2 })}`;
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("en-AU", { day: "numeric", month: "short", year: "numeric" }).format(
    new Date(iso),
  );
}

type AllInvoicesListProps = {
  organisation: string;
  venue: string;
  listQuery: UseQueryResult<InvoicesListPayload>;
  onOpenInvoice: (invoiceId: string) => void;
};

export function AllInvoicesList({
  organisation,
  venue,
  listQuery,
  onOpenInvoice,
}: AllInvoicesListProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const invoices = listQuery.data?.invoices ?? [];

  const filtered = useMemo(() => {
    let items = invoices;
    if (statusFilter !== "all") {
      items = items.filter((i) => i.reviewStatus === statusFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      items = items.filter(
        (i) =>
          i.invoiceNumber?.toLowerCase().includes(q) ||
          i.supplierName?.toLowerCase().includes(q),
      );
    }
    return items;
  }, [invoices, search, statusFilter]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Input
          placeholder="Search invoices..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-md"
        />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="pending_review">Pending review</SelectItem>
            <SelectItem value="pending_approval">Pending approval</SelectItem>
            <SelectItem value="confirmed">Confirmed</SelectItem>
            <SelectItem value="disputed">Disputed</SelectItem>
            <SelectItem value="duplicate">Duplicate</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="overflow-hidden rounded-md border">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
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
                <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                  Loading…
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                  No invoices found.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((inv) => (
                <TableRow
                  key={inv.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => onOpenInvoice(inv.id)}
                >
                  <TableCell>{formatDate(inv.invoiceDate)}</TableCell>
                  <TableCell className="font-medium">{inv.supplierName ?? "—"}</TableCell>
                  <TableCell className="font-mono text-sm">{inv.invoiceNumber ?? "—"}</TableCell>
                  <TableCell className="text-right">{formatCurrency(inv.totalCents)}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{inv.reviewStatus.replace("_", " ")}</Badge>
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
