"use client";

import { useEffect, useState } from "react";
import { Timer } from "lucide-react";

/**
 * Live "hit Xero's API limit — resuming in 0:42" banner. Renders nothing when
 * the pause timestamp is absent or already past; ticks locally every second so
 * the countdown runs smoothly between server progress writes.
 */
export function XeroThrottleCountdown({
  throttledUntilMs,
}: {
  throttledUntilMs: number | null | undefined;
}) {
  const [nowMs, setNowMs] = useState(() => Date.now());

  const active = typeof throttledUntilMs === "number" && throttledUntilMs > nowMs;

  useEffect(() => {
    if (!active) return;
    const id = window.setInterval(() => setNowMs(Date.now()), 1_000);
    return () => window.clearInterval(id);
  }, [active]);

  if (!active) return null;

  const remainingSec = Math.max(0, Math.ceil((throttledUntilMs - nowMs) / 1_000));
  const minutes = Math.floor(remainingSec / 60);
  const seconds = remainingSec % 60;
  const clock =
    minutes > 0
      ? `${minutes}m ${String(seconds).padStart(2, "0")}s`
      : `${seconds}s`;

  return (
    <div className="animate-in fade-in flex items-center gap-2.5 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 dark:border-amber-500/40 dark:bg-amber-500/10">
      <Timer className="size-4 shrink-0 text-amber-600 dark:text-amber-400" />
      <p className="text-xs font-medium text-amber-900 dark:text-amber-100">
        Hit Xero&apos;s API limit — everything&apos;s safe, trying again in{" "}
        <span className="tabular-nums">{clock}</span>
      </p>
    </div>
  );
}
