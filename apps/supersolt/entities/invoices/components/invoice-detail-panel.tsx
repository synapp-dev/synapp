"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Download, ExternalLink, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Separator } from "@workspace/ui/components/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@workspace/ui/components/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { Textarea } from "@workspace/ui/components/textarea";
import type { DisputeReason, InvoiceAttachmentRow, InvoiceRow } from "@/entities/invoices/model/types";
import { downloadInvoiceAttachmentFile, type InvoiceAttachmentRef } from "@/entities/invoices/lib/invoice-attachment";
import { invoicesApi } from "@/entities/invoices/api/endpoints";
import { invoiceKeys } from "@/entities/invoices/model/keys";
import { useVenueInvoiceDetailQuery } from "@/entities/invoices/model/use-venue-invoice-detail-query";
import { useInvoiceAttachmentPreview } from "@/entities/invoices/model/use-invoice-attachment-preview";
import { CostChangeConfirmDialog } from "./cost-change-confirm-dialog";

type InvoiceDetailPanelProps = {
  organisation: string;
  venue: string;
  invoiceId: string | null;
  invoicePreview?: InvoiceRow | null;
  onClose: () => void;
};

function formatCurrency(cents: number, currency = "AUD"): string {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency,
  }).format(cents / 100);
}

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
  return {
    kind: "storage",
    attachmentId: attachment.id,
    fileName: attachment.fileName,
  };
}

