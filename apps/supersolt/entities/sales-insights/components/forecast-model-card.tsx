"use client";

import { useState } from "react";
import { BrainCircuit, Loader2, RefreshCcw } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { forecastApi } from "@/entities/forecast/api/endpoints";
import type { VenueForecastStateDto } from "@/entities/forecast/model/types";

/** History thresholds mirrored from server/forecast (confidence + trend blend). */
const TREND_MIN_HISTORY_DAYS = 28;
const HIGH_CONFIDENCE_DAYS = 42;

function confidenceFromDays(days: number): string {
  if (days < 14) {
    return "Warming up";
  }
  if (days < TREND_MIN_HISTORY_DAYS) {
    return "Low";
  }
  if (days < HIGH_CONFIDENCE_DAYS) {
    return "Medium";
  }
  return "High";
}

function formatTimestamp(value: string | null): string {
  if (!value) {
    return "—";
  }
  return new Intl.DateTimeFormat("en-AU", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function SignalRow({
  label,
  value,
  active,
}: {
  label: string;
  value: string;
  active?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="flex items-center gap-1.5 font-medium">
        {active !== undefined ? (
          <span
            aria-hidden
            className={
              active
                ? "size-1.5 rounded-full bg-emerald-500"
                : "bg-muted-foreground/40 size-1.5 rounded-full"
            }
          />
        ) : null}
        {value}
      </span>
    </div>
  );
}

export type ForecastModelCardProps = {
  organisation: string;
  venue: string;
  state: VenueForecastStateDto | null;
  /** Whether any weather rows came back for the venue (signal is wired up). */
  weatherActive: boolean;
  onRecomputed?: () => void;
};

/** What the model is working with right now, plus a manual recompute. */
export function ForecastModelCard({
  organisation,
  venue,
  state,
  weatherActive,
  onRecomputed,
}: ForecastModelCardProps) {
  const [recomputing, setRecomputing] = useState(false);
  const historyDays = state?.availableHistoryDays ?? 0;

  async function handleRecompute() {
    setRecomputing(true);
    try {
      const result = await forecastApi.post.recompute({
        organisationSlug: organisation,
        venueSlug: venue,
      });
      toast.success(
        `Recomputed ${result.forecastCount} forecasts from ${result.availableHistoryDays} days of history`,
      );
      onRecomputed?.();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not recompute forecasts",
      );
    } finally {
      setRecomputing(false);
    }
  }

  return (
    <Card className="gap-0 py-0">
      <CardHeader className="flex flex-wrap items-start justify-between gap-2 border-b px-5 py-4 [.border-b]:pb-4">
        <div className="space-y-1">
          <CardTitle className="flex items-center gap-2 text-base">
            <BrainCircuit className="text-muted-foreground h-4 w-4" />
            Model status
          </CardTitle>
          <CardDescription className="text-xs leading-relaxed">
            The forecast blends your same-weekday history with a trend tracker,
            then adjusts for weather, public holidays and your venue calendar.
          </CardDescription>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={handleRecompute}
          disabled={recomputing}
        >
          {recomputing ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <RefreshCcw className="h-3.5 w-3.5" />
          )}
          Recompute
        </Button>
      </CardHeader>

      <CardContent className="space-y-2.5 px-5 py-4">
        <SignalRow
          label="Sales history"
          value={`${historyDays} day${historyDays === 1 ? "" : "s"}`}
        />
        <div className="flex items-center justify-between gap-2 text-sm">
          <span className="text-muted-foreground">Confidence</span>
          <Badge variant="outline" className="px-2 py-0 text-xs font-normal">
            {confidenceFromDays(historyDays)}
          </Badge>
        </div>
        <SignalRow
          label="Weather signal"
          value={weatherActive ? "On" : "Off"}
          active={weatherActive}
        />
        <SignalRow
          label="Trend tracking"
          value={
            historyDays >= TREND_MIN_HISTORY_DAYS
              ? "Active"
              : `From ${TREND_MIN_HISTORY_DAYS} days`
          }
          active={historyDays >= TREND_MIN_HISTORY_DAYS}
        />
        <SignalRow
          label="Last computed"
          value={formatTimestamp(state?.lastComputedAt ?? null)}
        />
        <SignalRow
          label="Last sales sync"
          value={formatTimestamp(state?.lastDailySalesSyncAt ?? null)}
        />
      </CardContent>
    </Card>
  );
}
