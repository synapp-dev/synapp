"use client";

import { MetricCard } from "@/components/health/metric-card";
import { METRICS } from "@/lib/health/metrics";
import { useHealthMetrics } from "@/hooks/health/use-health";

const NAMES = [
  METRICS.respiratory_rate.name,
  METRICS.blood_oxygen_saturation.name,
  METRICS.breathing_disturbances.name,
] as const;

export default function VitalsRespiratoryPage() {
  const { data, isFetching } = useHealthMetrics(NAMES);
  const samples = data ?? [];
  const of = (name: string) => samples.filter((s) => s.name === name);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <h2 className="text-lg font-medium tracking-tight">Respiratory</h2>
        {isFetching && samples.length === 0 ? (
          <span className="text-xs text-muted-foreground">Loading…</span>
        ) : null}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <MetricCard
          meta={METRICS.respiratory_rate}
          samples={of(METRICS.respiratory_rate.name)}
        />
        <MetricCard
          meta={METRICS.blood_oxygen_saturation}
          samples={of(METRICS.blood_oxygen_saturation.name)}
        />
        <MetricCard
          meta={METRICS.breathing_disturbances}
          samples={of(METRICS.breathing_disturbances.name)}
        />
      </div>
    </div>
  );
}