export function InvoiceDetailPanel({
  organisation,
  venue,
  invoiceId,
  invoicePreview = null,
  onClose,
}: InvoiceDetailPanelProps) {
  const queryClient = useQueryClient();
  const [disputeReason, setDisputeReason] = useState<DisputeReason>("price_mismatch");
  const [disputeNotes, setDisputeNotes] = useState("");
  const [showCostDialog, setShowCostDialog] = useState(false);

  const parseTriggeredRef = useRef<string | null>(null);

  const detailQuery = useVenueInvoiceDetailQuery({
    organisationSlug: organisation,
    venueSlug: venue,
    invoiceId: invoiceId,
  });

  const display = detailQuery.data?.invoice ?? invoicePreview;

  const parseAttachmentMutation = useMutation({
    mutationFn: (force?: boolean) =>
      invoicesApi.parseAttachment({
        organisationSlug: organisation,
        venueSlug: venue,
        invoiceId: invoiceId!,
        force,
      }),
    onSuccess: async (res) => {
      if (res.error) {
        toast.error("Could not parse attachment", { description: res.error.message });
        return;
      }

      if (res.data?.detail && invoiceId) {
        queryClient.setQueryData(
          invoiceKeys.detail(organisation, venue, invoiceId),
          res.data.detail,
        );
      } else if (invoiceId) {
        await queryClient.refetchQueries({
          queryKey: invoiceKeys.detail(organisation, venue, invoiceId),
        });
      }

      void queryClient.invalidateQueries({ queryKey: invoiceKeys.all });

      if (res.data?.error) {
        toast.error("Could not parse attachment", { description: res.data.error });
        return;
      }

      if (res.data?.parsed) {
        const tokenMsg = res.data.tokenUsage
          ? ` (${res.data.tokenUsage.totalTokens.toLocaleString()} tokens)`
          : "";
        console.info("[invoice-parse] client", {
          invoiceId,
          lineItemCount: res.data.lineItemCount,
          tokenUsage: res.data.tokenUsage,
        });
        toast.success(
          `Parsed ${res.data.lineItemCount} line item${res.data.lineItemCount === 1 ? "" : "s"} from attachment${tokenMsg}`,
        );
      }
    },
    onError: (e: Error) =>
      toast.error("Could not parse attachment", { description: e.message }),
  });

  useEffect(() => {
    if (!invoiceId || !detailQuery.data) return;
    const status = detailQuery.data.attachmentParse.status;
    if (status !== "needed") return;
    if (parseTriggeredRef.current === invoiceId) return;
    if (parseAttachmentMutation.isPending) return;

    parseTriggeredRef.current = invoiceId;
    parseAttachmentMutation.mutate(false);
  }, [invoiceId, detailQuery.data?.attachmentParse.status, detailQuery.data, parseAttachmentMutation.isPending]);

  useEffect(() => {
    parseTriggeredRef.current = null;
  }, [invoiceId]);

  const isParsingLines = parseAttachmentMutation.isPending;

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

  const invalidate = () => void queryClient.invalidateQueries({ queryKey: invoiceKeys.all });

  const confirmMutation = useMutation({
    mutationFn: (propagatePriceChanges: boolean) =>
      invoicesApi.confirm({
        organisationSlug: organisation,
        venueSlug: venue,
        invoiceId: invoiceId!,
        body: { propagatePriceChanges },
      }),
    onSuccess: (res) => {
      if (res.error) {
        toast.error("Confirm failed", { description: res.error.message });
        return;
      }
      toast.success("Invoice confirmed");
      setShowCostDialog(false);
      invalidate();
      onClose();
    },
    onError: (e: Error) => toast.error("Confirm failed", { description: e.message }),
  });

  const disputeMutation = useMutation({
    mutationFn: () =>
      invoicesApi.dispute({
        organisationSlug: organisation,
        venueSlug: venue,
        invoiceId: invoiceId!,
        reason: disputeReason,
        notes: disputeNotes || undefined,
      }),
    onSuccess: () => {
      toast.success("Invoice disputed");
      invalidate();
      onClose();
    },
    onError: (e: Error) => toast.error("Dispute failed", { description: e.message }),
  });

  const duplicateMutation = useMutation({
    mutationFn: () =>
      invoicesApi.markDuplicate({
        organisationSlug: organisation,
        venueSlug: venue,
        invoiceId: invoiceId!,
      }),
    onSuccess: () => {
      toast.success("Marked as duplicate");
      invalidate();
      onClose();
    },
  });

  const downloadMutation = useMutation({
    mutationFn: async () => {
      if (!invoiceId || !attachmentRef) throw new Error("No attachment");
      await downloadInvoiceAttachmentFile(
        { organisationSlug: organisation, venueSlug: venue, invoiceId },
        attachmentRef,
      );
    },
    onError: (e: Error) => toast.error("Download failed", { description: e.message }),
  });

  function handleConfirmClick() {
    const costPreview = detailQuery.data?.costChangePreview;
    if (costPreview?.lines.length) {
      setShowCostDialog(true);
    } else {
      confirmMutation.mutate(true);
    }
  }

  const canAct =
    display &&
    ["pending_review", "pending_approval"].includes(display.reviewStatus);

  return (
    <>
      <Sheet open={invoiceId !== null} onOpenChange={(open) => !open && onClose()}>
        <SheetContent
          side="bottom"
          className="inset-x-auto bottom-0 left-1/2 flex h-[min(90vh,960px)] w-full max-w-7xl -translate-x-1/2 flex-col gap-0 overflow-y-auto rounded-t-xl p-0"
        >
          <SheetHeader className={display ? "border-b pb-4 text-left" : "sr-only"}>
            <SheetTitle>{display?.supplierName ?? "Invoice details"}</SheetTitle>
            {display ? (
              <SheetDescription className="flex flex-wrap gap-2">
                <span className="font-mono">{display.invoiceNumber ?? display.id.slice(0, 8)}</span>
                <Badge variant="outline">{display.reviewStatus.replace("_", " ")}</Badge>
                <Badge variant="secondary" className="capitalize">
                  {display.source}
                </Badge>
                {detailQuery.data?.poNumber ? (
                  <Badge variant="outline">PO {detailQuery.data.poNumber}</Badge>
                ) : null}
              </SheetDescription>
            ) : (
              <SheetDescription>Loading invoice details</SheetDescription>
            )}
          </SheetHeader>

          {detailQuery.isLoading && !display ? (
            <div className="flex flex-1 items-center justify-center p-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : display ? (
            <>
              <div className="grid flex-1 gap-6 px-4 py-4 lg:grid-cols-2">
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Original document
                    </p>
                    {previewAttachment ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={downloadMutation.isPending}
                        onClick={() => downloadMutation.mutate()}
                      >
                        <Download className="mr-1.5 h-3.5 w-3.5" />
                        Download
                      </Button>
                    ) : null}
                  </div>

                  {preview.loading || detailQuery.isPending ? (
                    <div className="flex h-[480px] items-center justify-center rounded-md border bg-muted/30">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : preview.previewUrl ? (
                    <iframe
                      src={preview.previewUrl}
                      title={previewAttachment?.fileName ?? "Invoice document"}
                      className="h-[480px] w-full rounded-md border bg-muted/30"
                    />
                  ) : preview.error ? (
                    <div className="space-y-2 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm">
                      <p className="text-destructive">Could not load document</p>
                      <p className="text-muted-foreground">{preview.error}</p>
                      {detailQuery.data?.xeroUrl ? (
                        <Button asChild variant="outline" size="sm">
                          <Link href={detailQuery.data.xeroUrl} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                            Open in Xero
                          </Link>
                        </Button>
                      ) : null}
                    </div>
                  ) : detailQuery.data?.attachmentsError ? (
                    <div className="space-y-2 rounded-md border p-3 text-sm">
                      <p className="text-muted-foreground">{detailQuery.data.attachmentsError}</p>
                      {detailQuery.data.xeroUrl ? (
                        <Button asChild variant="outline" size="sm">
                          <Link href={detailQuery.data.xeroUrl} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                            Open in Xero
                          </Link>
                        </Button>
                      ) : null}
                    </div>
                  ) : detailQuery.data?.xeroUrl ? (
                    <Button asChild variant="outline" size="sm">
                      <Link href={detailQuery.data.xeroUrl} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                        Open in Xero
                      </Link>
                    </Button>
                  ) : (
                    <p className="text-sm text-muted-foreground">No document attached.</p>
                  )}

                  {previewAttachment ? (
                    <p className="text-muted-foreground text-xs">{previewAttachment.fileName}</p>
                  ) : null}
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-muted-foreground">Invoice date</p>
                      <p>{display.invoiceDate ?? "—"}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Due date</p>
                      <p>{display.dueDate ?? "—"}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Total</p>
                      <p className="font-semibold">{formatCurrency(display.totalCents, display.currencyCode)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Parse confidence</p>
                      <p className="capitalize">{display.parseConfidence ?? "—"}</p>
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Line items
                      </p>
                      {detailQuery.data?.attachmentParse.status === "failed" ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={parseAttachmentMutation.isPending}
                          onClick={() => parseAttachmentMutation.mutate(true)}
                        >
                          Retry parse
                        </Button>
                      ) : null}
                    </div>
                    {isParsingLines ? (
                      <div className="flex flex-col gap-2 rounded-md border px-3 py-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Extracting line items from attachment with AI…
                        </div>
                        <p className="text-xs">This usually takes 15–45 seconds for PDF invoices.</p>
                      </div>
                    ) : detailQuery.data?.attachmentParse.status === "failed" ? (
                      <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                        {detailQuery.data.attachmentParse.error ?? "Attachment parse failed"}
                      </div>
                    ) : detailQuery.data?.attachmentParse.status === "needed" ? (
                      <div className="flex items-center gap-2 rounded-md border px-3 py-4 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Preparing to extract line items…
                      </div>
                    ) : detailQuery.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (detailQuery.data?.lineItems ?? []).length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        No line items parsed yet.
                      </p>
                    ) : (
                      <div className="overflow-hidden rounded-md border">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Description</TableHead>
                              <TableHead className="text-right">Qty</TableHead>
                              <TableHead className="text-right">Unit</TableHead>
                              <TableHead className="text-right">Price</TableHead>
                              <TableHead className="text-right">Amount</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {(detailQuery.data?.lineItems ?? []).map((line) => (
                              <TableRow key={line.id}>
                                <TableCell className={line.isUnmapped ? "bg-amber-50 dark:bg-amber-950/20" : ""}>
                                  {line.parsedDescription ?? "—"}
                                  {line.isUnmapped ? (
                                    <span className="mt-0.5 block text-xs text-amber-700">Unmapped</span>
                                  ) : null}
                                </TableCell>
                                <TableCell className="text-right">{line.quantity ?? "—"}</TableCell>
                                <TableCell className="text-right">{line.unit ?? "—"}</TableCell>
                                <TableCell className="text-right">
                                  {line.unitPriceCents != null
                                    ? formatCurrency(line.unitPriceCents, display.currencyCode)
                                    : "—"}
                                </TableCell>
                                <TableCell className="text-right">
                                  {line.lineTotalCents != null
                                    ? formatCurrency(line.lineTotalCents, display.currencyCode)
                                    : "—"}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </div>

                  {canAct ? (
                    <>
                      <Separator />
                      <div className="space-y-3">
                        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          Actions
                        </p>
                        <div className="flex flex-wrap gap-2">
                          <Button size="sm" disabled={confirmMutation.isPending} onClick={handleConfirmClick}>
                            Confirm
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={duplicateMutation.isPending}
                            onClick={() => duplicateMutation.mutate()}
                          >
                            Mark duplicate
                          </Button>
                        </div>
                        <div className="space-y-2 rounded-md border p-3">
                          <p className="text-sm font-medium">Dispute</p>
                          <Select
                            value={disputeReason}
                            onValueChange={(v) => setDisputeReason(v as DisputeReason)}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="line_item_mismatch">Line item mismatch</SelectItem>
                              <SelectItem value="price_mismatch">Price mismatch</SelectItem>
                              <SelectItem value="quantity_mismatch">Quantity mismatch</SelectItem>
                              <SelectItem value="wrong_supplier">Wrong supplier</SelectItem>
                              <SelectItem value="other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                          <Textarea
                            placeholder="Notes"
                            value={disputeNotes}
                            onChange={(e) => setDisputeNotes(e.target.value)}
                            rows={2}
                          />
                          <Button
                            size="sm"
                            variant="destructive"
                            disabled={disputeMutation.isPending}
                            onClick={() => disputeMutation.mutate()}
                          >
                            Dispute
                          </Button>
                        </div>
                      </div>
                    </>
                  ) : null}
                </div>
              </div>
            </>
          ) : null}
        </SheetContent>
      </Sheet>

      <CostChangeConfirmDialog
        open={showCostDialog}
        preview={detailQuery.data?.costChangePreview ?? null}
        currencyCode={display?.currencyCode ?? "AUD"}
        loading={confirmMutation.isPending}
        onCancel={() => setShowCostDialog(false)}
        onConfirm={(propagate) => confirmMutation.mutate(propagate)}
      />
    </>
  );
}
