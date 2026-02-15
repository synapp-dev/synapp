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

export type SchoolInfoCardProps = {
  icon: LucideIcon;
  title: string;
  value: number;
  description: React.ReactNode;
  countUpDuration?: number;
  countUpDelay?: number;
  countUpSuffix?: string;
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

  return (
    <Card className="h-full py-1 px-0 transition-all shadow hover:shadow-md hover:border-primary/50">
      <CardContent className="flex flex-col items-stretch gap-3 pt-4 pb-4 px-6 text-left">
        <p className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
          <Icon className="h-5 w-5 shrink-0" />
          {title}
        </p>
        <span className="text-6xl font-bold tabular-nums block text-right">
          <CountUp
            start={0}
            end={value}
            duration={countUpDuration}
            delay={countUpDelay}
            suffix={countUpSuffix}
          />
        </span>
        <p className="text-sm text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}
