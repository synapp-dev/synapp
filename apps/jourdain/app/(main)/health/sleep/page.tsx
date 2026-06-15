"use client";

import { useMemo } from "react";
import { format, parseISO } from "date-fns";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { Card, CardContent } from "@workspace/ui/components/card";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@workspace/ui/components/chart";
import { useSleepNights, type SleepNight } from "@/hooks/health/use-health";

function shortDate(iso: string): string {
  try {
    return format(parseISO(iso), "d MMM");
  } catch {
    return iso;
  }
}

/** Hours (e.g. 7.07) -> "7h 4m". */
function formatHours(hours: number | null | undefined): string {
  if (hours == null) return "—";
  const total = Math.round(hours * 60);
  const h = Math.floor(total / 60);
  const m = total % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function clockTime(iso: string | null): string {
  if (!iso) return "—";
  try {
    return format(parseISO(iso), "h:mm a");
  } catch {
    return "—";
  }
}

const config = {
  deep: { label: "Deep", color: "var(--chart-1)" },
  core: { label: "Core", color: "var(--chart-2)" },
  rem: { label: "REM", color: "var(--chart-3)" },
  awake: { label: "Awake", color: "var(--chart-4)" },
} satisfies ChartConfig;

function StageRow({
  label,
  hours,
  color,
}: {
  label: string;
  hours: number | null;
  color: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <span
        className="h-2.5 w-2.5 shrink-0 rounded-[2px]"
        style={{ backgroundColor: color }}
      />
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="ml-auto text-xs font-medium tabular-nums">
        {formatHours(hours)}
      </span>
    </div>
  );
}

function LatestNight({ night }: { night: SleepNight }) {
  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div className="flex items-baseline justify-between gap-2">
          <div>
            <p className="text-sm text-muted-foreground">Last night</p>
            <p className="text-3xl font-semibold tracking-tight tabular-nums">
              {formatHours(night.totalSleep)}
            </p>
          </div>
          <p className="text-right text-xs text-muted-foreground">
            {clockTime(night.sleepStart)} – {clockTime(night.sleepEnd)}
          </p>
        </div>
        <div className="space-y-1.5">
          <StageRow label="Deep" hours={night.deep} color="var(--chart-1)" />
          <StageRow label="Core" hours={night.core} color="var(--chart-2)" />
          <StageRow label="REM" hours={night.rem} color="var(--chart-3)" />
          <StageRow label="Awake" hours={night.awake} color="var(--chart-4)" />
        </div>
      </CardContent>
    </Card>
  );
}

export default function HealthSleepPage() {
  const { data, isFetching } = useSleepNights();
  const nights = useMemo(() => data ?? [], [data]);

  const chartData = useMemo(
    () =>
      nights.map((n) => ({
        date: n.date,
        deep: n.deep ?? 0,
        core: n.core ?? 0,
        rem: n.rem ?? 0,
        awake: n.awake ?? 0,
      })),
    [nights]
  );

  const avgSleep = useMemo(() => {
    const totals = nights
      .map((n) => n.totalSleep)
      .filter((t): t is number => t != null);
    if (totals.length === 0) return null;
    return totals.reduce((a, b) => a + b, 0) / totals.length;
  }, [nights]);

  const latest = nights.length ? nights[nights.length - 1] : null;

  return (
    <section className="mx-auto w-full max-w-4xl space-y-4">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Sleep</h1>
        {isFetching && nights.length === 0 ? (
          <span className="text-xs text-muted-foreground">Loading…</span>
        ) : null}
      </div>

      {nights.length === 0 && !isFetching ? (
        <p className="text-sm text-muted-foreground">
          No sleep data yet. Import a Health Auto Export file from the{" "}
          <a className="underline" href="/health">
            Health
          </a>{" "}
          page.
        </p>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        {latest ? <LatestNight night={latest} /> : null}
        <Card>
          <CardContent className="flex flex-col justify-center gap-1 p-4">
            <p className="text-sm text-muted-foreground">Average per night</p>
            <p className="text-3xl font-semibold tracking-tight tabular-nums">
              {formatHours(avgSleep)}
            </p>
            <p className="text-xs text-muted-foreground">
              Across {nights.length} night{nights.length === 1 ? "" : "s"}
            </p>
          </CardContent>
        </Card>
      </div>

      {chartData.length > 0 ? (
        <Card>
          <CardContent className="space-y-2 p-4">
            <p className="text-sm font-medium">Sleep stages</p>
            <ChartContainer config={config} className="aspect-[2/1] w-full">
              <BarChart data={chartData} margin={{ left: 4, right: 4, top: 4 }}>
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="date"
                  tickFormatter={shortDate}
                  tickLine={false}
                  axisLine={false}
                  minTickGap={32}
                />
                <YAxis
                  width={28}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `${v}h`}
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      labelFormatter={(v) => shortDate(String(v))}
                      formatter={(value, name) =>
                        `${config[name as keyof typeof config]?.label}: ${formatHours(Number(value))}`
                      }
                    />
                  }
                />
                <ChartLegend content={<ChartLegendContent />} />
                <Bar dataKey="deep" stackId="s" fill="var(--color-deep)" />
                <Bar dataKey="core" stackId="s" fill="var(--color-core)" />
                <Bar dataKey="rem" stackId="s" fill="var(--color-rem)" />
                <Bar
                  dataKey="awake"
                  stackId="s"
                  fill="var(--color-awake)"
                  radius={[2, 2, 0, 0]}
                />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      ) : null}
    </section>
  );
}
