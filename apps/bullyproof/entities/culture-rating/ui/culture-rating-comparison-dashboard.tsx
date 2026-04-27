"use client";

import { useId, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import { cn } from "@workspace/ui/lib/utils";
import type {
  CultureImprovement,
  CultureRatingInputMetrics,
  SchoolCultureDetailResponse,
} from "@/entities/culture-rating/api/culture-ratings-admin-api";
import {
  cultureRatingGaugeScore,
  deriveCultureRatingMetrics,
  pctChangeDisplay,
} from "@/lib/culture-rating-math";

function minorPerStudentDay(m: CultureRatingInputMetrics): number | null {
  const att = m.attendanceFteStudentDays;
  if (att <= 0) return null;
  return m.minorBehaviourIncidents / att;
}

function majorPerStudentDay(m: CultureRatingInputMetrics): number | null {
  const att = m.attendanceFteStudentDays;
  if (att <= 0) return null;
  return m.majorBehaviourIncidents / att;
}

function shortSuspPerDay(m: CultureRatingInputMetrics): number | null {
  const att = m.attendanceFteStudentDays;
  if (att <= 0) return null;
  return m.shortSuspensionsCount / att;
}

function longSuspPerDay(m: CultureRatingInputMetrics): number | null {
  const att = m.attendanceFteStudentDays;
  if (att <= 0) return null;
  return m.longSuspensionsCount / att;
}

function exclusionsPerDay(m: CultureRatingInputMetrics): number | null {
  const att = m.attendanceFteStudentDays;
  if (att <= 0) return null;
  return m.exclusionsCount / att;
}

function formatPct(rate: number | null): string {
  if (rate == null) return "—";
  return `${(rate * 100).toFixed(1)}%`;
}

function formatRate(rate: number | null, decimals = 3): string {
  if (rate == null) return "—";
  return rate.toFixed(decimals);
}

function ChangeCell({
  pct,
  lowerIsBetter,
}: {
  pct: number | null;
  lowerIsBetter: boolean;
}) {
  if (pct == null) {
    return (
      <span className="text-muted-foreground flex items-center gap-1">
        <Minus className="h-4 w-4" /> —
      </span>
    );
  }
  const good =
    lowerIsBetter ? pct > 0 : pct > 0;
  const bad =
    lowerIsBetter ? pct < 0 : pct < 0;
  const Icon = pct >= 0 ? ArrowUp : ArrowDown;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 font-medium",
        good && "text-emerald-600 dark:text-emerald-400",
        bad && "text-red-600 dark:text-red-400",
        !good && !bad && "text-muted-foreground"
      )}
    >
      <Icon className="h-4 w-4" aria-hidden />
      {Math.abs(pct).toFixed(1)}%
    </span>
  );
}

