"use client";

import type { ReactNode } from "react";
import { InsightsPeriodControls } from "@/entities/insights/components/insights-period-controls";

type SalesTabPageHeaderProps = {
  title: string;
  description?: string;
  actions?: ReactNode;
};

/** Slim header for non-overview sales tabs: title left, period picker right. */
export function SalesTabPageHeader({
  title,
  description,
  actions,
}: SalesTabPageHeaderProps) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
        {description ? (
          <p className="text-muted-foreground text-xs leading-relaxed">
            {description}
          </p>
        ) : null}
      </div>
      <div className="flex items-center gap-2">
        {actions}
        <InsightsPeriodControls />
      </div>
    </div>
  );
}
