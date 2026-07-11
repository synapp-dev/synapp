import type { DashboardKpiData } from "@/entities/dashboard/model/dummy-dashboard-data";
import type { DashboardInsightTiles } from "@/server/dashboard/dashboard-digest.service";

const COGS_TARGET_PERCENT = 35;

/**
 * Replace/append dummy KPI cards with engine-backed tiles: real COGS %
 * (theoretical, from consumption facts), stock-at-risk count (days of
 * cover), and untracked-sales dollars. Cards the engine can't back yet
 * pass through unchanged.
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
    };
  });

  const anchored = tiles.stockRisk.trackedIngredients !== null;
  out.push({
    id: "stock-risk",
    title: "Stock at risk",
    value: anchored ? String(tiles.stockRisk.atRisk.length) : "0",
    countUpEnd: anchored ? tiles.stockRisk.atRisk.length : 0,
    countUpDecimals: 0,
    countUpSuffix: anchored ? " items" : undefined,
    targetDisplay: anchored ? "< 3 days cover" : "needs baseline count",
    targetMissed: anchored && tiles.stockRisk.atRisk.length > 0,
    status: !anchored
      ? "neutral"
      : tiles.stockRisk.atRisk.length > 0
        ? "bad"
        : "good",
    deltaPercent: 0,
    deltaDirection: "up",
    comparisonLabel: anchored
      ? `Ingredients with under 3 days of cover at current burn rates${
          tiles.stockRisk.atRisk.length > 0
            ? `: ${tiles.stockRisk.atRisk
                .slice(0, 3)
                .map((r) => `${r.name} (${r.daysOfCover.toFixed(1)}d)`)
                .join(", ")}`
            : ""
        }`
      : "Run and approve a stock count to anchor stock-on-hand tracking.",
    previousWeekDisplay: anchored ? "live" : "unavailable",
  });

  out.push({
    id: "unmapped-sales",
    title: "Untracked sales (7d)",
    value: `$${Math.round(tiles.unmappedSales.valueCents7d / 100)}`,
    countUpEnd: Math.round(tiles.unmappedSales.valueCents7d / 100),
    countUpDecimals: 0,
    countUpPrefix: "$",
    status: tiles.unmappedSales.valueCents7d > 0 ? "watch" : "good",
    deltaPercent: 0,
    deltaDirection: "down",
    comparisonLabel:
      "Sales not yet traced to a recipe, so they deplete no stock. Map them in POS items to sharpen COGS and ordering.",
    previousWeekDisplay: `${Math.round(tiles.unmappedSales.count7d)} line items`,
  });

  return out;
}
