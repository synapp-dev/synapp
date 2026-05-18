"use client";

import CountUp from "react-countup";
import { cn } from "@workspace/ui/lib/utils";

/**
 * Slide-up + fade on the **counted value** (`--animate-slide-up-fade-in-superslow` in UI globals — 2s, 2× `slowest`).
 */
export const superslow = "animate-slide-up-fade-in-superslow";

/** Strong ease-out: most change early, final digits crawl (Penner / countup.js–style). */
function easeOutExpo(t: number, b: number, c: number, d: number): number {
  if (d === 0) return b + c;
  return c * (-Math.pow(2, (-10 * t) / d) + 1) * (1024 / 1023) + b;
}

type DashboardCountUpProps = {
  end: number;
  decimals?: number;
  duration?: number;
  /** Seconds before counting starts (e.g. match a parent entrance `animation-delay`). */
  delay?: number;
  prefix?: string;
  suffix?: string;
  /** Thousands separator; use "" for small values. */
  separator?: string;
  className?: string;
  /** Called when the count animation finishes. */
  onEnd?: () => void;
};

export function DashboardCountUp({
  end,
  decimals = 0,
  duration = 3,
  delay = 0,
  prefix,
  suffix,
  separator = ",",
  className,
  onEnd,
}: DashboardCountUpProps) {
  return (
    <CountUp
      className={cn("tabular-nums opacity-0", superslow, className)}
      start={0}
      end={end}
      decimals={decimals}
      duration={duration}
      delay={delay}
      prefix={prefix}
      suffix={suffix}
      separator={separator}
      preserveValue
      useEasing
      easingFn={easeOutExpo}
      onEnd={onEnd}
    />
  );
}
