"use client";



import { useEffect, useState } from "react";

import {

  CheckCircle2,

  Circle,

  CircleDashed,

  Loader2,

  XCircle,

} from "lucide-react";



import {

  Dialog,

  DialogContent,

  DialogDescription,

  DialogFooter,

  DialogHeader,

  DialogTitle,

} from "@workspace/ui/components/dialog";

import { Button } from "@workspace/ui/components/button";

import { Checkbox } from "@workspace/ui/components/checkbox";

import { Progress } from "@workspace/ui/components/progress";

import { cn } from "@workspace/ui/lib/utils";

import {
  isImportJobAwaitingSelection,
  isImportJobInProgress,
} from "@/entities/inventory-setup/lib/import-job-progress";
import { StepEventLog } from "@/entities/inventory-setup/components/import-activity-view";
import { XeroThrottleCountdown } from "@/entities/inventory-setup/components/xero-throttle-countdown";

import type {
  ImportJobInvoiceActivity,
  ImportJobRow,
  ImportJobStep,
  ImportJobStepStatus,
} from "@/entities/inventory-setup/model/import-job-types";
import type {
  InventorySetupImportGateState,
  InventorySetupImportResult,
  InvoiceFirstImportResult,
  SelectableSupplier,
} from "@/entities/inventory-setup/model/types";
import type { SquareCatalogImportResult } from "@/entities/pos-catalog-import/model/types";



function StepIcon({ status }: { status: ImportJobStepStatus }) {

  switch (status) {

    case "running":

      return <Loader2 className="size-4 shrink-0 animate-spin text-primary" />;

    case "complete":

      return <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />;

    case "failed":

      return <XCircle className="size-4 shrink-0 text-destructive" />;

    case "skipped":

      return <CircleDashed className="text-muted-foreground size-4 shrink-0" />;

    default:

      return <Circle className="text-muted-foreground/40 size-4 shrink-0" />;

  }

}



