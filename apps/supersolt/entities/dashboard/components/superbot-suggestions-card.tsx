"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";

import {
  useScopedNavigation,
  type ScopedContext,
} from "@/entities/access/scoped-navigation-context";
import { useAgentChat } from "@/entities/ai-agent-chat/components/agent-chat-provider";
import {
  dummySuperbotSuggestions,
  type SuperbotSuggestion,
} from "@/entities/dashboard/model/dummy-superbot-suggestions";
import { SuperbotSuggestionNavButton } from "@/entities/dashboard/components/superbot-suggestion-nav-button";
import {
  AUTO_ADVANCE_MS,
  easeInOutCubic,
  PROGRESS_TICK_MS,
  SLIDE_EXIT_FADE_MS,
} from "@/entities/dashboard/components/superbot-suggestions-carousel-constants";
import { SuperbotSuggestionsContextPanel } from "@/entities/dashboard/components/superbot-suggestions-context-panel";
import { superbotSuggestionHref } from "@/entities/dashboard/components/superbot-suggestions-href";
import { SuperbotSuggestionsMainPanel } from "@/entities/dashboard/components/superbot-suggestions-main-panel";
import { useStreamingText } from "@/entities/dashboard/components/superbot-suggestions-use-streaming-text";
import {
  cleanVenueNameAgainstOrganisation,
  formatSlugAsDisplayName,
} from "@/entities/dashboard/lib/scope-place-display";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import { useAccessibleVenueGroupsQuery } from "@/entities/venues/model/useAccessibleVenueGroupsQuery";
import { cn } from "@workspace/ui/lib/utils";

export type SuperbotSuggestionsCardProps = {
  suggestions?: readonly SuperbotSuggestion[];
  /** When the pathname is `/dashboard`, CTAs use this org/venue pair for deep links. */
  linkScope?: ScopedContext | null;
  /**
   * Invoked after the suggestion context is written into Superbot chat and before
   * client navigation (e.g. expand the agent sidebar so the new message is visible).
   */
  onSuggestionHandoff?: () => void;
};

export type SuperbotSuggestionsCardViewProps = SuperbotSuggestionsCardProps & {
  navigate: (href: string) => void;
};

