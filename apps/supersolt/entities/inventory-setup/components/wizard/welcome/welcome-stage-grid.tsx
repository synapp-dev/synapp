"use client";

import * as React from "react";

import { cn } from "@workspace/ui/lib/utils";
import { useStreamingText } from "@/entities/dashboard/components/superbot-suggestions-use-streaming-text";
import {
  WELCOME_STAGE_BOXES,
  type WelcomeStageBox,
} from "@/entities/inventory-setup/components/wizard/welcome/welcome-copy";

// Time the card spends sliding in before its icon appears, then the gap between
// each subsequent element (icon → title → description).
const CARD_IN_MS = 380;
const STEP_MS = 220;

// Per-card entrance direction (the direction the card travels in): card 1 down,
// card 2 right, card 3 left, card 4 up.
const SLIDE_IN = [
  "slide-in-from-top-6",
  "slide-in-from-left-6",
  "slide-in-from-right-6",
  "slide-in-from-bottom-6",
] as const;

// Reveal phases for a single card, in order. The numeric rank drives which
// elements are visible yet.
const PHASE_RANK = {
  hidden: 0,
  card: 1,
  icon: 2,
  title: 3,
  desc: 4,
  done: 5,
} as const;
type Phase = keyof typeof PHASE_RANK;

/**
 * The four inventory-setup pillars as a 2x2 grid. Once `start` is true (the bot
 * has finished narrating) the cards reveal one at a time, and within each card
 * the parts come in sequence — the card slides in, then its icon, then its
 * title, then its description streams in like the agent chat. When a card's
 * description finishes streaming the next card begins.
 */
export function WelcomeStageGrid({
  start,
  reduceMotion,
}: {
  start: boolean;
  reduceMotion: boolean;
}) {
  // Index of the card currently allowed to reveal. -1 before `start`.
  const [activeIndex, setActiveIndex] = React.useState(reduceMotion ? Infinity : -1);

  React.useEffect(() => {
    if (reduceMotion) {
      setActiveIndex(Infinity);
      return;
    }
    if (start) {
      setActiveIndex((i) => (i < 0 ? 0 : i));
    }
  }, [start, reduceMotion]);

  const handleDone = React.useCallback((index: number) => {
    setActiveIndex((i) => Math.max(i, index + 1));
  }, []);

  return (
    <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2">
      {WELCOME_STAGE_BOXES.map((box, index) => (
        <WelcomeStageCard
          key={box.id}
          box={box}
          index={index}
          slideIn={SLIDE_IN[index] ?? SLIDE_IN[0]}
          active={index <= activeIndex}
          reduceMotion={reduceMotion}
          onDone={handleDone}
        />
      ))}
    </div>
  );
}

function WelcomeStageCard({
  box,
  index,
  slideIn,
  active,
  reduceMotion,
  onDone,
}: {
  box: WelcomeStageBox;
  index: number;
  slideIn: string;
  active: boolean;
  reduceMotion: boolean;
  onDone: (index: number) => void;
}) {
  const Icon = box.icon;
  const [phase, setPhase] = React.useState<Phase>(
    reduceMotion ? "done" : "hidden",
  );
  const startedRef = React.useRef(false);

  // Kick off the per-element reveal once this card becomes active.
  React.useEffect(() => {
    if (reduceMotion || !active || startedRef.current) {
      return;
    }
    startedRef.current = true;
    setPhase("card");
    const timers = [
      window.setTimeout(() => setPhase("icon"), CARD_IN_MS),
      window.setTimeout(() => setPhase("title"), CARD_IN_MS + STEP_MS),
      window.setTimeout(() => setPhase("desc"), CARD_IN_MS + STEP_MS * 2),
    ];
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [active, reduceMotion]);

  const streamingDesc = phase === "desc";
  const len = useStreamingText(
    box.summary,
    `welcome:card:${box.id}`,
    reduceMotion,
    streamingDesc,
  );
  const descDone = streamingDesc && len >= box.summary.length;

  // Advance to the next card once the description has fully streamed in.
  React.useEffect(() => {
    if (descDone) {
      setPhase("done");
      onDone(index);
    }
  }, [descDone, index, onDone]);

  const rank = PHASE_RANK[phase];
  const shownSummary =
    reduceMotion || rank >= PHASE_RANK.done
      ? box.summary
      : box.summary.slice(0, len);
  const cursor = streamingDesc && len < box.summary.length;

  return (
    <div
      className={cn(
        "border-border bg-card flex items-start gap-4 rounded-2xl border p-4 text-left sm:p-5",
        !reduceMotion && rank < PHASE_RANK.card && "opacity-0",
        !reduceMotion &&
          rank >= PHASE_RANK.card &&
          `animate-in fade-in duration-500 ${slideIn}`,
      )}
    >
      <span
        className={cn(
          "bg-muted text-foreground/70 flex h-14 w-14 shrink-0 items-center justify-center rounded-full",
          !reduceMotion && rank < PHASE_RANK.icon && "opacity-0",
          !reduceMotion &&
            rank >= PHASE_RANK.icon &&
            "animate-in fade-in zoom-in-75 duration-300",
        )}
      >
        <Icon className="h-7 w-7" aria-hidden />
      </span>
      <div className="min-w-0 space-y-1">
        <p
          className={cn(
            "text-base font-medium leading-tight",
            !reduceMotion && rank < PHASE_RANK.title && "opacity-0",
            !reduceMotion &&
              rank >= PHASE_RANK.title &&
              "animate-in fade-in slide-in-from-left-2 duration-300",
          )}
        >
          {box.label}
        </p>
        <p
          className="text-muted-foreground text-sm leading-snug"
          aria-live="polite"
        >
          {shownSummary}
          {cursor ? (
            <span
              className="bg-muted-foreground/60 ml-px inline-block h-[1em] w-px animate-pulse align-middle"
              aria-hidden
            />
          ) : null}
        </p>
      </div>
    </div>
  );
}
