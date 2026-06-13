"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PartyPopper } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Progress } from "@workspace/ui/components/progress";
import { useInventorySetupProgressQuery } from "@/entities/inventory-setup/model/useInventorySetupProgressQuery";
import { useWizardStateMutation } from "@/entities/inventory-setup/model/useWizardStateMutation";
import { useScopedSettingsAccess } from "@/entities/access/model/use-scoped-settings-access";
import { isInventorySetupSectionsUnlockedForDev } from "@/lib/inventory-setup/dev-unlock-all-sections";
import type { InventorySetupWizardStageId } from "@/entities/inventory-setup/model/types";
import { WizardStage } from "@/entities/inventory-setup/components/wizard/wizard-stage";
import { InventorySetupWelcome } from "@/entities/inventory-setup/components/wizard/welcome/inventory-setup-welcome";
import { useMeStore } from "@/entities/me/model/store";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import { buildScopedPath } from "@/lib/build-scoped-path";

export function InventorySetupWizard({
  organisation,
  venue,
}: {
  organisation: string;
  venue: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const replayWelcome = searchParams.get("welcome") === "1";
  const access = useScopedSettingsAccess();
  const canWrite = access.canSeeSettingsNav;
  const devUnlockAll = isInventorySetupSectionsUnlockedForDev();
  const firstName = useMeStore((s) => s.currentUser?.firstName ?? null);
  const reduceMotion = usePrefersReducedMotion();

  const progressQuery = useInventorySetupProgressQuery({
    organisationSlug: organisation,
    venueSlug: venue,
  });
  const wizardMutation = useWizardStateMutation({
    organisationSlug: organisation,
    venueSlug: venue,
  });

  const [openStage, setOpenStage] = useState<InventorySetupWizardStageId | null>(
    null,
  );
  const currentStageId = progressQuery.data?.wizard.currentStageId ?? null;

  // Auto-expand the current stage once the model resolves (until the user picks).
  useEffect(() => {
    setOpenStage((prev) => prev ?? currentStageId);
  }, [currentStageId]);

  if (progressQuery.isLoading) {
    return <WizardSkeleton />;
  }

  if (progressQuery.isError || !progressQuery.data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Couldn't load your setup</CardTitle>
          <CardDescription>
            Something went wrong loading your inventory setup progress.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <button
            type="button"
            className="text-primary text-sm font-medium underline underline-offset-2"
            onClick={() => progressQuery.refetch()}
          >
            Try again
          </button>
        </CardContent>
      </Card>
    );
  }

  const { wizard } = progressQuery.data;
  const totalSteps = wizard.stages.reduce(
    (sum, s) => sum + s.subSteps.length,
    0,
  );
  const doneSteps = wizard.stages.reduce(
    (sum, s) => sum + s.subSteps.filter((sub) => sub.complete).length,
    0,
  );
  const percent = totalSteps === 0 ? 0 : Math.round((doneSteps / totalSteps) * 100);

  // One-time superbot welcome on a fresh setup, or an explicit replay (`?welcome=1`).
  // A replay is purely visual — it never touches welcomeSeen or any setup data.
  const showWelcome = replayWelcome || (!wizard.welcomeSeen && doneSteps === 0);
  if (showWelcome) {
    const inventorySetupPath = buildScopedPath(
      organisation,
      venue,
      "settings/inventory-setup",
    );
    const markWelcomeSeen = () => {
      if (canWrite) wizardMutation.mutate({ markWelcomeSeen: true });
    };
    return (
      <InventorySetupWelcome
        firstName={firstName}
        reduceMotion={reduceMotion}
        onComplete={() => {
          if (!replayWelcome) markWelcomeSeen();
          router.push(
            buildScopedPath(
              organisation,
              venue,
              "settings/inventory-setup/suppliers",
            ),
          );
        }}
        onSkip={() => {
          if (replayWelcome) {
            // Drop the replay flag and fall back to the setup checklist.
            router.replace(inventorySetupPath);
            return;
          }
          markWelcomeSeen();
        }}
      />
    );
  }
  const pendingKey =
    wizardMutation.isPending && wizardMutation.variables
      ? (wizardMutation.variables.setSubStepAck?.key ?? null)
      : null;

  const handleAck = (key: string, value: boolean) => {
    wizardMutation.mutate({ setSubStepAck: { key, value } });
  };

  const handleOpenChange = (
    stageId: InventorySetupWizardStageId,
    open: boolean,
  ) => {
    setOpenStage(open ? stageId : null);
    if (open && !wizard.stages.find((s) => s.id === stageId)?.introSeen) {
      if (canWrite) {
        wizardMutation.mutate({ markIntroSeen: stageId });
      }
    }
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="text-xl">Let's set up your inventory</CardTitle>
            <CardDescription>
              I'll walk you through it, one step at a time.
            </CardDescription>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-muted-foreground text-sm font-medium tabular-nums">
              {doneSteps}/{totalSteps}
            </span>
            <Progress
              value={percent}
              className="w-32"
              indicatorStyle={{
                backgroundColor: "var(--brand-supersolt-primary)",
              }}
            />
          </div>
        </div>
        {wizard.allComplete ? (
          <div className="bg-primary/10 text-primary flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium">
            <PartyPopper className="h-4 w-4" aria-hidden />
            You're all set — your inventory is ready to roll.
          </div>
        ) : null}
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {!canWrite ? (
          <p className="text-muted-foreground text-xs">
            You can follow along here. Ask a manager to confirm steps and make changes.
          </p>
        ) : null}
        {wizard.stages.map((stage, index) => (
          <WizardStage
            key={stage.id}
            stage={stage}
            index={index}
            open={openStage === stage.id}
            onOpenChange={(open) => handleOpenChange(stage.id, open)}
            organisationSlug={organisation}
            venueSlug={venue}
            canWrite={canWrite}
            devUnlockAll={devUnlockAll}
            pendingKey={pendingKey}
            onAck={handleAck}
          />
        ))}
      </CardContent>
    </Card>
  );
}

function WizardSkeleton() {
  return (
    <Card aria-busy="true">
      <CardHeader>
        <div className="bg-muted h-6 w-56 animate-pulse rounded" />
        <div className="bg-muted/70 h-4 w-72 animate-pulse rounded" />
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="bg-muted/40 h-16 animate-pulse rounded-xl" />
        ))}
      </CardContent>
    </Card>
  );
}
