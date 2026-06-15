"use client";

import { Fragment, useEffect, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  FileText,
  Loader2,
  Package,
  Plus,
} from "lucide-react";
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
import { cn } from "@workspace/ui/lib/utils";
import { useSupplierRawItemsQuery } from "@/entities/supplier-raw-items/model/useSupplierRawItemsQuery";
import { useSupplierRawItemSourcesQuery } from "@/entities/supplier-raw-items/model/useSupplierRawItemSourcesQuery";
import { RawItemFormSheet } from "@/entities/supplier-raw-items/components/raw-item-form-sheet";
import {
  groupSimilarRawItems,
  type RawItemGroup,
} from "@/entities/supplier-raw-items/lib/group-similar-raw-items";
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

type SourcesDialogState = {
  title: string;
  rows: SupplierRawItemSource[];
};

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
  const [sourcesDialog, setSourcesDialog] = useState<SourcesDialogState | null>(null);
  const [previewInvoiceId, setPreviewInvoiceId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

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

  function openEdit(item: SupplierRawItemSummary) {
    setEditing(item);
    setSheetOpen(true);
  }

  function toggleExpanded(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function sourcesForItem(itemId: string): SupplierRawItemSource[] {
    return sources[itemId] ?? [];
  }

  /** Distinct invoices across every variant in a group (deduped by invoice id). */
  function sourcesForGroup(group: RawItemGroup): SupplierRawItemSource[] {
    const byInvoice = new Map<string, SupplierRawItemSource>();
    for (const variant of group.variants) {
      for (const src of sourcesForItem(variant.id)) {
        if (!byInvoice.has(src.invoiceId)) byInvoice.set(src.invoiceId, src);
      }
    }
    return [...byInvoice.values()].sort((a, b) =>
      (b.invoiceDate ?? "").localeCompare(a.invoiceDate ?? ""),
    );
  }

  function InvoiceButton({
    title,
    rows,
  }: {
    title: string;
    rows: SupplierRawItemSource[];
  }) {
    return (
      <Button
        variant="outline"
        size="sm"
        className="h-7 gap-1.5"
        disabled={rows.length === 0}
        onClick={() => setSourcesDialog({ title, rows })}
      >
        <FileText className="h-3.5 w-3.5" />
        Invoice ({rows.length})
      </Button>
    );
  }

  function renderTable(label: string, rows: SupplierRawItemSummary[]) {
    const groups = groupSimilarRawItems(rows);
    return (
      <div className="space-y-2">
        <h4 className="text-sm font-semibold">
          {label} <span className="text-muted-foreground">({rows.length})</span>
        </h4>
        {groups.length === 0 ? (
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
                {groups.map((group) => {
                  const rep = group.representative;
                  const variantCount = group.variants.length;
                  const isGroup = variantCount > 1;
                  const isOpen = expanded.has(rep.id);
                  return (
                    <Fragment key={rep.id}>
                      <TableRow>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-1.5">
                            {isGroup ? (
                              <button
                                type="button"
                                className="text-muted-foreground hover:text-foreground -ml-1 flex items-center"
                                onClick={() => toggleExpanded(rep.id)}
                                aria-label={isOpen ? "Collapse" : "Expand"}
                              >
                                {isOpen ? (
                                  <ChevronDown className="h-4 w-4" />
                                ) : (
                                  <ChevronRight className="h-4 w-4" />
                                )}
                              </button>
                            ) : null}
                            <span>{rep.rawDescription}</span>
                            {isGroup ? (
                              <Badge variant="secondary" className="ml-1">
                                {variantCount} sizes
                              </Badge>
                            ) : null}
                          </div>
                        </TableCell>
                        <TableCell>{rep.rawUnit ?? "—"}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatCurrency(rep.lastUnitPriceCents)}
                        </TableCell>
                        <TableCell>
                          <InvoiceButton
                            title={rep.rawDescription}
                            rows={sourcesForGroup(group)}
                          />
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm" onClick={() => openEdit(rep)}>
                            Edit
                          </Button>
                        </TableCell>
                      </TableRow>

                      {isGroup && isOpen
                        ? group.variants.map((variant) => (
                            <TableRow key={variant.id} className="bg-muted/30">
                              <TableCell className="text-muted-foreground pl-9 text-sm">
                                {variant.rawDescription}
                              </TableCell>
                              <TableCell>{variant.rawUnit ?? "—"}</TableCell>
                              <TableCell className="text-right tabular-nums">
                                {formatCurrency(variant.lastUnitPriceCents)}
                              </TableCell>
                              <TableCell>
                                <InvoiceButton
                                  title={variant.rawDescription}
                                  rows={sourcesForItem(variant.id)}
                                />
                              </TableCell>
                              <TableCell>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => openEdit(variant)}
                                >
                                  Edit
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))
                        : null}
                    </Fragment>
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
          stockable inventory. Same product in different order quantities is grouped.
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
        open={sourcesDialog !== null}
        onOpenChange={(open) => !open && setSourcesDialog(null)}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="truncate">{sourcesDialog?.title}</DialogTitle>
            <DialogDescription>
              Seen on {sourcesDialog?.rows.length ?? 0} invoice
              {(sourcesDialog?.rows.length ?? 0) === 1 ? "" : "s"} from this supplier.
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
                {(sourcesDialog?.rows ?? []).map((src) => (
                  <TableRow
                    key={src.invoiceId}
                    className="cursor-pointer"
                    onClick={() => {
                      setSourcesDialog(null);
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