export function SuperbotSuggestionsCardView({
  suggestions = dummySuperbotSuggestions,
  linkScope = null,
  onSuggestionHandoff,
  navigate,
}: SuperbotSuggestionsCardViewProps) {
  const { beginSuperbotSuggestionNavigation } = useAgentChat();
  const { resolvedScope } = useScopedNavigation();
  const scope = resolvedScope ?? linkScope;
  const reduceMotion = usePrefersReducedMotion();
  const { data: organisations = [] } = useAccessibleVenueGroupsQuery();

  const scopePlaceLabels = React.useMemo(() => {
    if (!scope) {
      return null;
    }
    const org = organisations.find((o) => o.slug === scope.organisationSlug);
    const venueRow = org?.venues.find((v) => v.slug === scope.venueSlug);
    const organisationName =
      org?.name ?? formatSlugAsDisplayName(scope.organisationSlug);
    const rawVenueName =
      venueRow?.name ?? formatSlugAsDisplayName(scope.venueSlug);
    const venuePart = cleanVenueNameAgainstOrganisation(
      rawVenueName,
      organisationName,
    );
    return { organisationName, venuePart };
  }, [organisations, scope]);

  const handleScopedSuggestionClick = React.useCallback(
    (
      event: React.MouseEvent<HTMLAnchorElement>,
      suggestion: SuperbotSuggestion,
      targetHref: string,
    ) => {
      if (
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey ||
        event.button !== 0
      ) {
        return;
      }
      event.preventDefault();
      beginSuperbotSuggestionNavigation({
        suggestion,
        scopePlaceLabels,
      });
      onSuggestionHandoff?.();
      navigate(targetHref);
    },
    [
      beginSuperbotSuggestionNavigation,
      navigate,
      onSuggestionHandoff,
      scopePlaceLabels,
    ],
  );

  const [activeIndex, setActiveIndex] = React.useState(0);
  const [slideExiting, setSlideExiting] = React.useState(false);
  const slideExitingRef = React.useRef(false);

  const [hoverPaused, setHoverPaused] = React.useState(false);
  const hoverPausedRef = React.useRef(false);
  const progressFillRef = React.useRef<HTMLSpanElement | null>(null);
  const segmentStartRef = React.useRef(0);
  const totalPausedMsRef = React.useRef(0);
  const pauseEnteredAtRef = React.useRef<number | null>(null);
  const advancePendingRef = React.useRef(false);
  const autoAdvanceExitTimeoutRef = React.useRef<number | null>(null);

  const n = suggestions.length;
  const active = n > 0 ? suggestions[activeIndex % n]! : null;

  const clearAutoAdvanceExitTimeout = React.useCallback(() => {
    if (autoAdvanceExitTimeoutRef.current != null) {
      window.clearTimeout(autoAdvanceExitTimeoutRef.current);
      autoAdvanceExitTimeoutRef.current = null;
    }
  }, []);

  React.useEffect(() => {
    return () => {
      clearAutoAdvanceExitTimeout();
    };
  }, [clearAutoAdvanceExitTimeout]);

  React.useEffect(() => {
    hoverPausedRef.current = hoverPaused;
  }, [hoverPaused]);

  const bodyStreamEnabled = Boolean(active);
  const descriptionStreamLen = useStreamingText(
    active?.description ?? "",
    active?.id ?? "",
    reduceMotion,
    bodyStreamEnabled,
  );

  const descriptionStreamComplete =
    reduceMotion ||
    !active ||
    descriptionStreamLen >= active.description.length;

  const revealStage: 1 | 2 | 3 = reduceMotion
    ? 3
    : !active
      ? 1
      : descriptionStreamComplete
        ? 3
        : 2;

  const goTo = React.useCallback(
    (index: number) => {
      if (n === 0) {
        return;
      }
      clearAutoAdvanceExitTimeout();
      slideExitingRef.current = false;
      setSlideExiting(false);
      advancePendingRef.current = false;
      setActiveIndex(((index % n) + n) % n);
    },
    [n, clearAutoAdvanceExitTimeout],
  );

  React.useLayoutEffect(() => {
    if (reduceMotion) {
      return;
    }
    segmentStartRef.current = Date.now();
    totalPausedMsRef.current = 0;
    pauseEnteredAtRef.current = hoverPausedRef.current ? Date.now() : null;
    const el = progressFillRef.current;
    if (el) {
      el.style.transform = "scaleX(0)";
    }
  }, [activeIndex, reduceMotion]);

  React.useEffect(() => {
    if (reduceMotion) {
      return;
    }
    if (hoverPaused) {
      pauseEnteredAtRef.current = Date.now();
    } else if (pauseEnteredAtRef.current != null) {
      totalPausedMsRef.current += Date.now() - pauseEnteredAtRef.current;
      pauseEnteredAtRef.current = null;
    }
  }, [hoverPaused, reduceMotion]);

  React.useEffect(() => {
    if (reduceMotion || n === 0) {
      return;
    }

    const id = window.setInterval(() => {
      const now = Date.now();
      let elapsed = now - segmentStartRef.current - totalPausedMsRef.current;
      if (pauseEnteredAtRef.current != null) {
        elapsed -= now - pauseEnteredAtRef.current;
      }
      const linearT = Math.min(1, Math.max(0, elapsed / AUTO_ADVANCE_MS));
      const eased = easeInOutCubic(linearT);
      progressFillRef.current?.style.setProperty(
        "transform",
        `scaleX(${eased})`,
      );

      if (
        linearT >= 1 &&
        !advancePendingRef.current &&
        !slideExitingRef.current
      ) {
        advancePendingRef.current = true;
        slideExitingRef.current = true;
        setSlideExiting(true);
        clearAutoAdvanceExitTimeout();
        autoAdvanceExitTimeoutRef.current = window.setTimeout(() => {
          segmentStartRef.current = Date.now();
          totalPausedMsRef.current = 0;
          pauseEnteredAtRef.current = hoverPausedRef.current
            ? Date.now()
            : null;
          progressFillRef.current?.style.setProperty(
            "transform",
            "scaleX(0)",
          );
          setActiveIndex((i) => (i + 1) % n);
          slideExitingRef.current = false;
          setSlideExiting(false);
          advancePendingRef.current = false;
          autoAdvanceExitTimeoutRef.current = null;
        }, SLIDE_EXIT_FADE_MS) as unknown as number;
      }
    }, PROGRESS_TICK_MS);

    return () => window.clearInterval(id);
  }, [n, reduceMotion, clearAutoAdvanceExitTimeout]);

  if (n === 0 || !active) {
    return null;
  }

  const href = superbotSuggestionHref(active, scope);
  const footerContentVisible = descriptionStreamComplete || !href;

  const suggestionCardClassName = cn(
    "relative flex h-64 min-h-0 flex-col gap-0 overflow-hidden rounded-xl border-2 border-[color:color-mix(in_oklab,var(--brand-supersolt-primary)_32%,var(--border))] bg-gradient-to-br from-[color:color-mix(in_oklab,var(--brand-supersolt-primary)_12%,var(--background))] via-background to-[color:color-mix(in_oklab,var(--brand-supersolt-primary)_6%,var(--background))] p-0 py-0 shadow-sm transition-[border-color,box-shadow] md:col-span-3",
    "dark:border-[color:color-mix(in_oklab,var(--brand-supersolt-primary)_26%,var(--border))] dark:from-[color:color-mix(in_oklab,var(--brand-supersolt-primary)_7%,var(--card))] dark:via-card dark:to-[color:color-mix(in_oklab,var(--brand-supersolt-primary)_3%,var(--card))]",
    href &&
      "cursor-pointer hover:border-[color:color-mix(in_oklab,var(--brand-supersolt-primary)_48%,var(--border))] hover:shadow-md dark:hover:border-[color:color-mix(in_oklab,var(--brand-supersolt-primary)_40%,var(--border))]",
    !href && "cursor-default",
  );

  const suggestionCardBody = (
    <>
      <div className="relative flex min-h-0 flex-1 flex-col">
        <div
          key={active.id}
          aria-hidden
          className={cn(
            "superbot-suggestions-shifting-blobs pointer-events-none absolute inset-0 z-0",
            slideExiting &&
              !reduceMotion &&
              "animate-slide-down-fade-out-slow",
            slideExiting &&
              reduceMotion &&
              "opacity-0 transition-opacity duration-150",
          )}
        />
        <div
          className={cn(
            "relative z-10 flex min-h-0 flex-1 flex-col gap-4 md:flex-row",
            slideExiting && "pointer-events-none",
          )}
        >
          <SuperbotSuggestionsMainPanel
            active={active}
            reduceMotion={reduceMotion}
            slideExiting={slideExiting}
            revealStage={revealStage}
            descriptionStreamLen={descriptionStreamLen}
            descriptionStreamComplete={descriptionStreamComplete}
            navigable={Boolean(href)}
            footerContentVisible={footerContentVisible}
            scopePlaceLabels={scopePlaceLabels}
          />
          <SuperbotSuggestionsContextPanel
            suggestionId={active.id}
            reduceMotion={reduceMotion}
            slideExiting={slideExiting}
          />
        </div>
      </div>
    </>
  );

  return (
    <section role="region" aria-label="Superbot suggestions">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4 md:items-start">
        <div
          data-testid="superbot-suggestions-hover-surface"
          className="flex h-64 min-h-0 w-full flex-col md:col-span-1"
          onMouseEnter={() => setHoverPaused(true)}
          onMouseLeave={() => setHoverPaused(false)}
        >
          <div
            className="grid h-full min-h-0 w-full grid-cols-1 grid-rows-6 gap-0"
            role="group"
            aria-label="Jump to a suggestion"
          >
            {Array.from({ length: 6 }, (_, cellIndex) => {
              const s = suggestions[cellIndex];
              if (!s) {
                return (
                  <div
                    key={`superbot-suggestion-slot-${cellIndex}`}
                    className="min-h-11 rounded-full bg-transparent"
                    aria-hidden
                  />
                );
              }
              const selected = cellIndex === activeIndex;
              return (
                <SuperbotSuggestionNavButton
                  key={s.id}
                  suggestion={s}
                  selected={selected}
                  reduceMotion={reduceMotion}
                  hoverPaused={hoverPaused}
                  progressFillRef={progressFillRef}
                  onSelect={() => goTo(cellIndex)}
                />
              );
            })}
          </div>
        </div>

        {href ? (
          <Link
            href={href}
            onClick={(e) =>
              handleScopedSuggestionClick(e, active, href)
            }
            className={cn(
              suggestionCardClassName,
              "text-inherit no-underline outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              slideExiting && "pointer-events-none",
            )}
            aria-label={`Go to ${active.gridLabel}`}
          >
            {suggestionCardBody}
          </Link>
        ) : (
          <div
            className={cn(
              suggestionCardClassName,
              slideExiting && "pointer-events-none",
            )}
          >
            {suggestionCardBody}
          </div>
        )}
      </div>
    </section>
  );
}

export function SuperbotSuggestionsCard(props: SuperbotSuggestionsCardProps) {
  const router = useRouter();
  return (
    <SuperbotSuggestionsCardView
      {...props}
      navigate={(href) => {
        router.push(href);
      }}
    />
  );
}
