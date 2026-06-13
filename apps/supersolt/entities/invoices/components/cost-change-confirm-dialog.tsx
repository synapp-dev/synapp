"use client";

import type { CostChangePreview } from "@/entities/invoices/model/types";
import { Button } from "@workspace/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";

type CostChangeConfirmDialogProps = {
  open: boolean;
  preview: CostChangePreview | null;
  currencyCode: string;
  loading?: boolean;
  onCancel: () => void;
  onConfirm: (propagate: boolean) => void;
};

function formatMoney(cents: number, currency: string) {
  return new Intl.NumberFormat("en-AU", { style: "currency", currency }).format(cents / 100);
}

export function CostChangeConfirmDialog({
  open,
  preview,
  currencyCode,
  loading,
  onCancel,
  onConfirm,
}: CostChangeConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Supplier price changes detected</DialogTitle>
          <DialogDescription>
            Confirming will update supplier product prices and recompute affected recipe costs.
          </DialogDescription>
        </DialogHeader>
        <ul className="max-h-48 space-y-2 overflow-y-auto text-sm">
          {preview?.lines.map((line) => (
            <li key={line.lineItemId} className="rounded border px-3 py-2">
              <p className="font-medium">{line.description ?? "Line item"}</p>
              <p className="text-muted-foreground">
                {formatMoney(line.oldPriceCents, currencyCode)} →{" "}
                {formatMoney(line.newPriceCents, currencyCode)}
              </p>
            </li>
          ))}
        </ul>
        {preview?.affectedRecipeCount ? (
          <p className="text-sm text-muted-foreground">
            ~{preview.affectedRecipeCount} recipe(s) may be affected.
          </p>
        ) : null}
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" disabled={loading} onClick={() => onConfirm(false)}>
            Confirm without updating prices
          </Button>
          <Button disabled={loading} onClick={() => onConfirm(true)}>
            Confirm & update prices
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
