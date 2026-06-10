"use client";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip";
import { cn } from "@workspace/ui/lib/utils";

// Static id: every badge shares the same gradient definition, so the id never
// needs to be unique. A constant avoids `useId()` hydration mismatches caused
// by the surrounding tree shifting between server render and client hydration.
const GOLD_GRADIENT_ID = "gold-verified-seal";

type GoldVerifiedBadgeProps = {
  className?: string;
  /** Tooltip text; set `false` to disable. */
  tooltip?: string | false;
};

/** Same geometry as Lucide `BadgeCheck`; seal uses a gold gradient, check stays dark stroke. */
export function GoldVerifiedBadge({
  className,
  tooltip = "Pro Player",
}: GoldVerifiedBadgeProps) {
  const svg = (
    <svg
      viewBox="0 0 24 24"
      className="size-7 shrink-0 drop-shadow-md sm:size-8"
      role="img"
      aria-hidden
    >
      <defs>
        <linearGradient
          id={GOLD_GRADIENT_ID}
          x1="5"
          y1="4"
          x2="19"
          y2="21"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#fff9e8" />
          <stop offset="0.28" stopColor="#f2cf55" />
          <stop offset="0.58" stopColor="#d4a017" />
          <stop offset="1" stopColor="#7a5a0c" />
        </linearGradient>
      </defs>
      <path
        d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z"
        fill={`url(#${GOLD_GRADIENT_ID})`}
        stroke="#4a3a0a"
        strokeWidth={0.5}
        strokeLinejoin="round"
      />
      <path
        d="m9 12 2 2 4-4"
        fill="none"
        stroke="#141008"
        strokeWidth={2.25}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );

  if (tooltip === false) {
    return (
      <span className={cn("inline-flex shrink-0", className)} role="img" aria-label="Verified">
        {svg}
      </span>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          tabIndex={0}
          className={cn(
            "inline-flex shrink-0 cursor-default rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/40",
            className,
          )}
          aria-label={`Verified — ${tooltip}`}
        >
          {svg}
        </span>
      </TooltipTrigger>
      <TooltipContent side="right" sideOffset={0} align="center">
        {tooltip}
      </TooltipContent>
    </Tooltip>
  );
}
