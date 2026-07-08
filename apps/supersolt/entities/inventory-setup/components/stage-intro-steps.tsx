"use client";

import * as React from "react";
import { ArrowLeft, ArrowRight, Sparkles } from "lucide-react";

import { Button } from "@workspace/ui/components/button";
import { Card } from "@workspace/ui/components/card";
import { cn } from "@workspace/ui/lib/utils";
import { AgentBotAvatarVideo } from "@/entities/ai-agent-chat/components/agent-bot-avatar-video";
import { useStreamingText } from "@/entities/dashboard/components/superbot-suggestions-use-streaming-text";
import { buildStageIntroScript } from "@/entities/inventory-setup/components/stage-intro-copy";
import { IntroBenefitBoxes } from "@/entities/inventory-setup/components/intro-benefit-boxes";
import { StageOverviewGrid } from "@/entities/inventory-setup/components/stage-overview-grid";
import { SupplierTracebackCarousel } from "@/entities/inventory-setup/components/wizard/welcome/supplier-traceback-carousel";
import { SuperbotSpeechBubble } from "@/entities/inventory-setup/components/wizard/superbot-speech-bubble";
import type {
  InventorySetupWizardStageId,
  WizardStage,
} from "@/entities/inventory-setup/model/types";

const STEPS = ["intro", "why", "benefit"] as const;
type IntroStep = (typeof STEPS)[number];

/** Brand CTA — dark brand foreground reads against the pale-green primary. */
export const BRAND_BUTTON_CLASS =
  "gap-1.5 bg-[var(--brand-supersolt-primary)] text-black shadow-[0_4px_16px_-2px_var(--brand-supersolt-primary)] hover:bg-[var(--brand-supersolt-primary)]/90 hover:shadow-[0_6px_20px_-2px_var(--brand-supersolt-primary)]";

/**
 * Multi-step superbot stage intro — intro → why → benefit — with bot
 * choreography, animated visuals, step dots and Back/Next, mirroring the
 * one-time welcome. Reused by the section-page takeover and the welcome-back.
 */
