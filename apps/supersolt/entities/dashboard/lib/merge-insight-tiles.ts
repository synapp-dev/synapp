import type {
  DashboardKpiData,
  DashboardKpiSparkline,
} from "@/entities/dashboard/model/dummy-dashboard-data";
import type { DashboardInsightTiles } from "@/server/dashboard/dashboard-digest.service";

const COGS_TARGET_PERCENT = 35;

function sparkDayLabel(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  return new Intl.DateTimeFormat("en-AU", {
    day: "numeric",
    month: "short",
  }).format(new Date(y ?? 0, (m ?? 1) - 1, d ?? 1));
}

function costByDaySparkline(
  tiles: DashboardInsightTiles,
): DashboardKpiSparkline | undefined {
  const points = tiles.costByDay
    .filter((c) => c.costCents > 0)
    .map((c) => ({ label: sparkDayLabel(c.date), value: c.costCents / 100 }));
  if (points.length < 3) return undefined;
  return { kind: "area", label: "Daily cost", format: "currency", points };
}

/**
 * Replace the dummy COGS card with an engine-backed tile: real COGS %
 * (theoretical, from consumption facts). Cards the engine can't back yet
 * pass through unchanged. Stock-at-risk and untracked-sales tiles used to be
 * appended here; the dashboard now surfaces the sales-mix top sellers in that
 * row instead.
 */
export function mergeKpisWithInsightTiles(
  kpis: DashboardKpiData[],
  tiles: DashboardInsightTiles | null | undefined,
): DashboardKpiData[] {
  if (!tiles) return kpis;

  const out: DashboardKpiData[] = kpis.map((kpi) => {
    if (kpi.id !== "cogs" || tiles.cogs.percent === null) return kpi;
    const percent = tiles.cogs.percent;
    const prev = tiles.cogs.prevPercent;
    const deltaPp = prev !== null ? percent - prev : 0;
    return {
      ...kpi,
      title: "COGS % (theoretical, 7d)",
      value: `${percent.toFixed(1)}%`,
      countUpEnd: percent,
      countUpDecimals: 1,
      countUpPrefix: undefined,
      countUpSuffix: "%",
      targetDisplay: `≤ ${COGS_TARGET_PERCENT}%`,
      targetMissed: percent > COGS_TARGET_PERCENT,
      status: percent > COGS_TARGET_PERCENT ? "bad" : "good",
      deltaPercent: Math.abs(deltaPp),
      // For COGS lower is better: arrow up (green) when it fell.
      deltaDirection: deltaPp <= 0 ? "up" : "down",
      comparisonLabel:
        "Ingredient cost of sales from real consumption. Lower is better; the arrow shows the change in percentage points.",
      previousWeekDisplay: prev !== null ? `${prev.toFixed(1)}%` : "no data",
      sparkline: costByDaySparkline(tiles) ?? kpi.sparkline,
    };
  });

  return out;
}
