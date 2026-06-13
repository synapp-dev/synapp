"use client";

import * as React from "react";
import { ArrowLeft, ArrowRight, Sparkles } from "lucide-react";

import { Button } from "@workspace/ui/components/button";
import { Card } from "@workspace/ui/components/card";
import { cn } from "@workspace/ui/lib/utils";
import { AgentBotAvatarVideo } from "@/entities/ai-agent-chat/components/agent-bot-avatar-video";
import { useStreamingText } from "@/entities/dashboard/components/superbot-suggestions-use-streaming-text";
import { buildWelcomeScript } from "@/entities/inventory-setup/components/wizard/welcome/welcome-copy";
import { WelcomeStageGrid } from "@/entities/inventory-setup/components/wizard/welcome/welcome-stage-grid";
import { SupplierTracebackIllustration } from "@/entities/inventory-setup/components/wizard/welcome/supplier-traceback-illustration";
import { SupplierBenefitBoxes } from "@/entities/inventory-setup/components/wizard/welcome/supplier-benefit-boxes";

const STEPS = [
  "greeting",
  "overview",
  "supplierIntro",
  "supplierWhy",
  "supplierBenefit",
] as const;
type WelcomeStep = (typeof STEPS)[number];

export function InventorySetupWelcome({
  firstName,
  reduceMotion,
  onComplete,
  onSkip,
}: {
  firstName: string | null;
  reduceMotion: boolean;
  /** Final CTA — persist welcomeSeen then route to the suppliers page. */
  onComplete: () => void;
  /** Skip the intro — persist welcomeSeen and drop into the normal wizard. */
  onSkip: () => void;
}) {
  const script = React.useMemo(() => buildWelcomeScript(firstName), [firstName]);
  const [index, setIndex] = React.useState(0);
  const step: WelcomeStep = STEPS[index]!;
  const isLast = index === STEPS.length - 1;
  const isGreeting = index === 0;

  const goNext = () => {
    if (isLast) {
      onComplete();
      return;
    }
    setIndex((i) => Math.min(STEPS.length - 1, i + 1));
  };
  const goBack = () => setIndex((i) => Math.max(0, i - 1));

  const leadText: string = {
    greeting: script.greeting,
    overview: script.overview,
    supplierIntro: script.supplierIntroLead,
    supplierWhy: script.supplierWhy,
    supplierBenefit: script.supplierBenefit,
  }[step];

  // Stream the "why" line like the agent chat; show others instantly (fade-in).
  const streamingEnabled = step === "supplierWhy" && !reduceMotion;
  const whyVisibleLen = useStreamingText(
    script.supplierWhy,
    "welcome:supplierWhy",
    reduceMotion,
    step === "supplierWhy",
  );
  const shownLead =
    streamingEnabled && step === "supplierWhy"
      ? script.supplierWhy.slice(0, whyVisibleLen)
      : leadText;
  const whyStreaming =
    streamingEnabled &&
    step === "supplierWhy" &&
    whyVisibleLen < script.supplierWhy.length;

  const botAvatar = (
    <AgentBotAvatarVideo
      aria-hidden
      className={cn(
        !reduceMotion && "transition-all duration-500 ease-in-out",
        isGreeting ? "h-40 w-40 sm:h-48 sm:w-48" : "h-24 w-24 sm:h-28 sm:w-28",
      )}
    />
  );

  const textBlock = (
    <div
      key={`lead-${step}`}
      className={cn(
        "flex max-w-md flex-col gap-2",
        isGreeting
          ? "items-center text-center"
          : "items-center text-center sm:items-start sm:text-left",
        !reduceMotion && "animate-in fade-in slide-in-from-bottom-2 duration-500",
      )}
    >
      <p
        className="text-foreground text-balance text-lg font-medium leading-snug sm:text-xl"
        aria-live="polite"
      >
        {shownLead}
        {whyStreaming ? (
          <span
            className="bg-muted-foreground/60 ml-px inline-block h-[1.05em] w-px animate-pulse align-middle"
            aria-hidden
          />
        ) : null}
      </p>
      {step === "supplierIntro" ? (
        <p className="text-muted-foreground text-sm">{script.supplierIntroSub}</p>
      ) : null}
    </div>
  );

  const stageContent =
    step === "overview" || step === "supplierIntro" ? (
      <WelcomeStageGrid
        collapsed={step === "supplierIntro"}
        reduceMotion={reduceMotion}
      />
    ) : step === "supplierWhy" ? (
      <SupplierTracebackIllustration active reduceMotion={reduceMotion} />
    ) : step === "supplierBenefit" ? (
      <SupplierBenefitBoxes active reduceMotion={reduceMotion} />
    ) : null;

  return (
    <Card className="relative mx-auto flex min-h-[28rem] w-full max-w-2xl flex-col items-center gap-6 overflow-hidden border-0 bg-transparent px-6 py-10 shadow-none sm:min-h-[34rem] sm:px-10">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="text-muted-foreground absolute right-3 top-3 h-auto px-2 py-1 text-xs"
        onClick={onSkip}
      >
        Skip intro
      </Button>

      {isGreeting ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-6 text-center">
          {botAvatar}
          {textBlock}
        </div>
      ) : (
        <div className="flex w-full flex-1 flex-col items-center justify-center gap-8 sm:flex-row sm:gap-8">
          <div className="flex flex-col items-center gap-4 sm:w-72 sm:items-start">
            {botAvatar}
            {textBlock}
          </div>
          {stageContent ? (
            <div className="flex w-full justify-center sm:w-72">
              {stageContent}
            </div>
          ) : null}
        </div>
      )}

      <div className="mt-2 flex items-center gap-2">
        {!isGreeting ? (
          <Button
            type="button"
            variant="ghost"
            onClick={goBack}
            className="text-muted-foreground"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Back
          </Button>
        ) : null}
        <Button
          type="button"
          onClick={goNext}
          size="lg"
          className="bg-[var(--brand-supersolt-primary)] text-white hover:bg-[var(--brand-supersolt-primary)]/90"
        >
          {isLast ? (
            <>
              <Sparkles className="h-4 w-4" aria-hidden />
              Let&apos;s get started
            </>
          ) : (
            <>
              Next
              <ArrowRight className="h-4 w-4" aria-hidden />
            </>
          )}
        </Button>
      </div>

      <StepDots count={STEPS.length} active={index} />
    </Card>
  );
}

function StepDots({ count, active }: { count: number; active: number }) {
  return (
    <div className="flex items-center gap-1.5" aria-hidden>
      {Array.from({ length: count }).map((_, i) => (
        <span
          key={i}
          className={cn(
            "h-1.5 rounded-full transition-all duration-300",
            i === active
              ? "bg-[var(--brand-supersolt-primary)] w-4"
              : "bg-muted-foreground/30 w-1.5",
          )}
        />
      ))}
    </div>
  );
}
