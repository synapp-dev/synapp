"use client";

import type { LucideIcon } from "lucide-react";
import CountUp from "react-countup";
import {
  Card,
  CardContent,
} from "@workspace/ui/components/card";
import { Skeleton } from "@workspace/ui/components/skeleton";

const DEFAULT_COUNTUP_DELAY = 2.7;
const DEFAULT_COUNTUP_DURATION = 1.2;
const CARD_ANIMATION_DURATION = 0.3;

export type SchoolInfoCardProps = {
  icon: LucideIcon;
  title: string;
  value: number;
  description: React.ReactNode;
  countUpDuration?: number;
  countUpDelay?: number;
  countUpSuffix?: string;
  /** Delay in ms for staggered slide-in from top (left to right) */
  cardAnimationDelayMs?: number;
  /** Delay in ms for number fade-in - offset to match card stagger */
  numberAnimationDelayMs?: number;
  isLoading?: boolean;
};

export function SchoolInfoCard({
  icon: Icon,
  title,
  value,
  description,
  countUpDuration = DEFAULT_COUNTUP_DURATION,
  countUpDelay = DEFAULT_COUNTUP_DELAY,
  countUpSuffix,
  cardAnimationDelayMs,
  numberAnimationDelayMs,
  isLoading = false,
}: SchoolInfoCardProps) {
  if (isLoading) {
    return (
      <Card className="h-full py-4 transition-all shadow hover:shadow-md hover:border-primary/50">
        <CardContent className="flex flex-col items-stretch gap-3 pt-4 pb-4 px-6 text-left">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-16 w-24 ml-auto" />
          <Skeleton className="h-4 w-28" />
        </CardContent>
      </Card>
    );
  }

  const cardStyle =
    cardAnimationDelayMs !== undefined
      ? {
          opacity: 0,
          animation: `slide-down-fade-in ${CARD_ANIMATION_DURATION}s ease-out ${cardAnimationDelayMs}ms forwards`,
        }
      : undefined;

  return (
    <Card
      className="h-full py-1 px-0 transition-all shadow hover:shadow-md hover:border-primary/50"
      style={cardStyle}
    >
      <CardContent className="flex flex-col items-stretch gap-3 pt-4 pb-4 px-6 text-left">
        <p className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
          <Icon className="h-5 w-5 shrink-0" />
          {title}
        </p>
        <span
          className="text-6xl font-bold tabular-nums block text-right opacity-0"
          style={{
            animation: `slide-up-fade-in ${countUpDuration}s ease-out ${(numberAnimationDelayMs ?? countUpDelay * 1000) / 1000}s forwards`,
          }}
        >
          <CountUp
            start={0}
            end={value}
            duration={countUpDuration}
            delay={(numberAnimationDelayMs ?? countUpDelay * 1000) / 1000}
            suffix={countUpSuffix}
          />
        </span>
        <p className="text-sm text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}
