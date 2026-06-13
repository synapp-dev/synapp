"use client";

import { Check, ChevronDown, Lock } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@workspace/ui/components/collapsible";
import { Badge } from "@workspace/ui/components/badge";
import { cn } from "@workspace/ui/lib/utils";
import { WIZARD_STAGE_NARRATION } from "@/entities/inventory-setup/lib/wizard-stages";
import type { WizardStage as WizardStageModel } from "@/entities/inventory-setup/model/types";
import { WizardStageIntro } from "@/entities/inventory-setup/components/wizard/wizard-stage-intro";
import {
  WizardSubStepList,
  type WizardSubStepListProps,
} from "@/entities/inventory-setup/components/wizard/wizard-substep-list";

export type WizardStageProps = {
  stage: WizardStageModel;
  index: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
} & Pick<
  WizardSubStepListProps,
  "organisationSlug" | "venueSlug" | "canWrite" | "devUnlockAll" | "pendingKey" | "onAck"
>;

export function WizardStage({
  stage,
  index,
  open,
  onOpenChange,
  ...subStepProps
}: WizardStageProps) {
  const narration = WIZARD_STAGE_NARRATION[stage.id];
  const Icon = narration.icon;
  const completedCount = stage.subSteps.filter((s) => s.complete).length;
  const lockedStage = stage.status === "locked" && !subStepProps.devUnlockAll;

  return (
    <Collapsible
      open={open}
      onOpenChange={onOpenChange}
      className={cn(
        "rounded-xl border transition-colors",
        stage.status === "complete" && "border-primary/30 bg-primary/[0.03]",
        stage.status === "current" && "border-[color:var(--brand-supersolt-primary)]/40",
        lockedStage && "bg-muted/20",
      )}
    >
      <CollapsibleTrigger className="flex w-full items-center gap-3 px-4 py-3.5 text-left">
        <span
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
            stage.status === "complete"
              ? "bg-primary text-primary-foreground"
              : lockedStage
                ? "bg-muted text-muted-foreground"
                : "bg-[color:var(--brand-supersolt-primary)]/12 text-[color:var(--brand-supersolt-primary)]",
          )}
          aria-hidden
        >
          {stage.status === "complete" ? (
            <Check className="h-5 w-5" />
          ) : lockedStage ? (
            <Lock className="h-4 w-4" />
          ) : (
            <Icon className="h-5 w-5" />
          )}
        </span>

        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span className="text-muted-foreground text-xs font-medium">
              Step {index + 1}
            </span>
            {stage.status === "current" ? (
              <Badge
                variant="secondary"
                className="bg-[color:var(--brand-supersolt-primary)]/12 text-[color:var(--brand-supersolt-primary)] h-5 px-1.5 text-[10px]"
              >
                You're here
              </Badge>
            ) : null}
          </span>
          <span className="block truncate text-base font-semibold tracking-tight">
            {stage.label}
          </span>
          <span className="text-muted-foreground block truncate text-xs">
            {narration.tagline}
          </span>
        </span>

        <span className="text-muted-foreground hidden text-xs sm:block">
          {completedCount}/{stage.subSteps.length} done
        </span>
        <ChevronDown
          className={cn(
            "text-muted-foreground h-4 w-4 shrink-0 transition-transform",
            open && "rotate-180",
          )}
          aria-hidden
        />
      </CollapsibleTrigger>

      <CollapsibleContent>
        <div className="flex flex-col gap-4 px-4 pt-1 pb-4">
          <WizardStageIntro narration={narration} />
          <WizardSubStepList subSteps={stage.subSteps} {...subStepProps} />
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
