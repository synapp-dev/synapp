"use client";

import type { LucideIcon } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardTitle,
} from "@workspace/ui/components/card";
import { cn } from "@workspace/ui/lib/utils";
import { DashboardCountUp } from "@/entities/dashboard/components/dashboard-count-up";

export type InventoryKpiTone = "neutral" | "good" | "watch" | "bad";

const TONE_ICON_CLASSES: Record<InventoryKpiTone, string> = {
  neutral: "bg-muted text-muted-foreground",
  good: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  watch: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  bad: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
};

export type InventoryKpiCardProps = {
  label: string;
  icon: LucideIcon;
  tone?: InventoryKpiTone;
  countUpEnd: number;
  countUpDecimals?: number;
  countUpPrefix?: string;
  countUpSuffix?: string;
  /** Small line under the value, e.g. "12 line items". */
  footnote?: string;
  /** Seconds before the count-up starts; match the card's entrance delay. */
  countUpDelaySeconds?: number;
  isLoading?: boolean;
};

export function InventoryKpiCard({
  label,
  icon: Icon,
  tone = "neutral",
  countUpEnd,
  countUpDecimals = 0,
  countUpPrefix,
  countUpSuffix,
  footnote,
  countUpDelaySeconds = 0,
  isLoading,
}: InventoryKpiCardProps) {
  return (
    <Card
      className={cn(
        "group h-full gap-0 py-0 shadow-sm transition-all duration-300",
        "hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg",
      )}
    >
      <CardContent className="flex h-full min-h-28 flex-col justify-between gap-3 px-5 py-4">
        <div className="flex items-center justify-between gap-2">
          <CardDescription className="text-xs uppercase leading-none tracking-wider">
            {label}
          </CardDescription>
          <span
            aria-hidden
            className={cn(
              "flex size-7 shrink-0 items-center justify-center rounded-lg transition-transform duration-300 group-hover:scale-110",
              TONE_ICON_CLASSES[tone],
            )}
          >
            <Icon className="size-3.5" />
          </span>
        </div>
        <div className="min-w-0 space-y-1">
          <CardTitle className="min-w-0 text-3xl leading-none tracking-tight tabular-nums md:text-4xl">
            {isLoading ? (
              <span className="text-muted-foreground/40 text-2xl">—</span>
            ) : (
              <DashboardCountUp
                end={countUpEnd}
                decimals={countUpDecimals}
                duration={1.1}
                delay={countUpDelaySeconds}
                prefix={countUpPrefix}
                suffix={countUpSuffix}
                separator=","
              />
            )}
          </CardTitle>
          {footnote ? (
            <p className="text-muted-foreground truncate text-xs">{footnote}</p>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
