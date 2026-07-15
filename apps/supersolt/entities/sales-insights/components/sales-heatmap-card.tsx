"use client";

import * as React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { formatCurrency } from "@/entities/sales-insights/lib/sales-format";
import type { SalesHeatmapPayload } from "@/entities/sales-insights/model/intelligence-types";

type SalesHeatmapCardProps = {
  heatmap: SalesHeatmapPayload | null;
};

/** Display rows Monday-first; cells arrive with Postgres dow (0 = Sunday). */
const ROW_DOWS = [1, 2, 3, 4, 5, 6, 0] as const;
const DOW_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
const DOW_LONG = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

function hourLabel(hour: number): string {
  const normalized = ((hour % 24) + 24) % 24;
  const suffix = normalized < 12 ? "am" : "pm";
  const display = normalized % 12 === 0 ? 12 : normalized % 12;
  return `${display}${suffix}`;
}

/**
 * Weekday x hour revenue fingerprint for the period. Intensity is revenue per
 * cell; the callouts name the money hour and the dead zone.
 */
export function SalesHeatmapCard({ heatmap }: SalesHeatmapCardProps) {
  const grid = React.useMemo(() => {
    const cells = heatmap?.cells ?? [];
    if (cells.length === 0) {
      return null;
    }
    const hours = cells.map((cell) => cell.hour);
    const minHour = Math.min(...hours);
    const maxHour = Math.max(...hours);
    const hourSpan = Array.from(
      { length: maxHour - minHour + 1 },
      (_, index) => minHour + index,
    );
    const byKey = new Map(
      cells.map((cell) => [`${cell.dow}-${cell.hour}`, cell]),
    );
    const maxNet = Math.max(...cells.map((cell) => cell.netCents), 1);
    return { hourSpan, byKey, maxNet };
  }, [heatmap]);

  return (
    <Card className="gap-0 py-0">
      <CardHeader className="border-b px-5 py-4 [.border-b]:pb-4">
        <CardTitle className="text-base">Trading rhythm</CardTitle>
        <CardDescription className="text-xs leading-relaxed">
          Revenue by weekday and hour for the selected period. Darker means
          more money through the till.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-3 px-5 py-4">
        {grid === null || !heatmap ? (
          <div className="text-muted-foreground flex h-40 items-center justify-center text-center text-xs">
            No transactions in this period yet.
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <div
                className="grid min-w-[420px] gap-px"
                style={{
                  gridTemplateColumns: `34px repeat(${grid.hourSpan.length}, minmax(14px, 1fr))`,
                }}
              >
                {ROW_DOWS.map((dow) => (
                  <React.Fragment key={dow}>
                    <div className="text-muted-foreground flex items-center pr-1 text-[10px] font-medium">
                      {DOW_SHORT[dow]}
                    </div>
                    {grid.hourSpan.map((hour) => {
                      const cell = grid.byKey.get(`${dow}-${hour}`);
                      const intensity = cell
                        ? Math.max(0.08, cell.netCents / grid.maxNet)
                        : 0;
                      const isPeak =
                        heatmap.peak &&
                        cell &&
                        heatmap.peak.dow === dow &&
                        heatmap.peak.hour === hour;
                      return (
                        <div
                          key={hour}
                          title={
                            cell
                              ? `${DOW_LONG[dow]} ${hourLabel(hour)}: ${formatCurrency(cell.netCents)} · ${cell.orders} orders`
                              : `${DOW_LONG[dow]} ${hourLabel(hour)}: no sales`
                          }
                          className="aspect-square min-h-[14px] rounded-[3px]"
                          style={{
                            backgroundColor: cell
                              ? `color-mix(in oklab, var(--color-emerald-500) ${Math.round(intensity * 92)}%, transparent)`
                              : "color-mix(in oklab, var(--color-muted-foreground) 8%, transparent)",
                            outline: isPeak
                              ? "2px solid var(--color-emerald-600)"
                              : undefined,
                            outlineOffset: isPeak ? "1px" : undefined,
                          }}
                        />
                      );
                    })}
                  </React.Fragment>
                ))}
                <div />
                {grid.hourSpan.map((hour, index) => (
                  <div
                    key={hour}
                    className="text-muted-foreground pt-0.5 text-center text-[9px]"
                  >
                    {index % 3 === 0 ? hourLabel(hour) : ""}
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-1 text-xs leading-relaxed">
              {heatmap.peak && heatmap.peakShare !== null ? (
                <p>
                  <span className="font-medium">
                    {DOW_LONG[heatmap.peak.dow]}{" "}
                    {hourLabel(heatmap.peak.hour)} to{" "}
                    {hourLabel(heatmap.peak.hour + 1)}
                  </span>{" "}
                  is your money hour:{" "}
                  <span className="tabular-nums">
                    {formatCurrency(heatmap.peak.netCents)}
                  </span>{" "}
                  ({Math.round(heatmap.peakShare * 100)}% of the period).
                </p>
              ) : null}
              {heatmap.quietest ? (
                <p className="text-muted-foreground">
                  Quietest recurring slot: {DOW_LONG[heatmap.quietest.dow]}{" "}
                  {hourLabel(heatmap.quietest.hour)}, averaging{" "}
                  <span className="tabular-nums">
                    {formatCurrency(
                      Math.round(
                        heatmap.quietest.netCents / heatmap.quietest.days,
                      ),
                    )}
                  </span>{" "}
                  a day. A window for prep, breaks or a happy-hour push.
                </p>
              ) : null}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