function formatFeedAmount(cents: number | null): string | null {
  if (cents == null) return null;
  return `$${(cents / 100).toLocaleString("en-AU", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function activityActionLabel(
  action: ImportJobInvoiceActivity["supplierAction"],
): string | null {
  switch (action) {
    case "created":
      return "new supplier";
    case "matched_abn":
      return "matched by ABN";
    case "matched_name":
      return "matched by name";
    default:
      return null;
  }
}

/**
 * The live per-invoice feed under the running step — the user watches each
 * bill get read, its supplier resolved off the header, and its items counted.
 */
function InvoiceActivityFeed({ recent }: { recent: ImportJobInvoiceActivity[] }) {
  if (recent.length === 0) return null;
  return (
    <ul className="mt-2 space-y-1">
      {recent.map((activity) => {
        const action = activityActionLabel(activity.supplierAction);
        const amount = formatFeedAmount(activity.amountCents);
        return (
          <li
            key={activity.id}
            className="animate-in fade-in slide-in-from-top-1 flex items-center gap-2 rounded-md bg-background/70 px-2 py-1 text-xs"
          >
            {activity.ok ? (
              <CheckCircle2 className="size-3 shrink-0 text-emerald-600" />
            ) : (
              <XCircle className="text-destructive size-3 shrink-0" />
            )}
            <span className="min-w-0 flex-1 truncate">
              <span className="font-medium">
                {activity.supplier ?? activity.number ?? "Invoice"}
              </span>
              {action ? (
                <span
                  className={cn(
                    "ml-1.5",
                    activity.supplierAction === "created"
                      ? "text-primary font-medium"
                      : "text-muted-foreground",
                  )}
                >
                  {action}
                </span>
              ) : null}
              {activity.items > 0 ? (
                <span className="text-muted-foreground ml-1.5">
                  +{activity.items} item{activity.items === 1 ? "" : "s"}
                </span>
              ) : null}
            </span>
            {amount ? (
              <span className="text-muted-foreground shrink-0 tabular-nums">{amount}</span>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

function StepRow({ step, isActive }: { step: ImportJobStep; isActive: boolean }) {

  const progressPct =

    step.progress && step.progress.total > 0

      ? Math.round((step.progress.current / step.progress.total) * 100)

      : null;



  return (

    <div

      className={cn(

        "rounded-lg border px-3 py-3 transition-colors",

        isActive ? "border-primary/30 bg-primary/5" : "border-transparent",

        step.status === "complete" && "opacity-80",

      )}

    >

      <div className="flex items-start gap-3">

        <StepIcon status={step.status} />

        <div className="min-w-0 flex-1 space-y-1">

          <p className="text-sm font-medium leading-none">{step.label}</p>

          <p className="text-muted-foreground text-xs">{step.description}</p>

          {step.detail ? (

            <p className="text-muted-foreground text-xs">{step.detail}</p>

          ) : null}

          {progressPct != null ? (

            <Progress value={progressPct} className="mt-2 h-1.5" />

          ) : null}

          {step.status === "running" ? (
            <div className="mt-2">
              <XeroThrottleCountdown throttledUntilMs={step.progress?.throttledUntilMs} />
            </div>
          ) : null}

          {/* Live diagnostic log while running; kept on failure so the trail
              that led up to the death stays visible. */}
          {(step.status === "running" || step.status === "failed") &&
          step.progress?.events?.length ? (
            <div className="mt-2">
              <StepEventLog events={step.progress.events} />
            </div>
          ) : null}

          {step.status === "running" && step.progress?.recent?.length ? (
            <InvoiceActivityFeed recent={step.progress.recent} />
          ) : null}

          {step.summary ? (

            <p className="text-xs text-emerald-700 dark:text-emerald-400">{step.summary}</p>

          ) : null}

        </div>

      </div>

    </div>

  );

}



function SupplierSelectionStep({
  suppliers,
  isSubmitting,
  onSubmit,
}: {
  suppliers: SelectableSupplier[];
  isSubmitting: boolean;
  onSubmit: (supplierIds: string[]) => void | Promise<void>;
}) {
  const idsKey = suppliers.map((s) => s.id).join(",");
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(suppliers.map((s) => s.id)),
  );

  // Re-seed (default all checked) whenever the synced supplier set changes.
  useEffect(() => {
    setSelected(new Set(idsKey ? idsKey.split(",") : []));
  }, [idsKey]);

  const allSelected =
    suppliers.length > 0 && suppliers.every((s) => selected.has(s.id));

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const setAll = (on: boolean) =>
    setSelected(on ? new Set(suppliers.map((s) => s.id)) : new Set());

  return (
    <div className="space-y-3 py-1">
      <div className="flex items-center justify-between">
        <button
          type="button"
          className="text-primary text-xs font-medium hover:underline"
          onClick={() => setAll(!allSelected)}
        >
          {allSelected ? "Deselect all" : "Select all"}
        </button>
        <span className="text-muted-foreground text-xs">
          {selected.size} of {suppliers.length} selected
        </span>
      </div>

      <div className="max-h-64 space-y-0.5 overflow-y-auto rounded-md border p-1">
        {suppliers.length === 0 ? (
          <p className="text-muted-foreground p-3 text-sm">
            No suppliers were synced from Xero.
          </p>
        ) : (
          suppliers.map((s) => (
            <label
              key={s.id}
              className="hover:bg-muted/50 flex cursor-pointer items-center gap-3 rounded-md px-2 py-2"
            >
              <Checkbox
                checked={selected.has(s.id)}
                onCheckedChange={() => toggle(s.id)}
              />
              <span className="text-sm">{s.name}</span>
            </label>
          ))
        )}
      </div>

      <Button
        type="button"
        className="w-full"
        disabled={isSubmitting}
        onClick={() => void onSubmit([...selected])}
      >
        {isSubmitting
          ? "Starting…"
          : selected.size > 0
            ? `Parse ${selected.size} supplier${selected.size === 1 ? "" : "s"}`
            : "Skip parsing"}
      </Button>
    </div>
  );
}

function isInvoiceFirstImportResult(
  result: ImportJobRow["result"],
): result is InvoiceFirstImportResult {
  if (!result || !("suppliers" in result)) return false;
  const suppliers = (result as InvoiceFirstImportResult).suppliers;
  return Boolean(suppliers && typeof suppliers === "object" && "matchedByAbn" in suppliers);
}

function isXeroImportResult(result: ImportJobRow["result"]): result is InventorySetupImportResult {
  return Boolean(result && "rawItems" in result && !isInvoiceFirstImportResult(result));
}

function isSquareImportResult(
  result: ImportJobRow["result"],
): result is SquareCatalogImportResult {
  return Boolean(result && "variationsSeen" in result);
}

export function ImportFromXeroProgressDialog({
  open,
  onOpenChange,
  job,
  onFinished,
  onSubmitSelection,
  isSubmittingSelection = false,
  variant = "xero",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  job: ImportJobRow | null;
  onFinished?: () => void;
  onSubmitSelection?: (supplierIds: string[]) => void | Promise<void>;
  isSubmittingSelection?: boolean;
  variant?: "xero" | "square_catalog";
}) {
  const isSquare = variant === "square_catalog" || job?.jobType === "square_catalog";
  const isFinished = job?.status === "completed" || job?.status === "failed";
  const isRunning = isImportJobInProgress(job);
  const result = job?.result;

  const awaitingSelection =
    Boolean(onSubmitSelection) && isImportJobAwaitingSelection(job);
  const gateState =
    awaitingSelection && job?.result
      ? (job.result as unknown as InventorySetupImportGateState)
      : null;
  const selectableSuppliers: SelectableSupplier[] =
    gateState?.selectableSuppliers ?? [];

  const title = isSquare ? "Importing from Square" : "Importing from Xero";
  const runningDescription = isSquare
    ? "Fetching your Square item library and creating POS lines. You can close this and keep working."
    : "We're collecting every bill from the last 12 months and reading them one by one — your suppliers, items and prices come straight off the invoices. You can close this and keep working — progress stays in the header.";
  const completedDescription = isSquare
    ? "Import finished. Review POS lines and map recipes."
    : "Import finished. Review your suppliers and raw items.";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {awaitingSelection
              ? `We found ${selectableSuppliers.length} supplier${selectableSuppliers.length === 1 ? "" : "s"} in Xero. Untick any that don't deliver ingredients — we'll only read invoices for the ones you keep.`
              : job?.status === "running"
                ? runningDescription
                : job?.status === "completed"
                  ? completedDescription
                  : job?.status === "failed"
                    ? "Import did not complete successfully."
                    : "Preparing import…"}
          </DialogDescription>
        </DialogHeader>



        {awaitingSelection ? null : (
          <div className="space-y-2 py-1">

            {(job?.steps ?? []).map((step) => (

              <StepRow

                key={step.id}

                step={step}

                isActive={job?.currentStepId === step.id}

              />

            ))}

          </div>
        )}



        {awaitingSelection && onSubmitSelection ? (
          <SupplierSelectionStep
            suppliers={selectableSuppliers}
            isSubmitting={isSubmittingSelection}
            onSubmit={onSubmitSelection}
          />
        ) : null}



        {job?.errorMessage ? (

          <p className="text-destructive text-sm">{job.errorMessage}</p>

        ) : null}



        {result && job?.status === "completed" ? (
          <div className="bg-muted/40 rounded-md border px-3 py-2 text-sm">
            {isSquareImportResult(result) ? (
              <p>
                {result.menuItems.created} created, {result.menuItems.updated} updated from{" "}
                {result.variationsSeen} Square variations
              </p>
            ) : isInvoiceFirstImportResult(result) ? (
              <>
                <p>
                  {result.rawItems.upserted} items catalogued from{" "}
                  {result.invoices.parsed + result.invoices.alreadyParsed} invoices ·{" "}
                  {result.suppliers.created} supplier
                  {result.suppliers.created === 1 ? "" : "s"} created from invoice headers
                </p>
                {result.invoices.failed > 0 ? (
                  <p className="text-muted-foreground mt-1 text-xs">
                    {result.invoices.failed} invoice(s) could not be read
                  </p>
                ) : null}
              </>
            ) : isXeroImportResult(result) ? (
              <>
                <p>
                  {result.rawItems.upserted} raw items from {result.invoices.parsedFromAttachment}{" "}
                  parsed invoices
                </p>
                {result.invoices.parseFailed.length > 0 ? (
                  <p className="text-muted-foreground mt-1 text-xs">
                    {result.invoices.parseFailed.length} invoice(s) could not be parsed
                  </p>
                ) : null}
              </>
            ) : null}
          </div>
        ) : null}



        {awaitingSelection ? null : (
          <DialogFooter>

            <Button

              type="button"

              variant={isRunning ? "outline" : "default"}

              onClick={() => {

                onOpenChange(false);

                if (isFinished) {

                  onFinished?.();

                }

              }}

            >

              {isFinished ? "Done" : isRunning ? "Run in background" : "Working…"}

            </Button>

          </DialogFooter>
        )}

      </DialogContent>

    </Dialog>

  );

}

