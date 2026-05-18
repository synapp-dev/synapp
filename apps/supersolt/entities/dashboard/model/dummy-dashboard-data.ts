export type DashboardHeroData = {
  periodLabel: string;
  metricLabel: string;
  /** Static copy of the headline amount (keep in sync with `countUpEnd`). */
  value: string;
  /** Numeric amount for CountUp (e.g. dollars). */
  countUpEnd: number;
  countUpDecimals: number;
  deltaPercent: number;
  deltaDirection: "up" | "down";
  comparisonLabel: string;
};

export type DashboardKpiStatus = "good" | "watch" | "bad" | "neutral";

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
};

export type DashboardTrendPoint = {
  label: string;
  value: number;
};

export type DashboardNetRevenuePoint = {
  label: string;
  revenue: number;
  expenses: number;
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
    { label: "Mon", revenue: 6100, expenses: 4280 },
    { label: "Tue", revenue: 6420, expenses: 4510 },
    { label: "Wed", revenue: 7010, expenses: 5120 },
    { label: "Thu", revenue: 6880, expenses: 4950 },
    { label: "Fri", revenue: 7640, expenses: 5280 },
    { label: "Sat", revenue: 9220, expenses: 6850 },
    { label: "Sun", revenue: 7650, expenses: 5420 },
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
    },
    {
      id: "labour",
      title: "Labour %",
      value: "30.9%",
      countUpEnd: 30.9,
      countUpDecimals: 1,
      countUpSuffix: "%",
      targetDisplay: "28%",
      targetMissed: true,
      status: "watch",
      deltaPercent: 1.2,
      deltaDirection: "up",
      comparisonLabel: "vs previous week",
      previousWeekDisplay: "30.5%",
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
