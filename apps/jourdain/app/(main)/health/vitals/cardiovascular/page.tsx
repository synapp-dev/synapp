"use client";

import { MetricCard, RangeMetricCard } from "@/components/health/metric-card";
import { METRICS } from "@/lib/health/metrics";
import { useHealthMetrics } from "@/hooks/health/use-health";

const NAMES = [
  METRICS.heart_rate.name,
  METRICS.resting_heart_rate.name,
  METRICS.walking_heart_rate_average.name,
  METRICS.heart_rate_variability.name,
] as const;

export default function VitalsCardiovascularPage() {
  const { data, isFetching } = useHealthMetrics(NAMES);
  const samples = data ?? [];
  const of = (name: string) => samples.filter((s) => s.name === name);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <h2 className="text-lg font-medium tracking-tight">Cardiovascular</h2>
        {isFetching && samples.length === 0 ? (
          <span className="text-xs text-muted-foreground">Loading…</span>
        ) : null}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <RangeMetricCard
          meta={METRICS.heart_rate}
          samples={of(METRICS.heart_rate.name)}
        />
        <MetricCard
          meta={METRICS.resting_heart_rate}
          samples={of(METRICS.resting_heart_rate.name)}
        />
        <MetricCard
          meta={METRICS.heart_rate_variability}
          samples={of(METRICS.heart_rate_variability.name)}
        />
        <MetricCard
          meta={METRICS.walking_heart_rate_average}
          samples={of(METRICS.walking_heart_rate_average.name)}
        />
      </div>
    </div>
  );
}
