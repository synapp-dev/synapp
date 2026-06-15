"use client";

import Link from "next/link";
import { Activity, Dumbbell, Moon } from "lucide-react";
import { Card, CardContent } from "@workspace/ui/components/card";
import { HealthImportCard } from "@/components/health/health-import-card";
import { METRICS, formatMetric } from "@/lib/health/metrics";
import { useHealthMetrics, useSleepNights } from "@/hooks/health/use-health";

const HEADLINE_NAMES = [
  METRICS.step_count.name,
  METRICS.resting_heart_rate.name,
] as const;

function latest(samples: { qty: number | null }[]): number | null {
  for (let i = samples.length - 1; i >= 0; i--) {
    const qty = samples[i]?.qty;
    if (qty != null) return qty;
  }
  return null;
}

function formatHours(hours: number | null | undefined): string {
  if (hours == null) return "—";
  const total = Math.round(hours * 60);
  const h = Math.floor(total / 60);
  const m = total % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function ModuleTile({
  href,
  icon: Icon,
  title,
  value,
  caption,
}: {
  href: string;
  icon: typeof Activity;
  title: string;
  value: string;
  caption: string;
}) {
  return (
    <Link href={href}>
      <Card className="h-full transition-colors hover:border-border">
        <CardContent className="space-y-2 p-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
              <Icon className="h-4 w-4 text-primary" />
            </div>
            <p className="text-sm font-medium">{title}</p>
          </div>
          <p className="text-2xl font-semibold tracking-tight tabular-nums">
            {value}
          </p>
          <p className="text-xs text-muted-foreground">{caption}</p>
        </CardContent>
      </Card>
    </Link>
  );
}

export default function HealthPage() {
  const { data: metrics } = useHealthMetrics(HEADLINE_NAMES);
  const { data: nights } = useSleepNights();
  const samples = metrics ?? [];
  const of = (name: string) => samples.filter((s) => s.name === name);

  const lastNight = (nights ?? []).at(-1) ?? null;
  const steps = latest(of(METRICS.step_count.name));
  const restingHr = latest(of(METRICS.resting_heart_rate.name));

  return (
    <section className="mx-auto w-full max-w-4xl space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">Health</h1>

      <p className="text-sm text-muted-foreground">
        Import your Apple Health data from the iOS{" "}
        <span className="font-medium">Health Auto Export</span> app, then explore
        it across Sleep, Vitals, and Fitness.
      </p>

      <HealthImportCard />

      <div className="grid gap-3 sm:grid-cols-3">
        <ModuleTile
          href="/health/sleep"
          icon={Moon}
          title="Sleep"
          value={formatHours(lastNight?.totalSleep)}
          caption="Last night"
        />
        <ModuleTile
          href="/health/vitals/cardiovascular"
          icon={Activity}
          title="Vitals"
          value={formatMetric(restingHr, METRICS.resting_heart_rate)}
          caption="Resting heart rate"
        />
        <ModuleTile
          href="/health/fitness"
          icon={Dumbbell}
          title="Fitness"
          value={formatMetric(steps, METRICS.step_count)}
          caption="Latest steps"
        />
      </div>
    </section>
  );
}
