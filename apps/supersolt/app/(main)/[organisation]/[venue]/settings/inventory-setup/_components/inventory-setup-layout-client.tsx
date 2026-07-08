"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useScopedSettingsAccess } from "@/entities/access/model/use-scoped-settings-access";
import { SetupStepperBanner } from "@/entities/inventory-setup/components/setup-stepper-banner";
import { SetupStageProceedCard } from "@/entities/inventory-setup/components/setup-stage-proceed-card";
import { SetupStageConfirmCard } from "@/entities/inventory-setup/components/setup-stage-confirm-card";
import { StageIntroSteps } from "@/entities/inventory-setup/components/stage-intro-steps";
import { useInventorySetupProgressQuery } from "@/entities/inventory-setup/model/useInventorySetupProgressQuery";
import { useWizardStateMutation } from "@/entities/inventory-setup/model/useWizardStateMutation";
import { useMeStore } from "@/entities/me/model/store";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { Separator } from "@workspace/ui/components/separator";

export function InventorySetupLayoutClient({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const access = useScopedSettingsAccess();
  const onSectionPage = pathname.includes("/settings/inventory-setup/");
  const progressQuery = useInventorySetupProgressQuery({
    organisationSlug: access.organisationSlug,
    venueSlug: access.venueSlug,
    enabled:
      onSectionPage && Boolean(access.organisationSlug && access.venueSlug),
  });
  const reduceMotion = usePrefersReducedMotion();
  const firstName = useMeStore((s) => s.currentUser?.firstName ?? null);
  const wizardMutation = useWizardStateMutation({
    organisationSlug: access.organisationSlug ?? "",
    venueSlug: access.venueSlug ?? "",
  });
  const [dismissedIntros, setDismissedIntros] = useState<Set<string>>(
    () => new Set(),
  );

  if (access.isLoading) {
    return (
      <div className="text-muted-foreground text-sm" aria-busy="true">
        Loading inventory setup…
      </div>
    );
  }

  if (!access.canSeeSettingsNav) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Access denied</CardTitle>
        </CardHeader>
        <CardContent className="text-muted-foreground text-sm">
          You do not have permission to view inventory setup for this venue.
        </CardContent>
      </Card>
    );
  }

  const { organisationSlug, venueSlug } = access;

  // The guided wizards (normalise / recipes / stock) are their own full-bleed
  // experiences — no stepper/proceed/intro chrome around them.
  if (/\/settings\/inventory-setup\/[^/]+\/wizard(?:\/|$)/.test(pathname)) {
    return <div className="flex min-h-0 flex-1 flex-col">{children}</div>;
  }

  // When the section you're standing on is complete and another stage follows,
  // surface the superbot nudge to advance.
  const stages = progressQuery.data?.wizard.stages ?? [];
  const currentIndex = stages.findIndex((stage) =>
    pathname.includes(`/settings/inventory-setup/${stage.id}`),
  );
  const currentStage = currentIndex >= 0 ? stages[currentIndex] : undefined;
  const nextStage = currentIndex >= 0 ? stages[currentIndex + 1] : undefined;
  const proceedCard =
    onSectionPage && currentStage?.complete && nextStage ? (
      <SetupStageProceedCard
        currentStage={currentStage}
        nextStage={nextStage}
        organisationSlug={organisationSlug}
        venueSlug={venueSlug}
      />
    ) : null;

  // The stage the operator is up to can only complete once its confirmation
  // sub-steps are acked, and those acks have no other UI. Surface them on the
  // pages where that judgement happens: any page of the stage itself, or a
  // page one of its acks deep-links to (batches live under products/recipes
  // while belonging to the Inventory stage). Hidden until at least one ack is
  // actionable, i.e. its prerequisite derived work is done.
  const activeStage = stages.find((stage) => stage.status === "current");
  const activeAcks =
    activeStage?.subSteps.filter((s) => s.kind === "ack") ?? [];
  const hasConfirmableAck = activeAcks.some((s) => !s.complete && !s.locked);
  const confirmCardHere =
    activeStage != null &&
    (pathname.includes(`/settings/inventory-setup/${activeStage.id}`) ||
      activeAcks.some(
        (s) => s.deepLink && pathname.includes(`/${s.deepLink}`),
      ));
  const confirmCard =
    onSectionPage && activeStage && hasConfirmableAck && confirmCardHere ? (
      <SetupStageConfirmCard
        stage={activeStage}
        nextStageLabel={
          stages[stages.findIndex((s) => s.id === activeStage.id) + 1]
            ?.label ?? null
        }
        organisationSlug={organisationSlug}
        venueSlug={venueSlug}
        canWrite={access.canSeeSettingsNav}
      />
    ) : null;

  // A first-time, full-screen superbot intro for the stage you've just reached.
  const showStageIntro =
    onSectionPage &&
    currentStage?.status === "current" &&
    !currentStage.introSeen &&
    !dismissedIntros.has(currentStage.id);
  const handleIntroDone = () => {
    if (!currentStage) return;
    setDismissedIntros((prev) => new Set(prev).add(currentStage.id));
    wizardMutation.mutate({ markIntroSeen: currentStage.id });
    // The suppliers intro hands straight off to the "import your first supplier"
    // picker rather than dropping onto an empty suppliers list.
    if (currentStage.id === "suppliers") {
      router.push(
        `/${organisationSlug}/${venueSlug}/settings/inventory-setup/suppliers/start`,
      );
    }
  };

  if (showStageIntro && currentStage) {
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        <StageIntroSteps
          stageId={currentStage.id}
          stages={stages}
          firstName={firstName}
          reduceMotion={reduceMotion}
          onDone={handleIntroDone}
        />
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-5">
      {onSectionPage ? (
        <>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
            <span className="text-muted-foreground text-xs font-medium tracking-wide">
              Inventory Setup
            </span>
            <span
              className="text-muted-foreground/50 text-xs select-none"
              aria-hidden
            >
              ·
            </span>
            {progressQuery.data ? (
              <SetupStepperBanner
                stages={progressQuery.data.wizard.stages}
                organisationSlug={organisationSlug}
                venueSlug={venueSlug}
              />
            ) : null}
          </div>
          <Separator />
          {proceedCard}
          {confirmCard}
        </>
      ) : null}
      {children}
    </div>
  );
}
