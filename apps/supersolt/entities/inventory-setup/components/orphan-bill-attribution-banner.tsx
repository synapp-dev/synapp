"use client";

import { useState } from "react";
import { FileQuestion, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@workspace/ui/components/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import {
  useAttributeOrphanBillMutation,
  useOrphanBillsQuery,
} from "@/entities/inventory-setup/model/useOrphanBills";

/**
 * Manual attribution queue for un-foldable orphan bills — the placeholder
 * ("No Contact") suppliers whose PDF-bearing bills couldn't be folded to a
 * single supplier by account code. Each is pre-filled with a suggested match
 * read from the bill's PDF header; the user confirms (assign to an existing
 * supplier) or creates a new supplier from the invoice.
 */
export function OrphanBillAttributionBanner({
  organisation,
  venue,
  candidateSuppliers,
}: {
  organisation: string;
  venue: string;
  /** Real suppliers offered in the "assign to existing" picker. */
  candidateSuppliers: Array<{ id: string; name: string }>;
}) {
  const orphansQuery = useOrphanBillsQuery({
    organisationSlug: organisation,
    venueSlug: venue,
  });
  const attribute = useAttributeOrphanBillMutation({
    organisationSlug: organisation,
    venueSlug: venue,
  });
  const [busyId, setBusyId] = useState<string | null>(null);

  const orphans = orphansQuery.data ?? [];
  if (orphans.length === 0) return null;

  const nameById = new Map(candidateSuppliers.map((s) => [s.id, s.name]));

  const run = async (
    placeholderSupplierId: string,
    target:
      | { kind: "existing"; supplierId: string }
      | { kind: "create"; name: string },
    label: string,
  ) => {
    setBusyId(placeholderSupplierId);
    try {
      const result = await attribute.mutateAsync({ placeholderSupplierId, target });
      toast.success(
        `Attributed ${result.reassignedInvoices} bill${result.reassignedInvoices === 1 ? "" : "s"} to ${label}`,
      );
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not attribute bills",
      );
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="rounded-lg border border-sky-300 bg-sky-50 p-4 dark:border-sky-500/40 dark:bg-sky-500/10">
      <div className="flex items-start gap-3">
        <FileQuestion className="mt-0.5 h-5 w-5 shrink-0 text-sky-600 dark:text-sky-400" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-sky-900 dark:text-sky-100">
            {orphans.length} unmatched bill source{orphans.length === 1 ? "" : "s"} need a supplier
          </p>
          <p className="mt-0.5 text-xs text-sky-800/80 dark:text-sky-200/70">
            These bills couldn&apos;t be matched to a supplier automatically.
            Confirm the suggested match or create a new supplier — bills without a
            PDF carry no items and are skipped.
          </p>
          <ul className="mt-3 flex flex-col gap-2">
            {orphans.map((orphan) => {
              const busy = busyId === orphan.placeholderSupplierId;
              const suggestion = orphan.suggestion;
              const createName =
                (suggestion.kind === "create" ? suggestion.suggestedName : null) ??
                orphan.identity.name ??
                orphan.placeholderName;
              return (
                <li
                  key={orphan.placeholderSupplierId}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-sky-200 bg-background/60 px-3 py-2 dark:border-sky-500/30"
                >
                  <div className="min-w-0">
                    <span className="block truncate text-sm font-medium">
                      {orphan.placeholderName}
                    </span>
                    <span className="text-muted-foreground text-xs">
                      {orphan.attributableBills} bill
                      {orphan.attributableBills === 1 ? "" : "s"} with a PDF
                      {orphan.skippedNoPdfBills > 0
                        ? ` · ${orphan.skippedNoPdfBills} skipped (no PDF)`
                        : ""}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {suggestion.kind === "existing" &&
                    nameById.has(suggestion.supplierId) ? (
                      <Button
                        type="button"
                        size="sm"
                        className="h-7 gap-1.5"
                        disabled={busy}
                        onClick={() =>
                          void run(
                            orphan.placeholderSupplierId,
                            { kind: "existing", supplierId: suggestion.supplierId },
                            nameById.get(suggestion.supplierId)!,
                          )
                        }
                      >
                        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                        Attribute to {nameById.get(suggestion.supplierId)}
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        size="sm"
                        className="h-7 gap-1.5"
                        disabled={busy}
                        onClick={() =>
                          void run(
                            orphan.placeholderSupplierId,
                            { kind: "create", name: createName },
                            createName,
                          )
                        }
                      >
                        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                        Create &ldquo;{createName}&rdquo;
                      </Button>
                    )}
                    <Select
                      disabled={busy}
                      onValueChange={(supplierId) =>
                        void run(
                          orphan.placeholderSupplierId,
                          { kind: "existing", supplierId },
                          nameById.get(supplierId) ?? "supplier",
                        )
                      }
                    >
                      <SelectTrigger className="h-7 w-[160px]" size="sm">
                        <SelectValue placeholder="Assign to…" />
                      </SelectTrigger>
                      <SelectContent>
                        {candidateSuppliers.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}
