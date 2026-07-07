"use client";

import { Skeleton } from "@workspace/ui/components/skeleton";
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
  const loading = isFetching && samples.length === 0;

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-medium tracking-tight">Cardiovascular</h2>
      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="space-y-3 rounded-xl border p-4">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-7 w-20" />
              <Skeleton className="aspect-[3/1] w-full" />
            </div>
          ))}
        </div>
      ) : (
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
      )}
    </div>
  );
}
