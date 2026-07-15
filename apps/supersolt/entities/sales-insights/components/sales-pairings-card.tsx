"use client";

import { Link2, TrendingUp } from "lucide-react";
import { Badge } from "@workspace/ui/components/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { formatCurrency } from "@/entities/sales-insights/lib/sales-format";
import type { SalesPairingsPayload } from "@/entities/sales-insights/model/intelligence-types";

type SalesPairingsCardProps = {
  pairings: SalesPairingsPayload | null;
  scrollAreaClassName?: string;
  /** Lay the two sections side by side (full-width placement). */
  wide?: boolean;
};

/**
 * Basket affinity: which items travel together (lift over independence) and
 * which high-volume items leave without the sections everyone else buys.
 */
export function SalesPairingsCard({
  pairings,
  scrollAreaClassName,
  wide = false,
}: SalesPairingsCardProps) {
  const pairs = pairings?.pairs ?? [];
  const opportunities = pairings?.opportunities ?? [];

  return (
    <Card className="gap-0 py-0">
      <CardHeader className="border-b px-5 py-4 [.border-b]:pb-4">
        <CardTitle className="text-base">Menu pairings</CardTitle>
        <CardDescription className="text-xs leading-relaxed">
          {pairings
            ? `${Math.round(pairings.multiItemShare * 100)}% of orders carry more than one item. These are the combinations your customers already build, and the ones they skip.`
            : "Pairings appear once enough multi-item orders exist in the period."}
        </CardDescription>
      </CardHeader>

      <CardContent
        className={`overflow-y-auto px-5 py-4 ${
          wide ? "grid gap-6 lg:grid-cols-2" : "space-y-4"
        } ${scrollAreaClassName ?? ""}`}
      >
        <div>
          <p className="flex items-center gap-1.5 text-xs font-semibold">
            <Link2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            Better together
          </p>
          {pairs.length === 0 ? (
            <p className="text-muted-foreground mt-2 text-xs">
              No strong pairings in this period yet. Longer ranges surface
              more.
            </p>
          ) : (
            <ul className="mt-2 divide-y">
              {pairs.map((pair) => (
                <li
                  key={`${pair.aId}-${pair.bId}`}
                  className="flex items-center justify-between gap-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {pair.aLabel}
                      <span className="text-muted-foreground font-normal">
                        {" "}
                        + {pair.bLabel}
                      </span>
                    </p>
                    <p className="text-muted-foreground text-[11px] tabular-nums">
                      Together in {pair.pairCount} orders ·{" "}
                      {Math.round(pair.attachRate * 100)}% of {pair.aLabel}{" "}
                      orders
                    </p>
                  </div>
                  <Badge
                    variant="outline"
                    className="shrink-0 border-emerald-500/40 text-[11px] tabular-nums text-emerald-700 dark:text-emerald-300"
                  >
                    {pair.lift.toFixed(1)}x
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <p className="flex items-center gap-1.5 text-xs font-semibold">
            <TrendingUp className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
            Missed attach opportunities
          </p>
          {opportunities.length === 0 ? (
            <p className="text-muted-foreground mt-2 text-xs">
              No obvious attach gaps: your top sellers pull the rest of the
              menu along nicely.
            </p>
          ) : (
            <ul className="mt-2 space-y-2">
              {opportunities.map((opportunity) => (
                <li
                  key={`${opportunity.menuItemId}-${opportunity.sectionName}`}
                  className="rounded-lg border border-amber-500/25 bg-amber-50/40 p-3 dark:bg-amber-950/15"
                >
                  <p className="text-sm leading-relaxed">
                    Only{" "}
                    <span className="font-semibold tabular-nums">
                      {Math.round(opportunity.attachRate * 100)}%
                    </span>{" "}
                    of <span className="font-medium">{opportunity.itemLabel}</span>{" "}
                    orders add anything from {opportunity.sectionName} (venue
                    average {Math.round(opportunity.venueAttachRate * 100)}%).
                  </p>
                  <p className="text-muted-foreground mt-1 text-[11px]">
                    Closing half the gap is worth about{" "}
                    <span className="font-medium tabular-nums">
                      {formatCurrency(opportunity.estValueCents)}
                    </span>{" "}
                    over this period. Try a prompt at the register or a combo.
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
