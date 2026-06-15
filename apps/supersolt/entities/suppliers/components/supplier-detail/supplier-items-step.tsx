"use client";

import { useEffect, useState } from "react";
import { FileText, Loader2, Package, Plus } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import { useSupplierRawItemsQuery } from "@/entities/supplier-raw-items/model/useSupplierRawItemsQuery";
import { useSupplierRawItemSourcesQuery } from "@/entities/supplier-raw-items/model/useSupplierRawItemSourcesQuery";
import { RawItemFormSheet } from "@/entities/supplier-raw-items/components/raw-item-form-sheet";
import type {
  SupplierRawItemSource,
  SupplierRawItemSummary,
} from "@/entities/supplier-raw-items/model/types";
import { InvoiceDetailPanel } from "@/entities/invoices/components/invoice-detail-panel";
import { useOptionalInventorySetupImport } from "@/entities/inventory-setup/components/inventory-setup-import-provider";

function formatCurrency(cents: number | null): string {
  if (cents == null) return "—";
  return `$${(cents / 100).toLocaleString("en-AU", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

type SupplierItemsStepProps = {
  organisation: string;
  venue: string;
  supplierId: string;
};

export function SupplierItemsStep({
  organisation,
  venue,
  supplierId,
}: SupplierItemsStepProps) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<SupplierRawItemSummary | null>(null);
  const [sourcesItem, setSourcesItem] = useState<SupplierRawItemSummary | null>(null);
  const [previewInvoiceId, setPreviewInvoiceId] = useState<string | null>(null);

  const itemsQuery = useSupplierRawItemsQuery({
    organisationSlug: organisation,
    venueSlug: venue,
    supplierId,
  });
  const sourcesQuery = useSupplierRawItemSourcesQuery({
    organisationSlug: organisation,
    venueSlug: venue,
    supplierId,
  });

  // While the Xero import is still parsing invoices, items trickle in — poll so
  // the two tables fill in live as this supplier's bills are read.
  const importCtx = useOptionalInventorySetupImport();
  const importing = importCtx?.isImportInProgress ?? false;
  useEffect(() => {
    if (!importing) return;
    const interval = setInterval(() => {
      void itemsQuery.refetch();
      void sourcesQuery.refetch();
    }, 4000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [importing]);

  const items = itemsQuery.data?.items ?? [];
  const sources = sourcesQuery.data?.sources ?? {};

  // Null (manual / Xero-API backfill, never AI-classified) defaults to the
  // inventory table so nothing is hidden; only explicit `false` is "not inventory".
  const inventory = items.filter((i) => i.isLikelyInventory !== false);
  const nonInventory = items.filter((i) => i.isLikelyInventory === false);

  const sourcesForOpen: SupplierRawItemSource[] = sourcesItem
    ? (sources[sourcesItem.id] ?? [])
    : [];

  function openEdit(item: SupplierRawItemSummary) {
    setEditing(item);
    setSheetOpen(true);
  }

  function renderTable(label: string, rows: SupplierRawItemSummary[]) {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold">
            {label} <span className="text-muted-foreground">({rows.length})</span>
          </h4>
        </div>
        {rows.length === 0 ? (
          <p className="text-muted-foreground rounded-md border border-dashed px-3 py-4 text-sm">
            Nothing here yet.
          </p>
        ) : (
          <div className="overflow-hidden rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Description</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead className="text-right">Last price</TableHead>
                  <TableHead className="w-[130px]">Source</TableHead>
                  <TableHead className="w-[70px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((item) => {
                  const count = sources[item.id]?.length ?? 0;
                  return (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.rawDescription}</TableCell>
                      <TableCell>{item.rawUnit ?? "—"}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatCurrency(item.lastUnitPriceCents)}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 gap-1.5"
                          disabled={count === 0}
                          onClick={() => setSourcesItem(item)}
                        >
                          <FileText className="h-3.5 w-3.5" />
                          Invoice ({count})
                        </Button>
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" onClick={() => openEdit(item)}>
                          Edit
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground text-sm">
          Items pulled from this supplier&apos;s invoices, split by whether they look like
          stockable inventory.
        </p>
        <Button
          size="sm"
          className="gap-1.5"
          onClick={() => {
            setEditing(null);
            setSheetOpen(true);
          }}
        >
          <Plus className="h-4 w-4" />
          Add item
        </Button>
      </div>

      {importing ? (
        <div className="border-primary/20 bg-primary/5 text-primary flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
          <Loader2 className="h-4 w-4 animate-spin" />
          We&apos;re still reading this supplier&apos;s invoices — items will fill in as we go.
        </div>
      ) : null}

      {itemsQuery.isLoading ? (
        <div className="text-muted-foreground flex items-center gap-2 text-sm">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading items…
        </div>
      ) : items.length === 0 && !importing ? (
        <div className="rounded-md border border-dashed p-10 text-center">
          <Package className="text-muted-foreground mx-auto mb-3 h-10 w-10" />
          <p className="text-sm font-medium">No items yet</p>
          <p className="text-muted-foreground text-sm">
            Import from Xero or add items manually. Parsed invoice lines land here.
          </p>
        </div>
      ) : (
        <>
          {renderTable("Likely inventory", inventory)}
          {renderTable("Not inventory", nonInventory)}
        </>
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
          toast.success(editing ? "Item updated" : "Item added");
        }}
      />

      <Dialog
        open={sourcesItem !== null}
        onOpenChange={(open) => !open && setSourcesItem(null)}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="truncate">{sourcesItem?.rawDescription}</DialogTitle>
            <DialogDescription>
              Seen on {sourcesForOpen.length} invoice
              {sourcesForOpen.length === 1 ? "" : "s"} from this supplier.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-80 overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="w-[100px]">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sourcesForOpen.map((src) => (
                  <TableRow
                    key={src.invoiceId}
                    className="cursor-pointer"
                    onClick={() => {
                      setSourcesItem(null);
                      setPreviewInvoiceId(src.invoiceId);
                    }}
                  >
                    <TableCell className="font-medium">
                      {src.invoiceNumber ?? src.invoiceId.slice(0, 8)}
                    </TableCell>
                    <TableCell>{src.invoiceDate ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant={src.parsed ? "default" : "secondary"}>
                        {src.parsed ? "Parsed" : "Not parsed"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>

      <InvoiceDetailPanel
        organisation={organisation}
        venue={venue}
        invoiceId={previewInvoiceId}
        onClose={() => setPreviewInvoiceId(null)}
      />
    </div>
  );
}
