"use client";

import { MetricCard } from "@/components/health/metric-card";
import { METRICS } from "@/lib/health/metrics";
import { useHealthMetrics } from "@/hooks/health/use-health";

const NAMES = [METRICS.apple_sleeping_wrist_temperature.name] as const;

export default function VitalsTemperaturePage() {
  const { data, isFetching } = useHealthMetrics(NAMES);
  const samples = data ?? [];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <h2 className="text-lg font-medium tracking-tight">Temperature</h2>
        {isFetching && samples.length === 0 ? (
          <span className="text-xs text-muted-foreground">Loading…</span>
        ) : null}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <MetricCard
          meta={METRICS.apple_sleeping_wrist_temperature}
          samples={samples.filter(
            (s) => s.name === METRICS.apple_sleeping_wrist_temperature.name
          )}
        />
      </div>
      <p className="text-xs text-muted-foreground">
        Wrist temperature is measured by Apple Watch during sleep, shown as a
        deviation from your baseline.
      </p>
    </div>
  );
}
