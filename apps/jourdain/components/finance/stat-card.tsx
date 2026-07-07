"use client";

import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { cn } from "@workspace/ui/lib/utils";
import { useCountUp } from "@/hooks/use-count-up";
import { formatMoney } from "@/lib/format";

const COUNTUP_MS = 1100;

export function StatCard({
  label,
  value,
  icon: Icon,
  sub,
  delay = 0,
  tone = "neutral",
}: {
  label: string;
  value: number;
  icon: LucideIcon;
  sub?: string;
  delay?: number;
  tone?: "neutral" | "positive" | "negative";
}) {
  const animated = useCountUp(value, { duration: COUNTUP_MS, delay });

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.45,
        delay: delay / 1000,
        ease: [0.22, 1, 0.36, 1],
      }}
      className="rounded-xl border bg-card p-4 text-card-foreground shadow-sm"
    >
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Icon className="h-4 w-4" />
        {label}
      </div>
      <p
        className={cn(
          "mt-2 text-2xl font-semibold tracking-tight tabular-nums sm:text-3xl",
          tone === "positive" && "text-green-600 dark:text-green-500",
          tone === "negative" && "text-red-600 dark:text-red-500"
        )}
      >
        {formatMoney(animated)}
      </p>
      {sub ? <p className="mt-1 text-xs text-muted-foreground">{sub}</p> : null}
    </motion.div>
  );
}
