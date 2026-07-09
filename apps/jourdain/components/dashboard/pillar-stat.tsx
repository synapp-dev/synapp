"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { cn } from "@workspace/ui/lib/utils";
import { useCountUp } from "@/hooks/use-count-up";
import { scoreBand } from "@/lib/scoring/bands";
import type { TaskDomain } from "@/entities/tasks/model/types";

const DURATION_MS = 1200;

type PillarStatProps = {
  pillar: TaskDomain;
  label: string;
  icon: LucideIcon;
  score: number | null;
  completed: number;
  total: number;
  colorClass: string;
  delay: number;
};

/**
 * One Leetify-style pillar row: label on the left, a big count-up number on the
 * right and a thin hue bar beneath that sweeps in lockstep with the number.
 */
export function PillarStat({
  label,
  icon: Icon,
  score,
  completed,
  total,
  colorClass,
  delay,
}: PillarStatProps) {
  const reduce = useReducedMotion();
  const neutral = score === null;
  const target = score ?? 0;
  const animated = useCountUp(target, {
    duration: reduce ? 0 : DURATION_MS,
    delay: reduce ? 0 : delay * 1000,
  });
  const value = reduce ? target : animated;
  const band = neutral ? null : scoreBand(score);

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: neutral ? 0.5 : 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: [0.22, 1, 0.36, 1] }}
      className="space-y-1.5"
      aria-label={
        neutral
          ? `${label}: rest day`
          : `${label}: ${score} out of 100, ${completed} of ${total} done`
      }
    >
      <div className="flex items-center justify-between gap-2">
        <span className="flex min-w-0 items-center gap-2">
          <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span className="truncate text-sm font-medium text-muted-foreground">
            {label}
          </span>
        </span>
        {neutral ? (
          <span className="text-sm font-medium text-muted-foreground">Rest</span>
        ) : (
          <motion.span
            className={cn(
              "text-2xl font-bold tabular-nums tracking-tight",
              band === "high" ? "text-emerald-500" : "text-foreground",
            )}
            animate={
              band === "high" && !reduce ? { scale: [1, 1.12, 1] } : undefined
            }
            transition={{
              duration: 0.5,
              delay: delay + DURATION_MS / 1000,
              times: [0, 0.5, 1],
            }}
          >
            {Math.round(value)}
          </motion.span>
        )}
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        {neutral ? null : (
          <div
            className={cn("h-full rounded-full", colorClass)}
            style={{ width: `${value}%` }}
          />
        )}
      </div>
    </motion.div>
  );
}
