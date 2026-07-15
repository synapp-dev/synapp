export type DashboardHeroData = {
  periodLabel: string;
  metricLabel: string;
  /** Static copy of the headline amount (keep in sync with `countUpEnd`). */
  value: string;
  /** Numeric amount for CountUp (e.g. dollars). */
  countUpEnd: number;
  countUpDecimals: number;
  /** null hides the delta badge (e.g. "All time" has nothing to compare). */
  deltaPercent: number | null;
  deltaDirection: "up" | "down";
  comparisonLabel: string;
};

export type DashboardKpiStatus = "good" | "watch" | "bad" | "neutral";

export type DashboardKpiSparkPoint = {
  label: string;
  value: number;
};

export type DashboardKpiSparkline = {
  kind: "area" | "bar";
  /** Tooltip series name, e.g. "Daily cost". */
  label: string;
  format: "currency" | "percent" | "number" | "days";
  points: DashboardKpiSparkPoint[];
};

export type DashboardKpiData = {
  id: string;
  title: string;
  value: string;
  /** Numeric end value for CountUp. */
  countUpEnd: number;
  countUpDecimals: number;
  countUpPrefix?: string;
  countUpSuffix?: string;
  /**
   * Target threshold shown next to the crosshair in the header.
   * Omit or leave empty when the metric has no target (e.g. avg check with no goal line).
   */
  targetDisplay?: string;
  /** When true, show a pulsing warning dot (current value worse than target). */
  targetMissed?: boolean;
  status: DashboardKpiStatus;
  deltaPercent: number;
  deltaDirection: "up" | "down";
  /** Short label for the delta tooltip (e.g. "vs previous week"). */
  comparisonLabel: string;
  /** Prior-week headline value shown in the delta tooltip (dummy UX). */
  previousWeekDisplay: string;
  /** Optional mini trend chart rendered along the card's bottom edge. */
  sparkline?: DashboardKpiSparkline;
};

export type DashboardTrendPoint = {
  label: string;
  value: number;
};

export type DashboardNetRevenuePoint = {
  label: string;
  /** Actual revenue for the day; null for future days so the line stops at today. */
  revenue: number | null;
  /** Projected revenue for the day (forecast engine); null when no forecast exists. */
  forecast: number | null;
};

export type DashboardChannelMix = {
  channel: string;
  sharePercent: number;
  orders: number;
};

export type DashboardAlert = {
  id: string;
  severity: "warning" | "info";
  message: string;
  actionLabel: string;
  href: string | null;
};

export type DashboardQuickAction = {
  id: string;
  label: string;
  description: string;
  href: string | null;
};

export type DashboardMorningDigestData = {
  /** Short lines shown as the agent morning digest (mock until live agent). */
  lines: string[];
  insightHeadline: string | null;
  insightBody: string | null;
};

export type DummyDashboardData = {
  hero: DashboardHeroData;
  /** Dummy daily net revenue points for the hero spark chart (UX preview). */
  netRevenueSeries: DashboardNetRevenuePoint[];
  kpis: DashboardKpiData[];
  trend: DashboardTrendPoint[];
  channelMix: DashboardChannelMix[];
  alerts: DashboardAlert[];
  quickActions: DashboardQuickAction[];
  morningDigest: DashboardMorningDigestData;
};

/**
 * Demo breakdown for the wide Avg Check card when no live venue is in scope
 * (mirrors the shape of `DashboardAvgCheckBreakdown` without importing the
 * server module into dummy data).
 */
export const dummyAvgCheckBreakdown = {
  from: "2026-01-05",
  to: "2026-01-11",
  dataSource: "demo" as const,
  totalOrders: 1431,
  avgCheckCents: 3420,
  categories: [
    {
      key: "coffee",
      label: "Coffee",
      revenueCents: 1_622_400,
      quantity: 2950,
      sharePct: 34.2,
      avgPerCheckCents: 1134,
      attachRatePct: 78,
    },
    {
      key: "panini",
      label: "Panini",
      revenueCents: 1_244_300,
      quantity: 890,
      sharePct: 26.2,
      avgPerCheckCents: 870,
      attachRatePct: 46,
    },
    {
      key: "drinks",
      label: "Drinks",
      revenueCents: 826_800,
      quantity: 1270,
      sharePct: 17.4,
      avgPerCheckCents: 578,
      attachRatePct: 39,
    },
    {
      key: "sweets",
      label: "Sweets",
      revenueCents: 592_100,
      quantity: 980,
      sharePct: 12.5,
      avgPerCheckCents: 414,
      attachRatePct: 31,
    },
    {
      key: "other",
      label: "Other",
      revenueCents: 460_200,
      quantity: 410,
      sharePct: 9.7,
      avgPerCheckCents: 322,
      attachRatePct: 18,
    },
  ],
};

