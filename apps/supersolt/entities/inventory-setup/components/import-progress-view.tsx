"use client";

import { useState } from "react";
import { CheckCircle2, Circle, CircleDashed, Loader2, XCircle } from "lucide-react";

import { Progress } from "@workspace/ui/components/progress";
import { cn } from "@workspace/ui/lib/utils";

import { ImportActivityView } from "@/entities/inventory-setup/components/import-activity-view";
import { SupplierPreparingSteps } from "@/entities/inventory-setup/components/supplier-preparing-steps";
import { SupplierSelectionGate } from "@/entities/inventory-setup/components/supplier-selection-gate";
import { isImportJobAwaitingSelection } from "@/entities/inventory-setup/lib/import-job-progress";
import type {
  ImportJobRow,
  ImportJobStep,
  ImportJobStepStatus,
} from "@/entities/inventory-setup/model/import-job-types";
import type { InventorySetupImportGateState } from "@/entities/inventory-setup/model/types";

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

/**
 * Two-column import view: a narrow steps sidebar on the left, and on the right the
 * actionable phase (the supplier-selection gate) or a live activity log.
 */
export function ImportProgressView({
  job,
  onSubmitSelection,
  isSubmittingSelection = false,
}: {
  job: ImportJobRow | null;
  onSubmitSelection: (supplierIds: string[]) => void | Promise<void>;
  isSubmittingSelection?: boolean;
}) {
  const awaitingSelection = isImportJobAwaitingSelection(job);
  const gateState =
    awaitingSelection && job?.result
      ? (job.result as unknown as InventorySetupImportGateState)
      : null;
  const selectableSuppliers = gateState?.selectableSuppliers ?? [];

  // The very first phase (suppliers syncing, before the gate). The invoices step
  // is still pending until the user picks suppliers and parsing resumes, so it
  // cleanly marks "we're before the gate". prepDone latches after the preparing
  // checklist hands off so it never re-shows during the later parsing phase.
  const invoicesStep = job?.steps.find((s) => s.id === "invoices");
  const preGate =
    !!job &&
    !awaitingSelection &&
    job.status !== "failed" &&
    job.status !== "completed" &&
    (invoicesStep?.status ?? "pending") === "pending";

  const [prepDone, setPrepDone] = useState(false);
  const showPreparing = !prepDone && (preGate || awaitingSelection);
  const showGate = awaitingSelection && prepDone;

  return (
    <div className="grid gap-6 md:grid-cols-4">
      {/* Left: steps sidebar */}
      <aside className="space-y-2 md:col-span-1">
        <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
          Steps
        </p>
        {(job?.steps ?? []).map((step) => (
          <StepRow key={step.id} step={step} isActive={job?.currentStepId === step.id} />
        ))}
      </aside>

      {/* Right: actionable phase or live log */}
      <div className="space-y-4 md:col-span-3">
        {showPreparing ? (
          <SupplierPreparingSteps
            ready={awaitingSelection}
            onDone={() => setPrepDone(true)}
          />
        ) : showGate ? (
          <SupplierSelectionGate
            suppliers={selectableSuppliers}
            isSubmitting={isSubmittingSelection}
            onSubmit={onSubmitSelection}
          />
        ) : (
          <ImportActivityView job={job} />
        )}
      </div>
    </div>
  );
}