export function StageIntroSteps({
  stageId,
  stages,
  firstName,
  reduceMotion,
  onDone,
}: {
  stageId: InventorySetupWizardStageId;
  stages: WizardStage[];
  firstName: string | null;
  reduceMotion: boolean;
  onDone: () => void;
}) {
  const script = React.useMemo(
    () => buildStageIntroScript(stageId, firstName),
    [stageId, firstName],
  );
  const statusById = React.useMemo(
    () => new Map(stages.map((s) => [s.id, s.status] as const)),
    [stages],
  );
  const [index, setIndex] = React.useState(0);
  const step: IntroStep = STEPS[index]!;
  const isIntro = index === 0;
  const isLast = index === STEPS.length - 1;

  const whyLen = useStreamingText(
    script.why,
    `stage-intro:${stageId}`,
    reduceMotion,
    step === "why",
  );
  const shownWhy = reduceMotion ? script.why : script.why.slice(0, whyLen);
  const whyStreaming = !reduceMotion && step === "why" && whyLen < script.why.length;

  const goNext = () => {
    if (isLast) {
      onDone();
      return;
    }
    setIndex((i) => Math.min(STEPS.length - 1, i + 1));
  };
  const goBack = () => setIndex((i) => Math.max(0, i - 1));

  const botAvatar = (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-emerald-50 dark:bg-emerald-950/40",
        !reduceMotion && "transition-all duration-500 ease-in-out",
        isIntro ? "h-44 w-44 sm:h-52 sm:w-52" : "h-32 w-32 sm:h-36 sm:w-36",
      )}
    >
      <AgentBotAvatarVideo
        aria-hidden
        poster="/images/supersolt-bot.png"
        className="h-full w-full"
      />
    </span>
  );

  const textBlock = (
    <div
      key={`lead-${step}`}
      className={cn(
        "flex w-full max-w-lg flex-col items-center gap-3",
        !reduceMotion && "animate-in fade-in slide-in-from-bottom-2 duration-500",
      )}
    >
      <span className="text-sm font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
        {script.eyebrow}
      </span>
      <SuperbotSpeechBubble
        className={cn("w-full", isIntro ? "text-center" : "text-center sm:text-left")}
      >
        {step === "why" ? (
          <p
            className="text-foreground/90 text-balance text-base leading-relaxed"
            aria-live="polite"
          >
            {shownWhy}
            {whyStreaming ? (
              <span
                className="bg-muted-foreground/60 ml-px inline-block h-[1.05em] w-px animate-pulse align-middle"
                aria-hidden
              />
            ) : null}
          </p>
        ) : step === "benefit" ? (
          <p className="text-foreground/90 text-balance text-base leading-relaxed">
            {script.benefitLead}
          </p>
        ) : (
          <>
            <p className="text-foreground text-balance text-lg font-medium leading-snug">
              {script.lead}
            </p>
            <p className="text-muted-foreground mt-1 text-base">{script.sub}</p>
          </>
        )}
      </SuperbotSpeechBubble>
    </div>
  );

  const stageContent =
    step === "why" ? (
      // The suppliers "why" is literally "…everything downstream accurate", so it
      // pairs with the sandwich→ingredients→stock→supplier traceback. Other stages
      // keep the four-pillar overview grid here.
      stageId === "suppliers" ? (
        <SupplierTracebackCarousel active reduceMotion={reduceMotion} />
      ) : (
        <StageOverviewGrid
          statusById={statusById}
          currentId={stageId}
          reduceMotion={reduceMotion}
        />
      )
    ) : step === "benefit" ? (
      <IntroBenefitBoxes
        benefits={script.benefits}
        active
        reduceMotion={reduceMotion}
      />
    ) : null;

  return (
    <div className="flex min-h-[32rem] w-full flex-1 items-center justify-center py-6">
      <div className="flex w-full max-w-4xl flex-col gap-4">
        <div className="flex items-center justify-between px-1">
          <span className="text-muted-foreground text-sm font-medium tracking-wide">
            Inventory Setup
          </span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-muted-foreground h-auto px-2 py-1 text-sm"
            onClick={onDone}
          >
            Skip
          </Button>
        </div>

        <Card className="bg-[var(--brand-supersolt-primary)]/10 flex w-full flex-col items-center justify-center gap-8 overflow-hidden px-8 py-12 sm:px-12">

      {isIntro ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-8 text-center">
          {botAvatar}
          {textBlock}
        </div>
      ) : (
        <div className="flex w-full flex-1 flex-col items-center justify-center gap-10 sm:flex-row sm:gap-10">
          <div className="flex flex-col items-center gap-5 sm:w-80">
            {botAvatar}
            {textBlock}
          </div>
          {stageContent ? (
            <div className="flex w-full justify-center sm:w-80">{stageContent}</div>
          ) : null}
        </div>
      )}

        </Card>

        <div className="flex flex-col items-center gap-4">
          <div className="flex items-center gap-3">
            {!isIntro ? (
              <Button
                type="button"
                variant="ghost"
                size="lg"
                onClick={goBack}
                className="text-muted-foreground text-base"
              >
                <ArrowLeft className="h-5 w-5" aria-hidden />
                Back
              </Button>
            ) : null}
            <Button
              type="button"
              onClick={goNext}
              size="lg"
              className={cn("h-12 px-7 text-base", BRAND_BUTTON_CLASS)}
            >
              {isLast ? (
                <>
                  <Sparkles className="h-5 w-5" aria-hidden />
                  {script.cta}
                </>
              ) : (
                <>
                  Next
                  <ArrowRight className="h-5 w-5" aria-hidden />
                </>
              )}
            </Button>
          </div>
          <StepDots count={STEPS.length} active={index} />
        </div>
      </div>
    </div>
  );
}

function StepDots({ count, active }: { count: number; active: number }) {
  return (
    <div className="flex items-center gap-2" aria-hidden>
      {Array.from({ length: count }).map((_, i) => (
        <span
          key={i}
          className={cn(
            "h-2 rounded-full transition-all duration-300",
            i === active
              ? "w-5 bg-[var(--brand-supersolt-primary)]"
              : "bg-muted-foreground/30 w-2",
          )}
        />
      ))}
    </div>
  );
}
