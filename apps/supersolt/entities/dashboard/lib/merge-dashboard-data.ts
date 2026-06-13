import { dummyDashboardData } from "@/entities/dashboard/model/dummy-dashboard-data";
import type {
  DashboardHeroData,
  DashboardKpiData,
  DashboardNetRevenuePoint,
  DummyDashboardData,
} from "@/entities/dashboard/model/dummy-dashboard-data";
import type { DashboardLiveSalesSlice } from "@/lib/dashboard/build-dashboard-sales-snapshot";

export function mergeDashboardWithLiveSales(
  live: DashboardLiveSalesSlice | null | undefined
): {
  hero: DashboardHeroData;
  netRevenueSeries: DashboardNetRevenuePoint[];
  kpis: DashboardKpiData[];
  dataSource: "square" | "demo";
} {
  if (!live) {
    return {
      hero: dummyDashboardData.hero,
      netRevenueSeries: dummyDashboardData.netRevenueSeries,
      kpis: dummyDashboardData.kpis,
      dataSource: "demo",
    };
  }

  const kpis = dummyDashboardData.kpis.map((kpi) =>
    kpi.id === "avg-check" ? live.avgCheckKpi : kpi
  );

  return {
    hero: live.hero,
    netRevenueSeries: live.netRevenueSeries,
    kpis,
    dataSource: live.dataSource,
  };
}

export function dashboardDataWithLiveSales(
  live: DashboardLiveSalesSlice | null | undefined
): Pick<DummyDashboardData, "hero" | "netRevenueSeries" | "kpis"> &
  { dataSource: "square" | "demo" } {
  return mergeDashboardWithLiveSales(live);
}
