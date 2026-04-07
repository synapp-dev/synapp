export type DashboardHeroData = {
  periodLabel: string;
  metricLabel: string;
  value: string;
  deltaPercent: number;
  deltaDirection: "up" | "down";
  comparisonLabel: string;
};

export type DashboardKpiStatus = "good" | "watch" | "bad" | "neutral";

export type DashboardKpiData = {
  id: string;
  title: string;
  value: string;
  subtitle: string;
  status: DashboardKpiStatus;
};

export type DashboardTrendPoint = {
  label: string;
  value: number;
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

export type DummyDashboardData = {
  hero: DashboardHeroData;
  kpis: DashboardKpiData[];
  trend: DashboardTrendPoint[];
  channelMix: DashboardChannelMix[];
  alerts: DashboardAlert[];
  quickActions: DashboardQuickAction[];
};

export const dummyDashboardData: DummyDashboardData = {
  hero: {
    periodLabel: "This Week",
    metricLabel: "Net Revenue",
    value: "$48,920.40",
    deltaPercent: 6.4,
    deltaDirection: "up",
    comparisonLabel: "vs previous week",
  },
  kpis: [
    {
      id: "cogs",
      title: "COGS %",
      value: "29.8%",
      subtitle: "Target: <30%",
      status: "good",
    },
    {
      id: "labour",
      title: "Labour %",
      value: "30.9%",
      subtitle: "Target: 28%",
      status: "watch",
    },
    {
      id: "avg-check",
      title: "Avg Check",
      value: "$34.20",
      subtitle: "1,431 orders",
      status: "good",
    },
    {
      id: "gp",
      title: "Gross Profit %",
      value: "61.2%",
      subtitle: "Target: 65%",
      status: "watch",
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
};
