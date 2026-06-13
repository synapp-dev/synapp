"use client";

import { useState } from "react";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import { useSupplierRawItemsQuery } from "@/entities/supplier-raw-items/model/useSupplierRawItemsQuery";
import { RawItemFormSheet } from "@/entities/supplier-raw-items/components/raw-item-form-sheet";
import type { SupplierRawItemSummary } from "@/entities/supplier-raw-items/model/types";

function formatCurrency(cents: number | null): string {
  if (cents == null) return "—";
  return `$${(cents / 100).toLocaleString("en-AU", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function sourceLabel(source: string): string {
  switch (source) {
    case "xero_api":
      return "Xero";
    case "invoice_parse":
      return "Invoice";
    case "manual":
      return "Manual";
    default:
      return source;
  }
}

type RawItemsTableProps = {
  organisation: string;
  venue: string;
  supplierId: string;
};

export function RawItemsTable({ organisation, venue, supplierId }: RawItemsTableProps) {
  const [search, setSearch] = useState("");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<SupplierRawItemSummary | null>(null);

  const query = useSupplierRawItemsQuery({
    organisationSlug: organisation,
    venueSlug: venue,
    supplierId,
    search,
  });

  const items = query.data?.items ?? [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Input
          placeholder="Search raw items..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-9 max-w-sm"
        />
        <Button
          size="sm"
          className="gap-1.5"
          onClick={() => {
            setEditing(null);
            setSheetOpen(true);
          }}
        >
          <Plus className="h-4 w-4" />
          Add raw item
        </Button>
      </div>

      {query.isLoading ? (
        <div className="text-muted-foreground flex items-center gap-2 text-sm">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading raw items…
        </div>
      ) : items.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          No raw items yet. Import from Xero or add items manually — these are stored exactly as
          they appear on supplier invoices before unit normalisation.
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Description</TableHead>
              <TableHead>Unit</TableHead>
              <TableHead>Last price</TableHead>
              <TableHead>Source</TableHead>
              <TableHead className="w-[80px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">{item.rawDescription}</TableCell>
                <TableCell>{item.rawUnit ?? "—"}</TableCell>
                <TableCell>{formatCurrency(item.lastUnitPriceCents)}</TableCell>
                <TableCell>
                  <Badge variant="secondary">{sourceLabel(item.source)}</Badge>
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setEditing(item);
                      setSheetOpen(true);
                    }}
                  >
                    Edit
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <RawItemFormSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        organisation={organisation}
        venue={venue}
        supplierId={supplierId}
        item={editing}
        onSaved={() => {
          setSheetOpen(false);
          toast.success(editing ? "Raw item updated" : "Raw item added");
        }}
      />
    </div>
  );
}
