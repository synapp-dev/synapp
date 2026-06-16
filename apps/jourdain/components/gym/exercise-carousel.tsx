"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "@workspace/ui/components/carousel";
import { Button } from "@workspace/ui/components/button";
import { cn } from "@workspace/ui/lib/utils";
import { ExerciseCard } from "@/components/gym/exercise-card";
import type {
  Exercise,
  ExerciseStandards,
  Sex,
} from "@/entities/gym/model/types";

/**
 * Horizontal carousel of a muscle's exercises. Every card renders the full
 * expanded ExerciseCard at the same size; the neighbours just sit dimmed and
 * peek in from the sides. The centred card re-runs its count-up + chart
 * animation each time it gains focus. Drag, click a side card, use the arrow
 * buttons, or press ← / → to move through them.
 */
export function ExerciseCarousel({
  exercises,
  standards,
  bests,
  bodyweight,
  sex,
  startIndex = 0,
  onHoverExercise,
}: {
  exercises: Exercise[];
  standards: Map<string, ExerciseStandards> | undefined;
  bests: Record<string, number> | undefined;
  bodyweight: number | null;
  sex: Sex;
  /** Which card to centre on first (e.g. the middle one for the full library). */
  startIndex?: number;
  /** Reports the exercise the body map should light up — the centred card as you
   *  pan, or a side card while it's hovered. Updates on every move/pan. */
  onHoverExercise?: (exercise: Exercise | null) => void;
}) {
  const [api, setApi] = useState<CarouselApi>();
  const [selected, setSelected] = useState(startIndex);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);
  // Whether the user has actually panned yet. Until then we report no focus, so
  // a fresh mount (which happens after every select/deselect, since the parent
  // remounts the carousel) leaves the body + stats in their default state.
  const [hasPanned, setHasPanned] = useState(false);

  useEffect(() => {
    if (!api) return;
    const sync = () => {
      setSelected(api.selectedScrollSnap());
      setCanPrev(api.canScrollPrev());
      setCanNext(api.canScrollNext());
    };
    // "select" only fires when the snap actually changes — i.e. a real pan
    // (drag, arrows, ← / →, or clicking a side card), never the initial mount.
    const onUserSelect = () => {
      setHasPanned(true);
      sync();
    };
    sync();
    api.on("select", onUserSelect);
    api.on("reInit", sync);
    return () => {
      api.off("select", onUserSelect);
      api.off("reInit", sync);
    };
  }, [api]);

  // Let ← / → drive the carousel while it's on screen.
  useEffect(() => {
    if (!api) return;
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable))
        return;
      if (e.key === "ArrowLeft") api.scrollPrev();
      else if (e.key === "ArrowRight") api.scrollNext();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [api]);

  // The body map + stats track the carousel: once you've panned, the centred
  // card drives the highlight (updating on every move, even while the cursor
  // rests on a nav button). Only the active card counts — hovering side cards
  // is intentionally inert (it used to thrash the stats panel). Before the
  // first pan we report nothing, so the default state shows.
  const activeExercise = exercises[selected] ?? null;
  const focusEx = hasPanned ? activeExercise : null;
  const onHoverRef = useRef(onHoverExercise);
  onHoverRef.current = onHoverExercise;
  useEffect(() => {
    onHoverRef.current?.(focusEx);
  }, [focusEx]);

  return (
    <div className="flex items-center justify-center gap-2">
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="size-8 shrink-0 rounded-full"
        onClick={() => api?.scrollPrev()}
        disabled={!canPrev}
        aria-label="Previous exercise"
      >
        <ChevronLeft />
      </Button>

      <Carousel
        setApi={setApi}
        orientation="horizontal"
        opts={{ align: "center", containScroll: false, startIndex }}
        className="w-full max-w-[58rem]"
      >
        <CarouselContent className="items-start">
          {exercises.map((ex, i) => {
            const centered = i === selected;
            // Lazy-load window: only cards within 2 of the centred one mount
            // their trend chart (and so fetch its history); the rest stay as a
            // placeholder until you scroll near them.
            const near = Math.abs(i - selected) <= 2;
            const std = ex.strengthLevelSlug
              ? standards?.get(ex.strengthLevelSlug)
              : undefined;
            return (
              <CarouselItem key={ex.id} className="basis-[32rem]">
                <div
                  role="button"
                  tabIndex={centered ? -1 : 0}
                  onClick={() => api?.scrollTo(i)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      api?.scrollTo(i);
                    }
                  }}
                  className={cn(
                    "transition-all duration-300",
                    centered
                      ? "opacity-100"
                      : "cursor-pointer opacity-50 grayscale hover:opacity-75",
                  )}
                >
                  {/* Every card is the full expanded ExerciseCard. Only the
                      centred card animates + shows its real colours; the rest
                      render static and greyed. Keying on focus state remounts
                      the card as it becomes centred so its count-up + chart
                      replay from scratch (off cached, preloaded history). */}
                  <ExerciseCard
                    key={centered ? "active" : "idle"}
                    exerciseId={ex.id}
                    name={ex.name}
                    standards={std}
                    best={bests?.[ex.id] ?? null}
                    bodyweight={bodyweight}
                    sex={sex}
                    expanded
                    animate={centered}
                    showTrend={near}
                    className="gap-0 border-muted/60 bg-muted/30 py-0 shadow-none"
                  />
                </div>
              </CarouselItem>
            );
          })}
        </CarouselContent>
      </Carousel>

      <Button
        type="button"
        variant="outline"
        size="icon"
        className="size-8 shrink-0 rounded-full"
        onClick={() => api?.scrollNext()}
        disabled={!canNext}
        aria-label="Next exercise"
      >
        <ChevronRight />
      </Button>
    </div>
  );
}
