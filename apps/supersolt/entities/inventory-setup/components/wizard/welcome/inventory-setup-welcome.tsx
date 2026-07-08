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
import { SuperbotSpeechBubble } from "@/entities/inventory-setup/components/wizard/superbot-speech-bubble";

// The opening intro is intentionally general — just the greeting and the
// four-pillar overview. All supplier-specific narration (the "let's start with
// suppliers" lead, the traceback and the benefits) now lives in the suppliers
// stage intro so it isn't said twice. See stage-intro-steps.tsx.
const STEPS = ["greeting", "overview"] as const;
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

  // Stream the overview line like the agent chat; the greeting shows instantly.
  const overviewLen = useStreamingText(
    script.overview,
    "welcome:overview",
    reduceMotion,
    step === "overview",
  );
  const shownOverview = reduceMotion
    ? script.overview
    : script.overview.slice(0, overviewLen);
  const overviewStreaming =
    !reduceMotion && step === "overview" && overviewLen < script.overview.length;

  return (
    <div className="flex min-h-[32rem] w-full flex-1 items-center justify-center py-6">
      <div className="flex w-full max-w-3xl flex-col gap-4">
        <div className="flex items-center justify-between px-1">
          <span className="text-muted-foreground text-sm font-medium tracking-wide">
            Inventory Setup
          </span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-muted-foreground h-auto px-2 py-1 text-sm"
            onClick={onSkip}
          >
            Skip intro
          </Button>
        </div>

        <Card className="bg-[var(--brand-supersolt-primary)]/10 flex w-full flex-col items-center justify-center gap-8 overflow-hidden px-8 py-12 sm:px-12">

      {isGreeting ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-8">
          <div className="flex items-center gap-6">
            <AgentBotAvatarVideo
              aria-hidden
              className={cn(
                "h-40 w-40 shrink-0 sm:h-48 sm:w-48",
                !reduceMotion && "transition-all duration-500 ease-in-out",
              )}
            />
            <h2 className="leading-snug">
              <span className="text-2xl font-normal">Welcome to your</span>
              <br />
              <span className="text-4xl font-extrabold uppercase tracking-wide">
                inventory setup
              </span>
            </h2>
          </div>
          <SuperbotSpeechBubble className="w-full max-w-lg text-left">
            <p className="text-foreground text-base font-medium leading-relaxed">
              {script.greeting}
            </p>
            <p className="text-muted-foreground mt-2 text-base leading-relaxed">
              {script.greetingBody}
            </p>
          </SuperbotSpeechBubble>
        </div>
      ) : (
        <div className="flex w-full flex-1 flex-col justify-center gap-8">
          <div className="flex items-start gap-5">
            <AgentBotAvatarVideo
              aria-hidden
              className="h-24 w-24 shrink-0 sm:h-28 sm:w-28"
            />
            <SuperbotSpeechBubble tail="left" className="flex-1 text-left">
              <p
                className="text-foreground/90 text-balance text-base leading-relaxed"
                aria-live="polite"
              >
                {shownOverview}
                {overviewStreaming ? (
                  <span
                    className="bg-muted-foreground/60 ml-px inline-block h-[1.05em] w-px animate-pulse align-middle"
                    aria-hidden
                  />
                ) : null}
              </p>
            </SuperbotSpeechBubble>
          </div>
          <WelcomeStageGrid start={!overviewStreaming} reduceMotion={reduceMotion} />
        </div>
      )}

        </Card>

        <div className="flex flex-col items-center gap-4">
          <div className="flex items-center gap-3">
            {!isGreeting ? (
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
              className="h-12 bg-[var(--brand-supersolt-primary)] px-7 text-base text-black hover:bg-[var(--brand-supersolt-primary)]/90"
            >
              {isLast ? (
                <>
                  <Sparkles className="h-5 w-5" aria-hidden />
                  Let&apos;s get started
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
              ? "bg-[var(--brand-supersolt-primary)] w-5"
              : "bg-muted-foreground/30 w-2",
          )}
        />
      ))}
    </div>
  );
}
