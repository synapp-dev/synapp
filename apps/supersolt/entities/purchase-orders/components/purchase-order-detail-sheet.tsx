"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useMutation } from "@tanstack/react-query";
import { FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@workspace/ui/components/sheet";
import { Textarea } from "@workspace/ui/components/textarea";
import { cn } from "@workspace/ui/lib/utils";
import { MODULE_THEMES } from "@/lib/module-theme";
import { purchaseOrdersApi } from "@/entities/purchase-orders/api/endpoints";
import type { PoStatus } from "@/entities/purchase-orders/model/types";
import { usePurchaseOrderDetailQuery } from "@/entities/purchase-orders/model/use-purchase-orders-query";

const theme = MODULE_THEMES.purchasing;

function HeroChip({ children }: { children: ReactNode }) {
  return <span className={theme.heroChip}>{children}</span>;
}

const STATUS_LABELS: Record<PoStatus, string> = {
  draft: "Draft",
  pending_approval: "Pending approval",
  submitted: "Submitted",
  confirmed: "Confirmed",
  delivered: "Delivered",
  closed: "Closed",
  cancelled: "Cancelled",
};

function formatCurrency(cents: number): string {
  return `$${(cents / 100).toLocaleString("en-AU", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

type PurchaseOrderDetailSheetProps = {
  organisation: string;
  venue: string;
  poId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated: () => void;
};

export function PurchaseOrderDetailSheet({
  organisation,
  venue,
  poId,
  open,
  onOpenChange,
  onUpdated,
}: PurchaseOrderDetailSheetProps) {
  const detailQuery = usePurchaseOrderDetailQuery({
    organisation,
    venue,
    poId: open ? poId : null,
  });

  const [receiveQty, setReceiveQty] = useState<Record<string, number>>({});
  const [rejectComment, setRejectComment] = useState("");
  const [cancelReason, setCancelReason] = useState("");

  useEffect(() => {
    const po = detailQuery.data;
    if (!po) return;
    const initial: Record<string, number> = {};
    for (const line of po.lines) {
      initial[line.id] = line.quantityOrdered;
    }
    setReceiveQty(initial);
  }, [detailQuery.data]);

  function onActionSuccess() {
    toast.success("Purchase order updated");
    void detailQuery.refetch();
    onUpdated();
  }

  const sendMut = useMutation({
    mutationFn: async () => {
      if (!poId) throw new Error("No PO");
      const result = await purchaseOrdersApi.post.action(organisation, venue, poId, "send");
      if (result.error) throw new Error(result.error.message);
      return result.data!;
    },
    onSuccess: onActionSuccess,
    onError: (e: Error) => toast.error(e.message),
  });

  const approveMut = useMutation({
    mutationFn: async () => {
      if (!poId) throw new Error("No PO");
      const result = await purchaseOrdersApi.post.action(organisation, venue, poId, "approve");
      if (result.error) throw new Error(result.error.message);
      return result.data!;
    },
    onSuccess: onActionSuccess,
    onError: (e: Error) => toast.error(e.message),
  });

  const rejectMut = useMutation({
    mutationFn: async () => {
      if (!poId) throw new Error("No PO");
      const result = await purchaseOrdersApi.post.action(
        organisation,
        venue,
        poId,
        "reject",
        { comment: rejectComment || "Rejected" }
      );
      if (result.error) throw new Error(result.error.message);
      return result.data!;
    },
    onSuccess: onActionSuccess,
    onError: (e: Error) => toast.error(e.message),
  });

  const confirmMut = useMutation({
    mutationFn: async () => {
      if (!poId) throw new Error("No PO");
      const result = await purchaseOrdersApi.post.action(organisation, venue, poId, "confirm");
      if (result.error) throw new Error(result.error.message);
      return result.data!;
    },
    onSuccess: onActionSuccess,
    onError: (e: Error) => toast.error(e.message),
  });

  const closeMut = useMutation({
    mutationFn: async () => {
      if (!poId) throw new Error("No PO");
      const result = await purchaseOrdersApi.post.action(organisation, venue, poId, "close");
      if (result.error) throw new Error(result.error.message);
      return result.data!;
    },
    onSuccess: onActionSuccess,
    onError: (e: Error) => toast.error(e.message),
  });

  const cancelMut = useMutation({
    mutationFn: async () => {
      if (!poId) throw new Error("No PO");
      const result = await purchaseOrdersApi.post.action(organisation, venue, poId, "cancel", {
        reason: cancelReason || "Cancelled",
      });
      if (result.error) throw new Error(result.error.message);
      return result.data!;
    },
    onSuccess: onActionSuccess,
    onError: (e: Error) => toast.error(e.message),
  });

  const receiveMut = useMutation({
    mutationFn: async () => {
      if (!poId || !detailQuery.data) throw new Error("No PO");
      const result = await purchaseOrdersApi.post.action(organisation, venue, poId, "receive", {
        lines: detailQuery.data.lines.map((line) => ({
          lineId: line.id,
          quantityReceived: receiveQty[line.id] ?? line.quantityOrdered,
        })),
      });
      if (result.error) throw new Error(result.error.message);
      return result.data!;
    },
    onSuccess: onActionSuccess,
    onError: (e: Error) => toast.error(e.message),
  });

  const po = detailQuery.data;
  const pending =
    sendMut.isPending ||
    approveMut.isPending ||
    rejectMut.isPending ||
    confirmMut.isPending ||
    closeMut.isPending ||
    cancelMut.isPending ||
    receiveMut.isPending;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="top"
        className={cn(
          // Fixed hero + scrolling body, mirroring the sales detail drawers:
          // the sheet never scrolls itself, the body owns the scrollbar.
          "mx-auto flex max-h-[88vh] w-full flex-col gap-0 overflow-hidden rounded-b-2xl border-x-0 border-t-0 p-0 sm:max-w-xl sm:border-x",
          "[&>button]:top-5 [&>button]:right-5",
          theme.heroCloseButton,
        )}
      >
        {detailQuery.isError ? (
          <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
            <SheetTitle className="text-base font-medium">
              Couldn&apos;t load this purchase order
            </SheetTitle>
            <SheetDescription className="text-muted-foreground text-sm">
              {detailQuery.error instanceof Error
                ? detailQuery.error.message
                : "Something went wrong."}
            </SheetDescription>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void detailQuery.refetch()}
            >
              Try again
            </Button>
          </div>
        ) : detailQuery.isLoading || !po ? (
          <div className="flex items-center justify-center gap-2 px-6 py-16 text-muted-foreground">
            <SheetTitle className="sr-only">Loading purchase order</SheetTitle>
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading PO…
          </div>
        ) : (
          <>
            {/* shrink-0: overflow-hidden zeroes this flex item's min-height, so
                flexbox would crush the hero when the body overflows. */}
            <div
              className={cn(
                "relative shrink-0 overflow-hidden px-6 pb-6 pt-5",
                theme.hero,
              )}
            >
              <div
                aria-hidden
                className={cn(
                  theme.heroBlobs,
                  "pointer-events-none absolute inset-0 z-0",
                )}
              />
              <div className="relative z-10">
                <SheetTitle
                  className={cn(
                    "truncate pr-10 text-xs font-medium uppercase tracking-wider",
                    theme.heroKicker,
                  )}
                >
                  {STATUS_LABELS[po.status]} · {po.poNumber}
                </SheetTitle>
                <SheetDescription
                  className={cn("mt-0.5 truncate text-xs", theme.heroSubtle)}
                >
                  {po.supplierName} · ordered{" "}
                  {new Date(po.createdAt).toLocaleDateString("en-AU", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </SheetDescription>
                <p className="mt-3 text-5xl font-semibold leading-none tracking-tight tabular-nums text-white">
                  {formatCurrency(po.totalCents)}
                </p>
                <div className="mt-4 flex flex-wrap items-center gap-1.5">
                  <HeroChip>
                    {po.lines.length} line{po.lines.length === 1 ? "" : "s"}
                  </HeroChip>
                  {po.expectedDeliveryDate ? (
                    <HeroChip>
                      Delivery{" "}
                      {new Date(
                        `${po.expectedDeliveryDate}T12:00:00`,
                      ).toLocaleDateString("en-AU", {
                        weekday: "short",
                        day: "numeric",
                        month: "short",
                      })}
                    </HeroChip>
                  ) : null}
                  {po.isOverdue ? (
                    <span className="inline-flex items-center gap-1 rounded-full border border-rose-300/40 bg-rose-500/25 px-2.5 py-1 text-xs font-medium text-rose-100">
                      Overdue
                    </span>
                  ) : null}
                  {po.partialDeliveryFlag ? <HeroChip>Partial delivery</HeroChip> : null}
                  <a
                    href={`/api/organisations/${organisation}/venues/${venue}/purchase-orders/${po.id}/pdf`}
                    target="_blank"
                    rel="noreferrer"
                    className={cn("ml-auto", theme.heroPill)}
                  >
                    <FileText className="h-3.5 w-3.5" />
                    View PDF
                  </a>
                </div>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto">
              <div className="space-y-6 px-6 py-5">
                {po.notes ? (
                  <div className="rounded-xl border bg-muted/40 px-4 py-3 text-sm">
                    <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                      Notes
                    </p>
                    <p className="mt-0.5">{po.notes}</p>
                  </div>
                ) : null}

                <div>
                  <p className="mb-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                    Line items
                  </p>
                  <ul className="divide-y rounded-xl border">
                    {po.lines.map((line) => (
                      <li key={line.id} className="flex items-start gap-3 px-4 py-2.5">
                        <span className="mt-0.5 shrink-0 text-xs font-medium tabular-nums text-muted-foreground">
                          {line.quantityOrdered}×
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="break-words text-sm font-medium leading-snug">
                            {line.productName}
                          </p>
                          {line.skuCode || line.packLabel ? (
                            <p className="mt-0.5 text-[11px] text-muted-foreground">
                              {[
                                line.skuCode ? `SKU ${line.skuCode}` : null,
                                line.packLabel && line.unitsPerPack && line.packUnit
                                  ? `${line.packLabel} of ${line.unitsPerPack} ${line.packUnit}`
                                  : line.packLabel,
                                line.quantityReceived > 0
                                  ? `${line.quantityReceived} received`
                                  : null,
                              ]
                                .filter(Boolean)
                                .join(" · ")}
                            </p>
                          ) : null}
                        </div>
                        <span className="shrink-0 text-sm tabular-nums">
                          {formatCurrency(line.subtotalCents)}
                        </span>
                      </li>
                    ))}
                    <li className="flex items-baseline justify-between px-4 py-2.5">
                      <span className="text-sm font-semibold">Total (inc GST)</span>
                      <span className="text-base font-semibold tabular-nums">
                        {formatCurrency(po.totalCents)}
                      </span>
                    </li>
                  </ul>
                </div>

                {po.allowedActions.includes("receive") ? (
                  <div className="space-y-3 rounded-xl border p-4">
                    <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                      Receive delivery
                    </p>
                    {po.lines.map((line) => (
                      <div key={line.id} className="flex items-center justify-between gap-2">
                        <Label className="text-sm">{line.productName}</Label>
                        <Input
                          type="number"
                          className="h-8 w-24"
                          value={receiveQty[line.id] ?? line.quantityOrdered}
                          onChange={(e) =>
                            setReceiveQty((prev) => ({
                              ...prev,
                              [line.id]: Number(e.target.value),
                            }))
                          }
                        />
                      </div>
                    ))}
                    <Button
                      type="button"
                      className="w-full"
                      disabled={pending}
                      onClick={() => receiveMut.mutate()}
                    >
                      Save receiving
                    </Button>
                  </div>
                ) : null}

                <div className="flex flex-col gap-2">
                  {po.allowedActions.includes("send") ? (
                    <Button type="button" disabled={pending} onClick={() => sendMut.mutate()}>
                      Send PO
                    </Button>
                  ) : null}
                  {po.allowedActions.includes("approve") ? (
                    <Button type="button" disabled={pending} onClick={() => approveMut.mutate()}>
                      Approve & send
                    </Button>
                  ) : null}
                  {po.allowedActions.includes("reject") ? (
                    <>
                      <Textarea
                        placeholder="Rejection comment"
                        value={rejectComment}
                        onChange={(e) => setRejectComment(e.target.value)}
                        className="min-h-[60px]"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        disabled={pending}
                        onClick={() => rejectMut.mutate()}
                      >
                        Reject
                      </Button>
                    </>
                  ) : null}
                  {po.allowedActions.includes("confirm") ? (
                    <Button
                      type="button"
                      variant="secondary"
                      disabled={pending}
                      onClick={() => confirmMut.mutate()}
                    >
                      Mark confirmed
                    </Button>
                  ) : null}
                  {po.allowedActions.includes("close") ? (
                    <Button
                      type="button"
                      variant="outline"
                      disabled={pending}
                      onClick={() => closeMut.mutate()}
                    >
                      Close PO
                    </Button>
                  ) : null}
                  {po.allowedActions.includes("cancel") ? (
                    <>
                      <Input
                        placeholder="Cancellation reason"
                        value={cancelReason}
                        onChange={(e) => setCancelReason(e.target.value)}
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        disabled={pending}
                        onClick={() => cancelMut.mutate()}
                      >
                        Cancel PO
                      </Button>
                    </>
                  ) : null}
                </div>

                {po.emails.length > 0 ? (
                  <div>
                    <p className="mb-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                      Email log
                    </p>
                    <ul className="divide-y rounded-xl border">
                      {po.emails.map((email) => (
                        <li key={email.id} className="px-4 py-2.5 text-xs">
                          <p className="font-medium text-foreground">{email.subject}</p>
                          <p className="text-muted-foreground mt-0.5">
                            {email.direction} → {email.toAddress}
                            {email.sentAt
                              ? ` · ${new Date(email.sentAt).toLocaleString("en-AU")}`
                              : ""}
                          </p>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                {po.audit.length > 0 ? (
                  <div>
                    <p className="mb-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                      Audit trail
                    </p>
                    <div className="space-y-1 rounded-xl border px-4 py-3">
                      {po.audit.slice(0, 8).map((entry) => (
                        <p key={entry.id} className="text-muted-foreground text-xs">
                          {new Date(entry.changedAt).toLocaleString("en-AU")} ·{" "}
                          {entry.eventType.replace(/_/g, " ")}
                        </p>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>

            {/* Pull-handle on the exit edge of the top drawer */}
            <div className="flex shrink-0 justify-center border-t py-2">
              <div aria-hidden className="h-1.5 w-10 rounded-full bg-muted-foreground/25" />
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