export const dummyDashboardData: DummyDashboardData = {
  hero: {
    periodLabel: "This Week",
    metricLabel: "Net Revenue",
    value: "$48,920.40",
    countUpEnd: 48_920.4,
    countUpDecimals: 2,
    deltaPercent: 6.4,
    deltaDirection: "up",
    comparisonLabel: "vs previous week",
  },
  netRevenueSeries: [
    { label: "Mon", revenue: 6100, forecast: 6280 },
    { label: "Tue", revenue: 6420, forecast: 6350 },
    { label: "Wed", revenue: 7010, forecast: 6620 },
    { label: "Thu", revenue: 6880, forecast: 6940 },
    { label: "Fri", revenue: 7640, forecast: 7320 },
    { label: "Sat", revenue: 9220, forecast: 8710 },
    { label: "Sun", revenue: 7650, forecast: 7980 },
  ],
  kpis: [
    {
      id: "cogs",
      title: "COGS %",
      value: "29.8%",
      countUpEnd: 29.8,
      countUpDecimals: 1,
      countUpSuffix: "%",
      targetDisplay: "<30%",
      targetMissed: false,
      status: "good",
      deltaPercent: 0.6,
      deltaDirection: "down",
      comparisonLabel: "vs previous week",
      previousWeekDisplay: "30.4%",
      sparkline: {
        kind: "area",
        label: "COGS %",
        format: "percent",
        points: [
          { label: "Mon", value: 30.6 },
          { label: "Tue", value: 30.1 },
          { label: "Wed", value: 31.2 },
          { label: "Thu", value: 29.9 },
          { label: "Fri", value: 30.3 },
          { label: "Sat", value: 29.4 },
          { label: "Sun", value: 29.8 },
        ],
      },
    },
    {
      id: "avg-check",
      title: "Avg Check",
      value: "$34.20",
      countUpEnd: 34.2,
      countUpDecimals: 2,
      countUpPrefix: "$",
      status: "good",
      deltaPercent: 2.4,
      deltaDirection: "up",
      comparisonLabel: "vs previous week",
      previousWeekDisplay: "$33.40",
      sparkline: {
        kind: "area",
        label: "Avg check",
        format: "currency",
        points: [
          { label: "Mon", value: 32.4 },
          { label: "Tue", value: 33.1 },
          { label: "Wed", value: 33.8 },
          { label: "Thu", value: 32.9 },
          { label: "Fri", value: 34.6 },
          { label: "Sat", value: 35.8 },
          { label: "Sun", value: 34.2 },
        ],
      },
    },
    {
      id: "gp",
      title: "Gross Profit %",
      value: "61.2%",
      countUpEnd: 61.2,
      countUpDecimals: 1,
      countUpSuffix: "%",
      targetDisplay: "65%",
      targetMissed: true,
      status: "watch",
      deltaPercent: 0.9,
      deltaDirection: "down",
      comparisonLabel: "vs previous week",
      previousWeekDisplay: "61.8%",
      sparkline: {
        kind: "area",
        label: "Gross profit %",
        format: "percent",
        points: [
          { label: "Mon", value: 60.4 },
          { label: "Tue", value: 61.8 },
          { label: "Wed", value: 60.9 },
          { label: "Thu", value: 62.1 },
          { label: "Fri", value: 61.5 },
          { label: "Sat", value: 62.6 },
          { label: "Sun", value: 61.2 },
        ],
      },
    },
  ],
  trend: [
    { label: "Mon", value: 6100 },
    { label: "Tue", value: 6420 },
    { label: "Wed", value: 7010 },
    { label: "Thu", value: 6880 },
    { label: "Fri", value: 7640 },
    { label: "Sat", value: 9220 },
    { label: "Sun", value: 7650 },
  ],
  channelMix: [
    { channel: "Dine-in", sharePercent: 52, orders: 739 },
    { channel: "Takeaway", sharePercent: 31, orders: 443 },
    { channel: "Delivery", sharePercent: 17, orders: 249 },
  ],
  alerts: [
    {
      id: "low-stock",
      severity: "warning",
      message: "7 ingredients are below par level.",
      actionLabel: "View order guide",
      href: null,
    },
    {
      id: "timesheets",
      severity: "warning",
      message: "4 timesheets are awaiting approval.",
      actionLabel: "Open timesheets",
      href: null,
    },
    {
      id: "draft-shifts",
      severity: "info",
      message: "12 draft shifts are ready to publish.",
      actionLabel: "Open roster",
      href: null,
    },
  ],
  quickActions: [
    {
      id: "create-roster",
      label: "Create Roster",
      description: "Plan next week's shifts",
      href: null,
    },
    {
      id: "start-stock-count",
      label: "Start Stock Count",
      description: "Count current inventory levels",
      href: null,
    },
    {
      id: "log-waste",
      label: "Log Waste",
      description: "Record spoilage and variance",
      href: null,
    },
  ],
  morningDigest: {
    lines: [
      "Yesterday closed slightly under your Tuesday baseline — nothing alarming.",
      "Two supplier invoices are waiting for approval; oat milk cost is up 15% vs last invoice.",
    ],
    insightHeadline: "Revenue vs baseline",
    insightBody: "Brunswick was 18% under; Hawthorn carried the day. Tap Sales when you want the full picture.",
  },
};
