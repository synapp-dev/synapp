"use client";

import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
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
import { Textarea } from "@workspace/ui/components/textarea";
import { purchaseOrdersApi } from "@/entities/purchase-orders/api/endpoints";
import type { PoStatus } from "@/entities/purchase-orders/model/types";
import { usePurchaseOrderDetailQuery } from "@/entities/purchase-orders/model/use-purchase-orders-query";

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
      <SheetContent className="flex w-full flex-col overflow-y-auto sm:max-w-xl">
        {detailQuery.isLoading || !po ? (
          <div className="flex flex-1 items-center justify-center gap-2 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading PO…
          </div>
        ) : (
          <>
            <SheetHeader>
              <SheetTitle>{po.poNumber}</SheetTitle>
              <SheetDescription>
                {po.supplierName} · {STATUS_LABELS[po.status]}
              </SheetDescription>
            </SheetHeader>

            <div className="flex flex-wrap gap-2">
              <Badge>{STATUS_LABELS[po.status]}</Badge>
              {po.isOverdue ? <Badge variant="destructive">Overdue</Badge> : null}
              {po.partialDeliveryFlag ? (
                <Badge variant="outline">Partial delivery</Badge>
              ) : null}
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-muted-foreground text-xs uppercase">Total (inc GST)</p>
                <p className="font-semibold">{formatCurrency(po.totalCents)}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs uppercase">Expected delivery</p>
                <p>{po.expectedDeliveryDate ?? "—"}</p>
              </div>
            </div>

            {po.notes ? (
              <p className="text-muted-foreground text-sm">{po.notes}</p>
            ) : null}

            <Separator />

            <div className="space-y-2">
              <p className="text-sm font-medium">Line items</p>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {po.lines.map((line) => (
                    <TableRow key={line.id}>
                      <TableCell className="text-sm">
                        <span>{line.productName}</span>
                        {line.skuCode || line.packLabel ? (
                          <span className="text-muted-foreground block text-xs">
                            {[
                              line.skuCode ? `SKU ${line.skuCode}` : null,
                              line.packLabel && line.unitsPerPack && line.packUnit
                                ? `${line.packLabel} of ${line.unitsPerPack} ${line.packUnit}`
                                : line.packLabel,
                            ]
                              .filter(Boolean)
                              .join(" · ")}
                          </span>
                        ) : null}
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {line.quantityOrdered}
                        {line.packLabel ? ` ${line.packLabel}` : ""}
                        {line.quantityReceived > 0 ? ` / ${line.quantityReceived} rcv` : ""}
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {formatCurrency(line.subtotalCents)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {po.allowedActions.includes("receive") ? (
              <div className="space-y-3 rounded-lg border p-3">
                <p className="text-sm font-medium">Receive delivery</p>
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
              <>
                <Separator />
                <div className="space-y-2">
                  <p className="text-sm font-medium">Email log</p>
                  {po.emails.map((email) => (
                    <div key={email.id} className="text-muted-foreground text-xs">
                      <p className="font-medium text-foreground">{email.subject}</p>
                      <p>
                        {email.direction} → {email.toAddress}
                      </p>
                    </div>
                  ))}
                </div>
              </>
            ) : null}

            {po.audit.length > 0 ? (
              <>
                <Separator />
                <div className="space-y-1">
                  <p className="text-sm font-medium">Audit trail</p>
                  {po.audit.slice(0, 8).map((entry) => (
                    <p key={entry.id} className="text-muted-foreground text-xs">
                      {new Date(entry.changedAt).toLocaleString("en-AU")} — {entry.eventType}
                    </p>
                  ))}
                </div>
              </>
            ) : null}
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
