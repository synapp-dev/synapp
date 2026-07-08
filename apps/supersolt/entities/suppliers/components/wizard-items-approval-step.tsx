"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { Bot, Check, FileText, Highlighter, Loader2, PackageX, Undo2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@workspace/ui/components/button";
import { Checkbox } from "@workspace/ui/components/checkbox";
import { cn } from "@workspace/ui/lib/utils";

import { useSupplierReviewProductsQuery } from "@/entities/supplier-raw-items/model/useSupplierReviewProductsQuery";
import { useSupplierRawItemMutations } from "@/entities/supplier-raw-items/model/useSupplierRawItemMutations";
import type { SupplierReviewProduct } from "@/entities/supplier-raw-items/model/types";
import { type InvoiceAttachmentRef } from "@/entities/invoices/lib/invoice-attachment";
import { useInvoiceAttachmentPreview } from "@/entities/invoices/model/use-invoice-attachment-preview";
import { useVenueInvoiceDetailQuery } from "@/entities/invoices/model/use-venue-invoice-detail-query";
import type { InvoiceAttachmentRow } from "@/entities/invoices/model/types";

function formatPrice(cents: number | null | undefined): string {
  if (cents == null) return "—";
  return `$${(cents / 100).toLocaleString("en-AU", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

// Mirrors invoice-detail-panel's preview pickers (kept local to avoid coupling
// the wizard to that Sheet component).
function pickPreviewAttachment(
  local: InvoiceAttachmentRow[],
  xero: InvoiceAttachmentRow[],
): InvoiceAttachmentRow | null {
  const all = [...local, ...xero];
  const pdf =
    all.find((a) => a.mimeType === "application/pdf") ??
    all.find((a) => a.fileName.toLowerCase().endsWith(".pdf"));
  return pdf ?? all[0] ?? null;
}

function toAttachmentRef(attachment: InvoiceAttachmentRow): InvoiceAttachmentRef {
  if (attachment.source === "xero") {
    return { kind: "xero", fileName: attachment.fileName };
  }
  return { kind: "storage", attachmentId: attachment.id, fileName: attachment.fileName };
}

// react-pdf touches browser-only APIs at import — load it client-side only.
const HighlightedInvoicePdf = dynamic(
  () =>
    import("@/entities/invoices/components/highlighted-invoice-pdf").then(
      (m) => m.HighlightedInvoicePdf,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[480px] items-center justify-center">
        <Loader2 className="text-muted-foreground size-5 animate-spin" />
      </div>
    ),
  },
);

// Distinctive tokens to highlight in the invoice PDF for the current product.
function highlightTokensFor(product: SupplierReviewProduct): string[] {
  const base = product.canonicalName || product.aliases[0] || "";
  return base
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length >= 2);
}

type Scope = { organisation: string; venue: string; supplierId: string };

/**
 * The items step, triage-only: every item flagged as inventory is already
 * locked in (mapping into ingredients happens once, at the normalisation
 * stage), so the only human job here is rescuing anything the parser wrongly
 * flagged as non-inventory. Ticked rows flip back to inventory when the user
 * leaves the supplier — the wizard fires the confirm registered via
 * `onRegisterConfirm`, which also stamps the whole supplier's triage reviewed.
 */
export function WizardItemsApprovalStep({
  organisation,
  venue,
  supplierId,
  supplierName,
  onAllReviewedChange,
  onRegisterConfirm,
}: Scope & {
  supplierName: string;
  onAllReviewedChange?: (readyToLeave: boolean) => void;
  onRegisterConfirm?: (fn: (() => void) | null) => void;
}) {
  const productsQuery = useSupplierReviewProductsQuery({
    organisationSlug: organisation,
    venueSlug: venue,
    supplierId,
  });
  const { confirmItemsTriage } = useSupplierRawItemMutations({
    organisationSlug: organisation,
    venueSlug: venue,
    supplierId,
  });

  const products = productsQuery.data?.products ?? [];
  const inventoryProducts = useMemo(
    () => products.filter((p) => p.isLikelyInventory),
    [products],
  );
  const flaggedProducts = useMemo(
    () => products.filter((p) => !p.isLikelyInventory),
    [products],
  );

  // Product keys the user ticked to move back to inventory.
  const [rescuedKeys, setRescuedKeys] = useState<Set<string>>(new Set());
  const [previewInvoiceId, setPreviewInvoiceId] = useState<string | null>(null);
  const [previewProductKey, setPreviewProductKey] = useState<string | null>(null);

  // The step is ready to leave as soon as the list has loaded — there's nothing
  // mandatory to click. Rescues are optional corrections.
  useEffect(() => {
    onAllReviewedChange?.(productsQuery.isSuccess);
  }, [productsQuery.isSuccess, onAllReviewedChange]);

  // Register the one-shot confirm the wizard fires when leaving this supplier:
  // rescue the ticked rows, stamp the rest reviewed as they stand.
  const rescueMutate = confirmItemsTriage.mutate;
  useEffect(() => {
    if (!productsQuery.isSuccess) {
      onRegisterConfirm?.(null);
      return;
    }
    const rescueRawItemIds = flaggedProducts
      .filter((p) => rescuedKeys.has(p.key))
      .flatMap((p) => p.rawItemIds);
    const fire = () =>
      rescueMutate(
        { rescueRawItemIds },
        {
          onError: (error) =>
            toast.error(`Couldn't confirm ${supplierName}'s items`, {
              description: error instanceof Error ? error.message : "Please try again.",
              action: { label: "Retry", onClick: fire },
            }),
        },
      );
    onRegisterConfirm?.(fire);
  }, [
    productsQuery.isSuccess,
    flaggedProducts,
    rescuedKeys,
    supplierName,
    rescueMutate,
    onRegisterConfirm,
  ]);

  function toggleRescue(product: SupplierReviewProduct, rescued: boolean) {
    setRescuedKeys((prev) => {
      const next = new Set(prev);
      if (rescued) {
        next.add(product.key);
      } else {
        next.delete(product.key);
      }
      return next;
    });
    if (rescued) selectForPreview(product);
  }

  function selectForPreview(product: SupplierReviewProduct) {
    setPreviewProductKey(product.key);
    setPreviewInvoiceId(product.priceHistory[0]?.invoiceId ?? null);
  }

  if (productsQuery.isLoading) {
    return (
      <div className="flex min-h-[20rem] items-center justify-center">
        <Loader2 className="text-muted-foreground size-5 animate-spin" />
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="flex items-start gap-4">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-amber-500/15">
          <PackageX className="size-5 text-amber-600 dark:text-amber-400" />
        </span>
        <div className="space-y-1">
          <p className="text-sm font-medium">No items to check for {supplierName}.</p>
          <p className="text-muted-foreground text-sm">
            Nothing was parsed from this supplier&apos;s invoices yet.
          </p>
        </div>
      </div>
    );
  }

  const previewProduct =
    flaggedProducts.find((p) => p.key === previewProductKey) ?? null;
  const rescuedCount = flaggedProducts.filter((p) => rescuedKeys.has(p.key)).length;

  return (
    <div className="space-y-4">
      {/* Inventory items are already handled — say so and move on. */}
      <div className="flex items-center gap-3 rounded-md border border-emerald-500/30 bg-emerald-500/5 px-4 py-3">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-emerald-500/15">
          <Check className="size-4 text-emerald-600 dark:text-emerald-400" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-medium">
            {inventoryProducts.length} inventory item
            {inventoryProducts.length === 1 ? "" : "s"} locked in
          </p>
          <p className="text-muted-foreground text-xs">
            You&apos;ll organise these into your ingredient list in the next stage —
            nothing to do here.
          </p>
        </div>
      </div>

      {flaggedProducts.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          Nothing was flagged as non-inventory for {supplierName} — you&apos;re all
          set.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
          <div className="space-y-3">
            <div className="bg-muted/50 flex items-start gap-2 rounded-md p-2.5">
              <Bot className="text-muted-foreground mt-0.5 size-4 shrink-0" />
              <p className="text-muted-foreground text-xs leading-relaxed">
                I flagged these {flaggedProducts.length} line
                {flaggedProducts.length === 1 ? "" : "s"} as{" "}
                <span className="font-medium">non-inventory</span> — fees, freight,
                packaging and the like. Tick anything that&apos;s actually stock and
                I&apos;ll move it back to inventory when you continue.
              </p>
            </div>

            <div className="divide-y rounded-md border">
              {flaggedProducts.map((product) => {
                const rescued = rescuedKeys.has(product.key);
                return (
                  <div
                    key={product.key}
                    className={cn(
                      "flex cursor-pointer items-center gap-3 px-3 py-2.5",
                      previewProductKey === product.key
                        ? "bg-[var(--brand-supersolt-primary)]/10"
                        : "hover:bg-muted/50",
                    )}
                    onClick={() => selectForPreview(product)}
                  >
                    <Checkbox
                      checked={rescued}
                      onCheckedChange={(checked) =>
                        toggleRescue(product, checked === true)
                      }
                      onClick={(e) => e.stopPropagation()}
                      aria-label={`Move ${product.canonicalName} to inventory`}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {product.canonicalName}
                      </p>
                      <p className="text-muted-foreground truncate text-xs">
                        {[
                          product.packs[0]?.label,
                          formatPrice(product.currentPriceCents),
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    </div>
                    {rescued ? (
                      <span className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                        <Undo2 className="size-3.5" />
                        To inventory
                      </span>
                    ) : null}
                  </div>
                );
              })}
            </div>

            {rescuedCount > 0 ? (
              <p className="text-muted-foreground text-xs">
                {rescuedCount} item{rescuedCount === 1 ? "" : "s"} will move to
                inventory when you continue.
              </p>
            ) : null}
          </div>

          {/* Invoice the selected line was seen on — proof for borderline calls. */}
          <div className="lg:sticky lg:top-4 lg:self-start">
            <InvoicePreviewPane
              organisation={organisation}
              venue={venue}
              invoiceId={previewInvoiceId}
              highlightTokens={previewProduct ? highlightTokensFor(previewProduct) : []}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function InvoicePreviewPane({
  organisation,
  venue,
  invoiceId,
  highlightTokens,
}: {
  organisation: string;
  venue: string;
  invoiceId: string | null;
  highlightTokens: string[];
}) {
  const detailQuery = useVenueInvoiceDetailQuery({
    organisationSlug: organisation,
    venueSlug: venue,
    invoiceId,
  });

  const previewAttachment = useMemo(
    () =>
      pickPreviewAttachment(
        detailQuery.data?.attachments ?? [],
        detailQuery.data?.xeroAttachments ?? [],
      ),
    [detailQuery.data?.attachments, detailQuery.data?.xeroAttachments],
  );
  const attachmentRef = previewAttachment ? toAttachmentRef(previewAttachment) : null;
  const preview = useInvoiceAttachmentPreview({
    organisationSlug: organisation,
    venueSlug: venue,
    invoiceId,
    attachment: attachmentRef,
  });

  const invoice = detailQuery.data?.invoice;
  const heading = invoice?.invoiceNumber
    ? `Invoice ${invoice.invoiceNumber}`
    : "Latest invoice";

  const [highlightOn, setHighlightOn] = useState(true);

  return (
    <div className="rounded-md border">
      <div className="flex items-center justify-between gap-2 border-b px-3 py-2">
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold">{heading}</p>
          {invoice?.invoiceDate ? (
            <p className="text-muted-foreground text-[11px]">{invoice.invoiceDate}</p>
          ) : null}
        </div>
        <div className="flex items-center gap-1.5">
          <Button
            type="button"
            variant={highlightOn ? "secondary" : "ghost"}
            size="sm"
            className="h-7 gap-1.5 text-xs"
            onClick={() => setHighlightOn((on) => !on)}
            title={highlightOn ? "Hide the highlighted line" : "Highlight this item's line"}
          >
            <Highlighter
              className={cn("size-3.5", highlightOn ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground")}
            />
            {highlightOn ? "Highlight on" : "Highlight off"}
          </Button>
          <FileText className="text-muted-foreground size-4 shrink-0" />
        </div>
      </div>
      <div className="flex min-h-[480px] items-center justify-center p-2">
        {!invoiceId ? (
          <p className="text-muted-foreground text-sm">
            Select a line to see the invoice it came from.
          </p>
        ) : detailQuery.isLoading || preview.loading ? (
          <Loader2 className="text-muted-foreground size-5 animate-spin" />
        ) : preview.error ? (
          <p className="text-destructive text-sm">{preview.error}</p>
        ) : preview.previewUrl ? (
          <HighlightedInvoicePdf
            fileUrl={preview.previewUrl}
            highlightTokens={highlightOn ? highlightTokens : []}
          />
        ) : (
          <p className="text-muted-foreground text-sm">No document attached to this invoice.</p>
        )}
      </div>
    </div>
  );
}
