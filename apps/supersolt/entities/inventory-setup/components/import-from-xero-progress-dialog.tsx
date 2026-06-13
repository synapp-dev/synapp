"use client";



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

import { Progress } from "@workspace/ui/components/progress";

import { cn } from "@workspace/ui/lib/utils";

import { isImportJobInProgress } from "@/entities/inventory-setup/lib/import-job-progress";

import type {
  ImportJobRow,
  ImportJobStep,
  ImportJobStepStatus,
} from "@/entities/inventory-setup/model/import-job-types";
import type { InventorySetupImportResult } from "@/entities/inventory-setup/model/types";
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

          {step.summary ? (

            <p className="text-xs text-emerald-700 dark:text-emerald-400">{step.summary}</p>

          ) : null}

        </div>

      </div>

    </div>

  );

}



function isXeroImportResult(result: ImportJobRow["result"]): result is InventorySetupImportResult {
  return Boolean(result && "rawItems" in result);
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
  variant = "xero",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  job: ImportJobRow | null;
  onFinished?: () => void;
  variant?: "xero" | "square_catalog";
}) {
  const isSquare = variant === "square_catalog" || job?.jobType === "square_catalog";
  const isFinished = job?.status === "completed" || job?.status === "failed";
  const isRunning = isImportJobInProgress(job);
  const result = job?.result;

  const title = isSquare ? "Importing from Square" : "Importing from Xero";
  const runningDescription = isSquare
    ? "Fetching your Square item library and creating POS lines. You can close this and keep working."
    : "This may take a few minutes while we download invoice PDFs and extract product lines. You can close this and keep working — progress stays in the header.";
  const completedDescription = isSquare
    ? "Import finished. Review POS lines and map recipes."
    : "Import finished. Review your suppliers and raw items.";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {job?.status === "running"
              ? runningDescription
              : job?.status === "completed"
                ? completedDescription
                : job?.status === "failed"
                  ? "Import did not complete successfully."
                  : "Preparing import…"}
          </DialogDescription>
        </DialogHeader>



        <div className="space-y-2 py-1">

          {(job?.steps ?? []).map((step) => (

            <StepRow

              key={step.id}

              step={step}

              isActive={job?.currentStepId === step.id}

            />

          ))}

        </div>



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

      </DialogContent>

    </Dialog>

  );

}

