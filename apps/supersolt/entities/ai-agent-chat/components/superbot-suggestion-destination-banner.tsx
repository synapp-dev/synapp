"use client";

import { Bot, X } from "lucide-react";
import { useMemo } from "react";

import { useAgentChat } from "@/entities/ai-agent-chat/components/agent-chat-provider";
import { normalizeSuperbotPathSuffix } from "@/entities/ai-agent-chat/lib/superbot-suggestion-handoff";
import { useStreamingText } from "@/entities/dashboard/components/superbot-suggestions-use-streaming-text";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import { Button } from "@workspace/ui/components/button";
import { cn } from "@workspace/ui/lib/utils";

export type SuperbotSuggestionDestinationBannerProps = {
  /** Matches `SuperbotSuggestion.pathSuffix` after normalisation. */
  pathSuffix: string;
  className?: string;
};

export function SuperbotSuggestionDestinationBanner({
  pathSuffix,
  className,
}: SuperbotSuggestionDestinationBannerProps) {
  const { superbotPageHandoff, clearSuperbotPageHandoff } = useAgentChat();
  const reduceMotion = usePrefersReducedMotion();
  const expected = useMemo(
    () => normalizeSuperbotPathSuffix(pathSuffix),
    [pathSuffix],
  );

  const handoff =
    superbotPageHandoff &&
    superbotPageHandoff.source === "superbot-suggestion" &&
    superbotPageHandoff.pathSuffix === expected
      ? superbotPageHandoff
      : null;

  const description = handoff?.description ?? "";
  const followUp = handoff?.pageFollowUpQuestion ?? "";
  const hasFollowUp = followUp.trim().length > 0;

  const descRunKey = handoff ? `${handoff.suggestionId}:desc` : "banner-idle-desc";
  const descriptionStreamLen = useStreamingText(
    description,
    descRunKey,
    reduceMotion,
    Boolean(handoff),
  );

  const descriptionStreamComplete =
    !handoff ||
    reduceMotion ||
    descriptionStreamLen >= description.length;

  const qRunKey = handoff ? `${handoff.suggestionId}:q` : "banner-idle-q";
  const questionStreamLen = useStreamingText(
    followUp,
    qRunKey,
    reduceMotion,
    Boolean(handoff) && descriptionStreamComplete && hasFollowUp,
  );

  const questionStreamComplete =
    !hasFollowUp ||
    reduceMotion ||
    questionStreamLen >= followUp.length;

  if (!handoff) {
    return null;
  }

  return (
    <div
      role="alert"
      className={cn(
        "relative rounded-lg border border-[color:color-mix(in_oklab,var(--brand-supersolt-primary)_35%,var(--border))] bg-[color:color-mix(in_oklab,var(--brand-supersolt-primary)_8%,var(--background))] p-4 pr-12 shadow-sm dark:bg-[color:color-mix(in_oklab,var(--brand-supersolt-primary)_6%,var(--card))]",
        className,
      )}
    >
      <h2 className="pr-8 text-base font-semibold leading-snug tracking-tight">
        Superbot — {handoff.gridLabel}
      </h2>
      <div className="mt-3 flex items-start gap-2">
        <Bot
          className="h-6 w-6 shrink-0 text-[color:var(--brand-supersolt-primary)]"
          aria-hidden
        />
        <div className="relative min-w-0 max-w-full flex-1 rounded-2xl rounded-tl-md border border-border bg-muted/45 px-3 py-2.5 shadow-md dark:bg-muted/25">
          <span
            aria-hidden
            className="absolute right-full top-[1.25rem] mr-px block h-0 w-0 border-y-[7px] border-y-transparent border-r-[9px] border-r-muted/45 dark:border-r-muted/25"
          />
          <p
            aria-live={descriptionStreamComplete ? "polite" : "off"}
            className="relative z-10 m-0 text-sm leading-snug text-muted-foreground"
          >
            {description.slice(0, descriptionStreamLen)}
            {!reduceMotion && descriptionStreamLen < description.length ? (
              <span
                className="ml-px inline-block h-[1.05em] w-px animate-pulse bg-muted-foreground/60 align-middle"
                aria-hidden
              />
            ) : null}
          </p>
          {descriptionStreamComplete && hasFollowUp ? (
            <p
              aria-live={questionStreamComplete ? "polite" : "off"}
              className="relative z-10 m-0 mt-2 text-sm font-medium leading-snug text-foreground"
            >
              {followUp.slice(0, questionStreamLen)}
              {!reduceMotion && questionStreamLen < followUp.length ? (
                <span
                  className="ml-px inline-block h-[1.05em] w-px animate-pulse bg-muted-foreground/60 align-middle"
                  aria-hidden
                />
              ) : null}
            </p>
          ) : null}
        </div>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="absolute right-2 top-2 h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"
        aria-label="Dismiss Superbot note"
        onClick={() => clearSuperbotPageHandoff()}
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}
