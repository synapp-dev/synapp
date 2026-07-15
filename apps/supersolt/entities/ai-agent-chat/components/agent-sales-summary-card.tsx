"use client";

import { FileDown } from "lucide-react";

import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import type { getSalesSummarySuccessSchema } from "@/entities/ai-agent-chat/lib/sales-summary-tool-schema";
import type { z } from "zod";

const TOP_ITEMS_SHOWN = 5;

function formatCents(cents: number): string {
  return `$${(cents / 100).toLocaleString("en-AU", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatRangeLabel(from: string, to: string): string {
  if (from === to) return from;
  return `${from} → ${to}`;
}

type AgentSalesSummaryCardProps = {
  payload: z.infer<typeof getSalesSummarySuccessSchema>;
};

export function AgentSalesSummaryCard({ payload }: AgentSalesSummaryCardProps) {
  const { summary, reportUrl } = payload;
  const topItems = summary.topItems.slice(0, TOP_ITEMS_SHOWN);
  const remainingItems = summary.totalMixItems - topItems.length;

  return (
    <Card className="border-primary/25 bg-muted/20 w-full gap-3 py-4">
      <CardHeader className="gap-1 px-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <CardTitle className="text-sm leading-tight">
              Sales summary
              {summary.dataSource === "demo" ? (
                <Badge
                  variant="outline"
                  className="text-muted-foreground ml-2 text-[10px] font-normal"
                >
                  Demo data
                </Badge>
              ) : null}
            </CardTitle>
            <p className="text-muted-foreground mt-0.5 text-xs leading-snug">
              {summary.venueName}
              <span className="px-1" aria-hidden>
                ·
              </span>
              {formatRangeLabel(summary.from, summary.to)}
            </p>
          </div>
          <Button asChild size="sm" variant="outline" className="h-7 gap-1.5 text-xs">
            <a href={reportUrl} download>
              <FileDown className="size-3.5" aria-hidden />
              PDF
            </a>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 px-4">
        <dl className="grid grid-cols-3 gap-2">
          <div>
            <dt className="text-muted-foreground text-[11px]">Revenue</dt>
            <dd className="text-sm font-semibold tabular-nums">
              {formatCents(summary.totals.revenueCents)}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground text-[11px]">Orders</dt>
            <dd className="text-sm font-semibold tabular-nums">
              {summary.totals.orders.toLocaleString("en-AU")}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground text-[11px]">Avg check</dt>
            <dd className="text-sm font-semibold tabular-nums">
              {formatCents(summary.totals.avgCheckCents)}
            </dd>
          </div>
        </dl>
        {topItems.length > 0 ? (
          <div className="space-y-1">
            {topItems.map((item) => (
              <div
                key={`${item.label}-${item.revenueCents}`}
                className="flex items-center gap-2 text-xs"
              >
                <span className="min-w-0 flex-1 truncate">{item.label}</span>
                <span className="text-muted-foreground shrink-0 tabular-nums">
                  {item.revenueSharePct.toFixed(1)}%
                </span>
                <span className="w-20 shrink-0 text-right font-medium tabular-nums">
                  {formatCents(item.revenueCents)}
                </span>
              </div>
            ))}
            {remainingItems > 0 ? (
              <p className="text-muted-foreground text-[11px]">
                + {remainingItems} more item{remainingItems === 1 ? "" : "s"} in
                the PDF report.
              </p>
            ) : null}
          </div>
        ) : (
          <p className="text-muted-foreground text-xs">
            No item-level sales in this period.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