function SemiCircleGauge({
  value,
  label,
  gradientId,
}: {
  value: number;
  label: string;
  gradientId: string;
}) {
  const clamped = Math.min(100, Math.max(0, value));
  const cx = 100;
  const cy = 100;
  const r = 70;
  const angleRad = Math.PI * (1 - clamped / 100);
  const x = cx + r * Math.cos(angleRad);
  const y = cy - r * Math.sin(angleRad);

  return (
    <div className="flex flex-col items-center shrink-0">
      <svg
        width="200"
        height="120"
        viewBox="0 0 200 120"
        className="text-foreground"
        aria-hidden
      >
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ef4444" />
            <stop offset="50%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#22c55e" />
          </linearGradient>
        </defs>
        <path
          d="M 30 100 A 70 70 0 0 1 170 100"
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth="14"
          strokeLinecap="round"
        />
        <line
          x1={cx}
          y1={cy}
          x2={x}
          y2={y}
          stroke="currentColor"
          strokeWidth="3"
          className="text-foreground"
        />
        <circle cx={cx} cy={cy} r="5" className="fill-foreground" />
      </svg>
      <div className="-mt-2 text-center">
        <p className="text-3xl font-bold tabular-nums text-[color:var(--brand-bullyproof-primary,#0d9488)]">
          {Math.round(clamped)}
        </p>
        <p className="text-sm text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

function formatDeltaHeadline(improvement: CultureImprovement | null): string {
  const p = improvement?.cultureRatingPercent;
  if (p == null) return "— vs benchmark";
  const sign = p >= 0 ? "+" : "";
  return `${sign}${p.toFixed(1)} vs benchmark`;
}

function impactSummaryText(improvement: CultureImprovement | null): string {
  if (!improvement) {
    return "Add a comparative period in Settings to see an impact summary.";
  }
  const parts: { label: string; pct: number }[] = [];
  if (improvement.behaviourIncidentsRateChangePercent != null) {
    parts.push({
      label: "behaviour incidents",
      pct: improvement.behaviourIncidentsRateChangePercent,
    });
  }
  if (improvement.suspensionsRateChangePercent != null) {
    parts.push({
      label: "suspensions",
      pct: improvement.suspensionsRateChangePercent,
    });
  }
  if (improvement.attendanceRateChangePercent != null) {
    parts.push({
      label: "attendance",
      pct: improvement.attendanceRateChangePercent,
    });
  }
  parts.sort((a, b) => Math.abs(b.pct) - Math.abs(a.pct));
  const head = improvement.cultureRatingPercent;
  const headStr =
    head == null
      ? "Culture metrics"
      : `Culture moved by ${head >= 0 ? "+" : ""}${head.toFixed(1)} points vs benchmark`;
  if (parts.length === 0) return `${headStr}.`;
  const top = parts[0];
  const second = parts[1];
  const a = `${Math.abs(top.pct).toFixed(1)}% ${top.pct >= 0 ? "improvement" : "change"} in ${top.label}`;
  const b = second
    ? ` and ${Math.abs(second.pct).toFixed(1)}% in ${second.label}`
    : "";
  return `${headStr}, driven by a ${a}${b}.`;
}

export function CultureRatingComparisonDashboard({
  detail,
  loading,
  error,
  settingsCulturePath,
}: {
  detail: SchoolCultureDetailResponse | null;
  loading: boolean;
  error: string | null;
  settingsCulturePath: string;
}) {
  const gaugeGradientId = useId();
  const comparatives = detail?.comparatives ?? [];
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selected = useMemo(() => {
    if (!comparatives.length) return null;
    if (selectedId) {
      const found = comparatives.find((c) => c.id === selectedId);
      if (found) return found;
    }
    return comparatives[comparatives.length - 1];
  }, [comparatives, selectedId]);

  const bench = detail?.benchmark ?? null;

  if (loading) {
    return (
      <p className="text-sm text-muted-foreground py-8 text-center">
        Loading culture rating…
      </p>
    );
  }

  if (error) {
    return <p className="text-sm text-destructive">{error}</p>;
  }

  if (!bench) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Culture rating comparison</CardTitle>
          <CardDescription>
            Benchmark data has not been set for your school yet. Once Bullyproof
            adds a benchmark, your comparisons will appear here.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" asChild>
            <Link href={settingsCulturePath}>Culture rating settings</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!selected) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Culture rating comparison</CardTitle>
          <CardDescription>
            No comparative period yet. Enter your comparative data to see results
            instantly after saving.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <Link href={settingsCulturePath}>Edit / update culture rating data</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const bM = bench.metrics;
  const cM = selected.metrics;
  const bDer = deriveCultureRatingMetrics(bM);
  const cDer = deriveCultureRatingMetrics(cM);
  const improvement = selected.improvement;

  const gaugeValue = cultureRatingGaugeScore({
    comparativeAttendanceRate: cDer.attendanceRate,
    improvementPercent: improvement?.cultureRatingPercent ?? null,
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col sm:flex-row gap-6 sm:items-start">
          <SemiCircleGauge
            value={gaugeValue}
            label="Culture rating"
            gradientId={gaugeGradientId}
          />
          <div className="space-y-2 min-w-0">
            <h2 className="text-2xl font-semibold text-[color:var(--brand-bullyproof-primary,#0d9488)]">
              Culture rating comparison
            </h2>
            <p className="text-sm text-muted-foreground">
              Monthly trend (benchmark vs comparative school days and attendance)
            </p>
            <p className="text-sm">
              <span className="font-medium text-foreground">Benchmark period:</span>{" "}
              {bench.periodStart} to {bench.periodEnd}
            </p>
            <p className="text-sm">
              <span className="font-medium text-foreground">Comparative period:</span>{" "}
              {selected.periodStart} to {selected.periodEnd}
            </p>
            <div className="flex flex-wrap gap-3 text-xs text-muted-foreground pt-1">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-red-500" /> Fair
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-amber-500" /> Good
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-500" /> Excellent
              </span>
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-2 sm:items-end shrink-0">
          {comparatives.length > 1 ? (
            <Select
              value={selected.id}
              onValueChange={(v) => setSelectedId(v)}
            >
              <SelectTrigger className="w-[min(100%,280px)]">
                <SelectValue placeholder="Comparative period" />
              </SelectTrigger>
              <SelectContent>
                {comparatives.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.periodStart} → {c.periodEnd}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : null}
          <Button asChild>
            <Link href={settingsCulturePath}>Edit / update culture rating data</Link>
          </Button>
        </div>
      </div>

      <Card className="border-[color:var(--brand-bullyproof-primary,#0d9488)]/25 bg-[color:var(--brand-bullyproof-primary,#0d9488)]/[0.04]">
        <CardHeader className="pb-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="text-lg">Culture rating comparison</CardTitle>
            {improvement?.cultureRatingPercent != null ? (
              <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/15 px-2 py-1 text-sm font-medium text-emerald-700 dark:text-emerald-400">
                {improvement.cultureRatingPercent >= 0 ? "+" : ""}
                {improvement.cultureRatingPercent.toFixed(1)} vs benchmark
              </span>
            ) : null}
          </div>
          <CardDescription>
            Benchmark {bench.periodStart}–{bench.periodEnd} vs comparative{" "}
            {selected.periodStart}–{selected.periodEnd}
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[200px]">Metric</TableHead>
                <TableHead>Benchmark</TableHead>
                <TableHead>Comparative</TableHead>
                <TableHead>Change (%)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="font-medium">
                  Minor behaviour incidents <span className="text-muted-foreground">(per student day)</span>
                </TableCell>
                <TableCell className="font-mono text-sm">
                  {formatRate(minorPerStudentDay(bM))}
                </TableCell>
                <TableCell className="font-mono text-sm">
                  {formatRate(minorPerStudentDay(cM))}
                </TableCell>
                <TableCell>
                  <ChangeCell
                    pct={pctChangeDisplay(
                      minorPerStudentDay(bM),
                      minorPerStudentDay(cM),
                      true
                    )}
                    lowerIsBetter
                  />
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">
                  Major behaviour incidents <span className="text-muted-foreground">(per student day)</span>
                </TableCell>
                <TableCell className="font-mono text-sm">
                  {formatRate(majorPerStudentDay(bM))}
                </TableCell>
                <TableCell className="font-mono text-sm">
                  {formatRate(majorPerStudentDay(cM))}
                </TableCell>
                <TableCell>
                  <ChangeCell
                    pct={pctChangeDisplay(
                      majorPerStudentDay(bM),
                      majorPerStudentDay(cM),
                      true
                    )}
                    lowerIsBetter
                  />
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">
                  Suspensions — short (1–10 days) <span className="text-muted-foreground">(per student day)</span>
                </TableCell>
                <TableCell className="font-mono text-sm">
                  {formatRate(shortSuspPerDay(bM))}
                </TableCell>
                <TableCell className="font-mono text-sm">
                  {formatRate(shortSuspPerDay(cM))}
                </TableCell>
                <TableCell>
                  <ChangeCell
                    pct={pctChangeDisplay(
                      shortSuspPerDay(bM),
                      shortSuspPerDay(cM),
                      true
                    )}
                    lowerIsBetter
                  />
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">
                  Suspensions — long (11–20 days) <span className="text-muted-foreground">(per student day)</span>
                </TableCell>
                <TableCell className="font-mono text-sm">
                  {formatRate(longSuspPerDay(bM))}
                </TableCell>
                <TableCell className="font-mono text-sm">
                  {formatRate(longSuspPerDay(cM))}
                </TableCell>
                <TableCell>
                  <ChangeCell
                    pct={pctChangeDisplay(
                      longSuspPerDay(bM),
                      longSuspPerDay(cM),
                      true
                    )}
                    lowerIsBetter
                  />
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">
                  Exclusions <span className="text-muted-foreground">(per student day)</span>
                </TableCell>
                <TableCell className="font-mono text-sm">
                  {formatRate(exclusionsPerDay(bM))}
                </TableCell>
                <TableCell className="font-mono text-sm">
                  {formatRate(exclusionsPerDay(cM))}
                </TableCell>
                <TableCell>
                  <ChangeCell
                    pct={pctChangeDisplay(
                      exclusionsPerDay(bM),
                      exclusionsPerDay(cM),
                      true
                    )}
                    lowerIsBetter
                  />
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Attendance rate</TableCell>
                <TableCell className="font-mono text-sm">
                  {formatPct(bDer.attendanceRate)}
                </TableCell>
                <TableCell className="font-mono text-sm">
                  {formatPct(cDer.attendanceRate)}
                </TableCell>
                <TableCell>
                  <ChangeCell
                    pct={pctChangeDisplay(
                      bDer.attendanceRate,
                      cDer.attendanceRate,
                      false
                    )}
                    lowerIsBetter={false}
                  />
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
          <p className="mt-3 text-xs text-muted-foreground">
            Per incident per student per school day where rates are shown; attendance
            is share of possible student days present.
          </p>
        </CardContent>
      </Card>

      <div className="rounded-lg border bg-muted/40 px-4 py-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
          Impact summary
        </p>
        <p className="text-sm text-foreground leading-relaxed">
          {impactSummaryText(improvement)}
        </p>
      </div>

      <p className="text-xs text-muted-foreground text-center sm:text-left">
        Gauge score is an interim display blend (attendance level vs improvement);{" "}
        headline delta uses the weighted model ({formatDeltaHeadline(improvement)}).
        Refine with client when the official Woodford mapping is finalised.
      </p>
    </div>
  );
}
