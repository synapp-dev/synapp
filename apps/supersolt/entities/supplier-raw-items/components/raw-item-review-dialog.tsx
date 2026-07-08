"use client";

import { useEffect, useState } from "react";
import { ArrowDown, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@workspace/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { useSupplierRawItemMutations } from "@/entities/supplier-raw-items/model/useSupplierRawItemMutations";
import type { SupplierRawItemSummary } from "@/entities/supplier-raw-items/model/types";
import { InvoiceDocumentPreview } from "@/entities/invoices/components/invoice-document-preview";
import { useVenueInvoiceDetailQuery } from "@/entities/invoices/model/use-venue-invoice-detail-query";

type RawItemReviewDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organisation: string;
  venue: string;
  supplierId: string;
  item: SupplierRawItemSummary | null;
  /** Most recent invoice this item appeared on, shown as a reference. */
  invoiceId: string | null;
  onSaved: (approved: boolean) => void;
};

function formatCurrency(cents: number | null, currency = "AUD"): string {
  if (cents == null) return "—";
  return new Intl.NumberFormat("en-AU", { style: "currency", currency }).format(
    cents / 100,
  );
}

function centsToInput(cents: number | null): string {
  if (cents == null) return "";
  return (cents / 100).toFixed(2);
}

function inputToCents(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed)) return null;
  return Math.round(parsed * 100);
}

export function RawItemReviewDialog({
  open,
  onOpenChange,
  organisation,
  venue,
  supplierId,
  item,
  invoiceId,
  onSaved,
}: RawItemReviewDialogProps) {
  const [description, setDescription] = useState("");
  const [unit, setUnit] = useState("");
  const [price, setPrice] = useState("");
  const [quantity, setQuantity] = useState("");

  const { updateRawItem } = useSupplierRawItemMutations({
    organisationSlug: organisation,
    venueSlug: venue,
    supplierId,
  });

  // Pull the source invoice so we can show the exact line it was detected from.
  const detailQuery = useVenueInvoiceDetailQuery({
    organisationSlug: organisation,
    venueSlug: venue,
    invoiceId,
  });

  useEffect(() => {
    if (open && item) {
      setDescription(item.rawDescription);
      setUnit(item.rawUnit ?? "");
      setPrice(centsToInput(item.lastUnitPriceCents));
      setQuantity(item.lastQuantity != null ? String(item.lastQuantity) : "");
    }
  }, [open, item]);

  const pending = updateRawItem.isPending;
  const approved = item?.reviewedAt != null;
  const currency = detailQuery.data?.invoice?.currencyCode ?? "AUD";

  // The matched invoice line (by description) — falls back to the item's stored
  // last-seen values if the exact line can't be located on this invoice.
  const norm = item?.rawDescription.trim().toLowerCase() ?? null;
  const matchedLine =
    norm != null
      ? (detailQuery.data?.lineItems ?? []).find(
          (l) => (l.parsedDescription ?? "").trim().toLowerCase() === norm,
        )
      : undefined;

  const detected = item
    ? {
        description: matchedLine?.parsedDescription ?? item.rawDescription,
        quantity:
          matchedLine?.quantity ??
          (item.lastQuantity != null ? String(item.lastQuantity) : null),
        unit: matchedLine?.unit ?? item.rawUnit,
        priceCents: matchedLine?.unitPriceCents ?? item.lastUnitPriceCents,
      }
    : null;

  async function save(markReviewed: boolean) {
    if (!item) return;
    const trimmed = description.trim();
    if (!trimmed) {
      toast.error("Description is required");
      return;
    }
    const qtyParsed = quantity.trim() ? Number(quantity) : null;
    const lastQuantity =
      qtyParsed != null && Number.isFinite(qtyParsed) ? qtyParsed : null;
    try {
      await updateRawItem.mutateAsync({
        rawItemId: item.id,
        payload: {
          rawDescription: trimmed,
          rawUnit: unit.trim() || null,
          lastUnitPriceCents: inputToCents(price),
          lastQuantity,
          ...(markReviewed ? { reviewed: true } : {}),
        },
      });
      onSaved(markReviewed);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save item");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[90vh] max-h-[90vh] w-[min(98vw,80rem)] max-w-none flex-col gap-0 overflow-hidden p-0 sm:max-w-[80rem]">
        <DialogHeader className="border-b px-5 py-4">
          <DialogTitle className="flex items-center gap-2">
            {item?.rawDescription ?? "Review item"}
            {approved ? (
              <span className="text-primary inline-flex items-center gap-1 text-xs font-medium">
                <Check className="h-3.5 w-3.5" /> Approved
              </span>
            ) : null}
          </DialogTitle>
          <DialogDescription>
            Check the detected values against the source invoice, then approve.
          </DialogDescription>
        </DialogHeader>

        <div className="grid min-h-0 flex-1 gap-0 overflow-hidden md:grid-cols-5">
          {/* Left (2/5) — detected card, then editable fields */}
          <div className="flex min-h-0 flex-col overflow-y-auto border-b p-5 md:col-span-2 md:border-b-0 md:border-r">
            <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
              Detected
            </p>
            <div className="mt-2 rounded-lg border bg-muted/30 p-4">
              <p className="font-medium">{detected?.description ?? "—"}</p>
              <dl className="mt-3 grid grid-cols-3 gap-3 text-sm">
                <div>
                  <dt className="text-muted-foreground text-xs">Qty</dt>
                  <dd className="tabular-nums">{detected?.quantity ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground text-xs">Unit</dt>
                  <dd>{detected?.unit ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground text-xs">Unit price</dt>
                  <dd className="tabular-nums">
                    {formatCurrency(detected?.priceCents ?? null, currency)}
                  </dd>
                </div>
              </dl>
            </div>

            <div className="text-muted-foreground flex justify-center py-3" aria-hidden>
              <ArrowDown className="h-5 w-5" />
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="rev-description">Description</Label>
                <Input
                  id="rev-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="rev-unit">Unit</Label>
                  <Input
                    id="rev-unit"
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    placeholder="box, kg, each"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="rev-qty">Last quantity</Label>
                  <Input
                    id="rev-qty"
                    inputMode="decimal"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="rev-price">Last unit price ($)</Label>
                <Input
                  id="rev-price"
                  inputMode="decimal"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="0.00"
                />
              </div>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-2">
              <Button
                className="gap-1.5"
                disabled={pending}
                onClick={() => void save(true)}
              >
                {pending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
                Approve
              </Button>
              <Button
                variant="outline"
                disabled={pending}
                onClick={() => void save(false)}
              >
                Save changes
              </Button>
              <Button
                variant="ghost"
                disabled={pending}
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
            </div>
          </div>

          {/* Right (3/5) — source document */}
          <div className="min-h-0 overflow-hidden p-5 md:col-span-3">
            <InvoiceDocumentPreview
              organisation={organisation}
              venue={venue}
              invoiceId={invoiceId}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
