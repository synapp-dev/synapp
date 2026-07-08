"use client";

import { useState } from "react";
import { History, Loader2, PackageX, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@workspace/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { InvoiceUploadDialog } from "@/entities/invoices/components/invoice-upload-dialog";
import { useSupplierMutations } from "@/entities/suppliers/model/useSupplierMutations";

export type EmptyCatalogSupplier = {
  id: string;
  name: string;
};

/**
 * Surfaces kept inventory suppliers that produced no priced items, so an empty
 * supplier stops passing the Suppliers stage silently. Each row offers the
 * recovery cascade: look back 12 months → upload an invoice PDF → park as
 * "no catalog yet".
 */
export function EmptySupplierCatalogBanner({
  organisation,
  venue,
  suppliers,
}: {
  organisation: string;
  venue: string;
  suppliers: EmptyCatalogSupplier[];
}) {
  const { setNoCatalogAck, retryCatalogLookback } = useSupplierMutations({
    organisationSlug: organisation,
    venueSlug: venue,
  });
  // Which supplier row has an action in flight (so we only spin that one).
  const [busyId, setBusyId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  if (suppliers.length === 0) return null;

  const handleRetry = async (supplier: EmptyCatalogSupplier) => {
    setBusyId(supplier.id);
    try {
      const result = await retryCatalogLookback.mutateAsync({
        organisationSlug: organisation,
        venueSlug: venue,
        supplierId: supplier.id,
      });
      toast.success(
        result.rawItemsUpserted > 0
          ? `Found ${result.rawItemsUpserted} item${result.rawItemsUpserted === 1 ? "" : "s"} for ${supplier.name}`
          : `Still no items for ${supplier.name} — try uploading an invoice or mark it "no catalog yet"`,
      );
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not look back further",
      );
    } finally {
      setBusyId(null);
    }
  };

  const handleAck = async (supplier: EmptyCatalogSupplier) => {
    setBusyId(supplier.id);
    try {
      await setNoCatalogAck.mutateAsync({
        organisationSlug: organisation,
        venueSlug: venue,
        supplierId: supplier.id,
        acked: true,
      });
      toast.success(`Parked ${supplier.name} as "no catalog yet"`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not update supplier",
      );
    } finally {
      setBusyId(null);
    }
  };

  return (
    <>
      <div className="flex shrink-0 items-center justify-between gap-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-2.5 dark:border-amber-500/40 dark:bg-amber-500/10">
        <div className="flex min-w-0 items-center gap-2.5">
          <PackageX className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
          <p className="truncate text-sm font-medium text-amber-900 dark:text-amber-100">
            {suppliers.length} kept supplier{suppliers.length === 1 ? "" : "s"} produced no items
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-7 shrink-0 border-amber-300 bg-background/60 dark:border-amber-500/40"
          onClick={() => setDialogOpen(true)}
        >
          View & resolve
        </Button>
      </div>
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {suppliers.length} kept supplier{suppliers.length === 1 ? "" : "s"} produced no items
            </DialogTitle>
            <DialogDescription>
              These suppliers have no priced catalog from the last 90 days. Look
              back further, upload a recent invoice, or park them until you can
              price them — the Suppliers stage stays open until each is resolved.
            </DialogDescription>
          </DialogHeader>
          <ul className="flex max-h-[60vh] flex-col gap-2 overflow-y-auto">
            {suppliers.map((supplier) => {
              const busy = busyId === supplier.id;
              return (
                <li
                  key={supplier.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-amber-200 bg-amber-50/60 px-3 py-2 dark:border-amber-500/30 dark:bg-amber-500/10"
                >
                  <span className="truncate text-sm font-medium">
                    {supplier.name}
                  </span>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-7 gap-1.5"
                      disabled={busy}
                      onClick={() => void handleRetry(supplier)}
                    >
                      {busy && retryCatalogLookback.isPending ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <History className="h-3.5 w-3.5" />
                      )}
                      Look back 12 months
                    </Button>
                    <InvoiceUploadDialog
                      organisation={organisation}
                      venue={venue}
                      trigger={
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-7 gap-1.5"
                          disabled={busy}
                        >
                          <Upload className="h-3.5 w-3.5" />
                          Upload invoice
                        </Button>
                      }
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="h-7"
                      disabled={busy}
                      onClick={() => void handleAck(supplier)}
                    >
                      No catalog yet
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        </DialogContent>
      </Dialog>
    </>
  );
}
