import { Check, Clock, Dot, X } from "lucide-react";
import { format, parseISO } from "date-fns";

import { cn } from "@workspace/ui/lib/utils";

import type { ApprovalStep } from "@/entities/requests/model/types";
import type { RequestStatus } from "@/lib/requests/config";

function decidedWhen(iso: string | null): string {
  if (!iso) return "";
  try {
    return format(parseISO(iso), "dd MMM yyyy · HH:mm");
  } catch {
    return "";
  }
}

export function ApprovalTimeline({
  approvals,
  currentStep,
  status,
}: {
  approvals: ApprovalStep[];
  currentStep: number;
  status: RequestStatus;
}) {
  const open = status === "submitted" || status === "in_review";

  return (
    <ol className="space-y-0">
      {approvals.map((step, idx) => {
        const isCurrent = open && step.stepOrder === currentStep;
        const approved = step.decision === "approved";
        const declined = step.decision === "declined";
        const isLast = idx === approvals.length - 1;

        return (
          <li key={step.id} className="flex gap-3">
            {/* Rail */}
            <div className="flex flex-col items-center">
              <span
                className={cn(
                  "flex size-7 items-center justify-center rounded-full border",
                  approved &&
                    "border-emerald-500 bg-emerald-500 text-white",
                  declined && "border-rose-500 bg-rose-500 text-white",
                  isCurrent &&
                    "border-amber-500 text-amber-600 ring-4 ring-amber-500/15",
                  !approved &&
                    !declined &&
                    !isCurrent &&
                    "border-muted-foreground/30 text-muted-foreground"
                )}
              >
                {approved ? (
                  <Check className="size-4" />
                ) : declined ? (
                  <X className="size-4" />
                ) : isCurrent ? (
                  <Clock className="size-3.5" />
                ) : (
                  <Dot className="size-5" />
                )}
              </span>
              {!isLast ? (
                <span
                  className={cn(
                    "w-px flex-1",
                    approved ? "bg-emerald-500/40" : "bg-border"
                  )}
                />
              ) : null}
            </div>

            {/* Body */}
            <div className={cn("pb-6", isLast && "pb-0")}>
              <p className="text-sm font-medium leading-7">{step.label}</p>
              {approved || declined ? (
                <p className="text-xs text-muted-foreground">
                  {declined ? "Declined" : "Approved"}
                  {step.signatureName || step.decidedByName
                    ? ` by ${step.signatureName ?? step.decidedByName}`
                    : ""}
                  {step.decidedAt ? ` · ${decidedWhen(step.decidedAt)}` : ""}
                </p>
              ) : isCurrent ? (
                <p className="text-xs text-amber-600">
                  Awaiting decision
                  {step.assigneeName ? ` from ${step.assigneeName}` : ""}
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Pending
                  {step.assigneeName ? ` · ${step.assigneeName}` : ""}
                </p>
              )}
              {step.note ? (
                <p className="mt-1 rounded-md bg-muted/60 px-2 py-1 text-xs text-muted-foreground">
                  “{step.note}”
                </p>
              ) : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
