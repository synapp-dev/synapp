"use client";

import { Star } from "lucide-react";
import { cn } from "@workspace/ui/lib/utils";

export const OVERALL_RATING_STAR_SLOT_CLASS =
  "h-11 w-11 sm:h-12 sm:w-12 md:h-14 md:w-14";

/**
 * Five-star display for admin “Overall” rating; fills use Bullyproof brand primary from globals.
 */
export function OverallRatingStars({
  average,
  className,
}: {
  average: number | null | undefined;
  className?: string;
}) {
  const max = 5;
  const value =
    average == null ? 0 : Math.min(max, Math.max(0, average));

  return (
    <div
      className={cn("flex items-center gap-1 sm:gap-1.5", className)}
      aria-hidden
    >
      {Array.from({ length: max }, (_, i) => {
        const fill = Math.min(1, Math.max(0, value - i));
        return (
          <div
            key={i}
            className={cn("relative shrink-0", OVERALL_RATING_STAR_SLOT_CLASS)}
          >
            <Star
              className={cn(
                "pointer-events-none absolute left-0 top-0",
                OVERALL_RATING_STAR_SLOT_CLASS,
                "fill-transparent text-[color:var(--brand-bullyproof-primary)]/30"
              )}
              strokeWidth={1.35}
            />
            <div
              className={cn(
                "absolute left-0 top-0 overflow-hidden",
                OVERALL_RATING_STAR_SLOT_CLASS
              )}
              style={{ width: `${fill * 100}%` }}
            >
              <Star
                className={cn(
                  "pointer-events-none absolute left-0 top-0",
                  OVERALL_RATING_STAR_SLOT_CLASS,
                  "fill-[color:var(--brand-bullyproof-primary)] text-[color:var(--brand-bullyproof-primary)]"
                )}
                strokeWidth={1.35}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
