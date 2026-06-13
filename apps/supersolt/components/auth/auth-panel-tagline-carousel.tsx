"use client";

import * as React from "react";

import { SLIDE_EXIT_FADE_MS } from "@/entities/dashboard/components/superbot-suggestions-carousel-constants";
import { useStreamingText } from "@/entities/dashboard/components/superbot-suggestions-use-streaming-text";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import { cn } from "@workspace/ui/lib/utils";

/** Time each tagline stays visible before exit (6–8s range). */
const AUTH_TAGLINE_ADVANCE_MS = 7_000;

export type AuthTaglinePart = {
  text: string;
  emphasis?: boolean;
};

export type AuthTagline = readonly AuthTaglinePart[];

export const AUTH_PANEL_TAGLINES: readonly AuthTagline[] = [
  [
    { text: "Hospitality " },
    { text: "operations", emphasis: true },
    { text: ", " },
    { text: "inventory", emphasis: true },
    { text: ", and " },
    { text: "workforce", emphasis: true },
    { text: " in one place." },
  ],
  [
    { text: "Track " },
    { text: "sales and labour", emphasis: true },
    { text: " across " },
    { text: "every venue", emphasis: true },
    { text: ", in real time." },
  ],
  [
    { text: "Roster staff", emphasis: true },
    { text: ", close " },
    { text: "timesheets", emphasis: true },
    { text: ", and spot gaps " },
    { text: "before service", emphasis: true },
    { text: "." },
  ],
  [
    { text: "Keep " },
    { text: "stock", emphasis: true },
    { text: ", " },
    { text: "order guides", emphasis: true },
    { text: ", and " },
    { text: "menu items", emphasis: true },
    { text: " aligned." },
  ],
  [
    { text: "Ask " },
    { text: "Superbot", emphasis: true },
    { text: " where to go next and " },
    { text: "what to fix first", emphasis: true },
    { text: "." },
  ],
];

function taglineFullText(parts: AuthTagline): string {
  return parts.map((part) => part.text).join("");
}

function renderStreamingTagline(
  parts: AuthTagline,
  streamLen: number,
  emphasisClassName: string,
): React.ReactNode {
  let remaining = streamLen;
  const nodes: React.ReactNode[] = [];

  for (let index = 0; index < parts.length; index += 1) {
    if (remaining <= 0) {
      break;
    }
    const part = parts[index]!;
    const visible = part.text.slice(0, remaining);
    remaining -= visible.length;
    if (visible.length === 0) {
      continue;
    }

    if (part.emphasis) {
      nodes.push(
        <strong key={index} className={emphasisClassName}>
          {visible}
        </strong>,
      );
    } else {
      nodes.push(<React.Fragment key={index}>{visible}</React.Fragment>);
    }
  }

  return nodes;
}

export type AuthPanelTaglineCarouselProps = {
  /** App theme is dark — tagline panel uses a light surface. */
  appIsDark: boolean;
  className?: string;
};

export function AuthPanelTaglineCarousel({
  appIsDark,
  className,
}: AuthPanelTaglineCarouselProps) {
  const reduceMotion = usePrefersReducedMotion();
  const [activeIndex, setActiveIndex] = React.useState(0);
  const [slideExiting, setSlideExiting] = React.useState(false);
  const slideExitingRef = React.useRef(false);
  const advancePendingRef = React.useRef(false);
  const segmentStartRef = React.useRef(Date.now());
  const exitTimeoutRef = React.useRef<number | null>(null);

  const count = AUTH_PANEL_TAGLINES.length;
  const activeParts = AUTH_PANEL_TAGLINES[activeIndex % count]!;
  const activeText = taglineFullText(activeParts);
  const runKey = `auth-tagline-${activeIndex}`;

  const streamLen = useStreamingText(
    activeText,
    runKey,
    reduceMotion,
    !slideExiting,
  );

  const streamComplete = reduceMotion || streamLen >= activeText.length;

  const emphasisClassName = appIsDark
    ? "font-bold text-zinc-900"
    : "font-bold text-zinc-50";

  const clearExitTimeout = React.useCallback(() => {
    if (exitTimeoutRef.current != null) {
      window.clearTimeout(exitTimeoutRef.current);
      exitTimeoutRef.current = null;
    }
  }, []);

  React.useLayoutEffect(() => {
    segmentStartRef.current = Date.now();
  }, [activeIndex]);

  React.useEffect(() => {
    return () => {
      clearExitTimeout();
    };
  }, [clearExitTimeout]);

  React.useEffect(() => {
    if (reduceMotion) {
      const id = window.setInterval(() => {
        setActiveIndex((i) => (i + 1) % count);
      }, AUTH_TAGLINE_ADVANCE_MS);
      return () => window.clearInterval(id);
    }

    const id = window.setInterval(() => {
      const elapsed = Date.now() - segmentStartRef.current;
      if (
        elapsed < AUTH_TAGLINE_ADVANCE_MS ||
        advancePendingRef.current ||
        slideExitingRef.current
      ) {
        return;
      }

      advancePendingRef.current = true;
      slideExitingRef.current = true;
      setSlideExiting(true);
      clearExitTimeout();
      exitTimeoutRef.current = window.setTimeout(() => {
        setActiveIndex((i) => (i + 1) % count);
        slideExitingRef.current = false;
        setSlideExiting(false);
        advancePendingRef.current = false;
        segmentStartRef.current = Date.now();
        exitTimeoutRef.current = null;
      }, SLIDE_EXIT_FADE_MS) as unknown as number;
    }, 50);

    return () => {
      window.clearInterval(id);
      clearExitTimeout();
    };
  }, [activeIndex, clearExitTimeout, count, reduceMotion]);

  return (
    <p
      aria-live="polite"
      className={cn(
        "min-h-[2.75rem] w-full max-w-2xs text-left text-lg font-medium tracking-tight text-center",
        appIsDark ? "text-zinc-600" : "text-zinc-400",
        className,
      )}
    >
      <span
        key={runKey}
        className={cn(
          "block",
          slideExiting && !reduceMotion && "animate-slide-down-fade-out-slow",
          slideExiting &&
            reduceMotion &&
            "opacity-0 transition-opacity duration-150",
        )}
      >
        {renderStreamingTagline(activeParts, streamLen, emphasisClassName)}
        {!reduceMotion && !slideExiting && !streamComplete ? (
          <span
            className="ml-px inline-block h-[1.05em] w-px animate-pulse bg-current/60 align-middle"
            aria-hidden
          />
        ) : null}
      </span>
    </p>
  );
}
