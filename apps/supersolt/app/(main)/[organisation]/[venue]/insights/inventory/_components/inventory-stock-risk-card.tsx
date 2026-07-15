"use client";

import Link from "next/link";
import { ArrowRight, PackageSearch } from "lucide-react";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import { cn } from "@workspace/ui/lib/utils";
import type { DashboardStockRiskItem } from "@/server/dashboard/dashboard-digest.service";

const RISK_THRESHOLD_DAYS = 3;

function formatQty(value: number): string {
  return Number(value.toFixed(value >= 10 ? 0 : 1)).toLocaleString("en-AU");
}

function coverTone(days: number): { bar: string; text: string } {
  if (days < 1.5) {
    return { bar: "bg-rose-500", text: "text-rose-600 dark:text-rose-400" };
  }
  return { bar: "bg-amber-500", text: "text-amber-600 dark:text-amber-400" };
}

export type InventoryStockRiskCardProps = {
  atRisk: DashboardStockRiskItem[];
  /** null = no approved stock count anchoring stock-on-hand yet. */
  trackedIngredients: number | null;
  orderGuideHref: string;
  isLoading?: boolean;
};

export function InventoryStockRiskCard({
  atRisk,
  trackedIngredients,
  orderGuideHref,
  isLoading,
}: InventoryStockRiskCardProps) {
  return (
    <Card className="flex h-full flex-col gap-0 py-0 shadow-sm transition-shadow duration-300 hover:shadow-lg">
      <CardHeader className="gap-1.5 px-5 pt-5 pb-3 md:px-6">
        <CardTitle className="flex items-center gap-2 text-base">
          <span className="flex size-7 items-center justify-center rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400">
            <PackageSearch className="size-3.5" aria-hidden />
          </span>
          Running low
          {atRisk.length > 0 ? (
            <Badge variant="destructive" className="rounded-full">
              {atRisk.length}
            </Badge>
          ) : null}
          <Button
            variant="ghost"
            size="sm"
            className="ml-auto h-7 gap-1 text-xs"
            asChild
          >
            <Link href={orderGuideHref}>
              Order guide
              <ArrowRight className="size-3.5" aria-hidden />
            </Link>
          </Button>
        </CardTitle>
        <CardDescription>
          Stock on hand vs daily use, from the consumption engine
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1 px-0 pb-0">
        {isLoading ? (
          <div className="text-muted-foreground flex h-full items-center justify-center py-10 text-xs">
            Loading stock on hand…
          </div>
        ) : trackedIngredients === null || atRisk.length === 0 ? (
          <div className="text-muted-foreground flex h-full items-center justify-center px-6 py-10 text-center text-xs leading-relaxed">
            {trackedIngredients === null
              ? "Once a stock count anchors stock-on-hand, at-risk ingredients line up here with exact cover."
              : "Nothing is running low right now. The order guide still knows your cadence when you're ready."}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-5 md:pl-6">Ingredient</TableHead>
                <TableHead className="text-right">On hand</TableHead>
                <TableHead className="hidden text-right sm:table-cell">
                  Daily use
                </TableHead>
                <TableHead className="w-[34%] pr-5 md:pr-6">Cover</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {atRisk.map((item, index) => {
                const tone = coverTone(item.daysOfCover);
                const pct = Math.min(
                  100,
                  (item.daysOfCover / RISK_THRESHOLD_DAYS) * 100,
                );
                return (
                  <TableRow
                    key={item.ingredientId}
                    className="opacity-0 animate-slide-up-fade-in-slow"
                    style={{ animationDelay: `${150 + index * 60}ms` }}
                  >
                    <TableCell className="pl-5 font-medium md:pl-6">
                      {item.name}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-right text-sm tabular-nums whitespace-nowrap">
                      {formatQty(item.stockOnHand)} {item.unit}
                    </TableCell>
                    <TableCell className="text-muted-foreground hidden text-right text-sm tabular-nums whitespace-nowrap sm:table-cell">
                      {formatQty(item.avgDailyUse)} {item.unit}
                    </TableCell>
                    <TableCell className="pr-5 md:pr-6">
                      <div className="flex items-center gap-2.5">
                        <div className="bg-muted h-1.5 min-w-0 flex-1 overflow-hidden rounded-full">
                          <div
                            className={cn("h-full rounded-full", tone.bar)}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span
                          className={cn(
                            "shrink-0 text-xs font-semibold tabular-nums",
                            tone.text,
                          )}
                        >
                          {item.daysOfCover.toFixed(1)}d
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
