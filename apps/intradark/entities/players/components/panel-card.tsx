"use client";

import type { ReactNode } from "react";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { cn } from "@workspace/ui/lib/utils";

interface PanelCardProps {
  title: string;
  icon?: ReactNode;
  /** Right-aligned header slot (e.g. live/pending badge). */
  action?: ReactNode;
  loading?: boolean;
  /** Degraded/unavailable message; renders instead of children when set. */
  unavailable?: string | null;
  className?: string;
  children?: ReactNode;
}

/** Shared shell for a single source panel: title, loading + degraded states. */
export function PanelCard({
  title,
  icon,
  action,
  loading,
  unavailable,
  className,
  children,
}: PanelCardProps) {
  return (
    <Card className={cn("h-full", className)}>
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          {icon}
          {title}
        </CardTitle>
        {action}
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-6 w-2/3" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-4 w-1/3" />
          </div>
        ) : unavailable ? (
          <p className="text-sm text-muted-foreground">{unavailable}</p>
        ) : (
          children
        )}
      </CardContent>
    </Card>
  );
}

interface StatProps {
  label: string;
  value: ReactNode;
}

/** Compact label/value stat row used inside panels. */
export function Stat({ label, value }: StatProps) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1">
      <span className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <span className="text-sm font-semibold tabular-nums">{value}</span>
    </div>
  );
}
