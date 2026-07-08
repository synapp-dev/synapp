"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { useInventorySetupProgressQuery } from "@/entities/inventory-setup/model/useInventorySetupProgressQuery";
import { useWizardStateMutation } from "@/entities/inventory-setup/model/useWizardStateMutation";
import { useScopedSettingsAccess } from "@/entities/access/model/use-scoped-settings-access";
import type { InventorySetupWizardStageId } from "@/entities/inventory-setup/model/types";
import { InventorySetupWelcome } from "@/entities/inventory-setup/components/wizard/welcome/inventory-setup-welcome";
import { InventorySetupWelcomeBack } from "@/entities/inventory-setup/components/wizard/inventory-setup-welcome-back";
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
  const firstName = useMeStore((s) => s.currentUser?.firstName ?? null);
  const reduceMotion = usePrefersReducedMotion();
  // Leaving the welcome via "Let's get started" marks welcomeSeen (optimistic),
  // which would briefly drop us into the welcome-back greeting before the route
  // push lands. Freeze on the welcome screen until navigation completes.
  const [isLeavingWelcome, setIsLeavingWelcome] = React.useState(false);

  const progressQuery = useInventorySetupProgressQuery({
    organisationSlug: organisation,
    venueSlug: venue,
  });
  const wizardMutation = useWizardStateMutation({
    organisationSlug: organisation,
    venueSlug: venue,
  });

  const goToStage = (stageId: InventorySetupWizardStageId) => {
    router.push(
      buildScopedPath(
        organisation,
        venue,
        `settings/inventory-setup/${stageId}`,
      ),
    );
  };

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
  const doneSteps = wizard.stages.reduce(
    (sum, s) => sum + s.subSteps.filter((sub) => sub.complete).length,
    0,
  );

  // One-time superbot welcome on a fresh setup, or an explicit replay (`?welcome=1`).
  // A replay is purely visual — it never touches welcomeSeen or any setup data.
  const showWelcome =
    replayWelcome || isLeavingWelcome || (!wizard.welcomeSeen && doneSteps === 0);
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
          setIsLeavingWelcome(true);
          goToStage("suppliers");
        }}
        onSkip={() => {
          if (replayWelcome) {
            // Drop the replay flag and fall back to the welcome-back greeting.
            router.replace(inventorySetupPath);
            return;
          }
          markWelcomeSeen();
        }}
      />
    );
  }

  // Returning users (welcome already seen): a per-visit "welcome back" greeting
  // whose Continue drops them straight onto the stage they're up to. The section
  // page then plays that stage's intro and carries the stepper for navigation —
  // there's no separate root checklist.
  const landingStage =
    wizard.stages.find((s) => s.status === "current") ??
    wizard.stages.find((s) => s.id === wizard.currentStageId) ??
    wizard.stages[0];

  if (!landingStage) return null;

  return (
    <InventorySetupWelcomeBack
      stages={wizard.stages}
      currentStage={landingStage}
      firstName={firstName}
      reduceMotion={reduceMotion}
      onDone={() => goToStage(landingStage.id)}
    />
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
