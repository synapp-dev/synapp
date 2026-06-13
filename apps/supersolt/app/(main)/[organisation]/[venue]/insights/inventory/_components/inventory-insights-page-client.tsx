"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  AlertTriangle,
  BarChart3,
  Clock,
  DollarSign,
  Download,
  Info,
  Package,
  ShoppingCart,
  Trash2,
  TrendingDown,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@workspace/ui/components/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@workspace/ui/components/table";
import { cn } from "@workspace/ui/lib/utils";
import { useInsightsPeriod } from "@/entities/insights/model/insights-period-provider";
import { useVenueXeroConnectionQuery } from "@/entities/xero/model/use-venue-xero-connection";
import { useVenueXeroInvoicesQuery } from "@/entities/xero/model/use-venue-xero-invoices-query";

type InventoryInsightsPageClientProps = {
  organisation: string;
  venue: string;
};

type AlertType = "below-par" | "overdue-po" | "high-variance" | "no-recent-purchase";

type AlertItem = {
  id: string;
  type: AlertType;
  name: string;
  detail: string;
  actionLabel?: string;
};

type DatePreset = "today" | "yesterday" | "this-week" | "last-week" | "this-month" | "last-30";

const CATEGORY_STOCK_VALUE = [
  { category: "Proteins", value: 12840 },
  { category: "Produce", value: 6840 },
  { category: "Dry Goods", value: 4930 },
  { category: "Dairy", value: 3220 },
  { category: "Beverage", value: 7580 },
];

const FOOD_COST_TREND = [
  { week: "Wk 01", pct: 28.4 },
  { week: "Wk 02", pct: 29.1 },
  { week: "Wk 03", pct: 31.2 },
  { week: "Wk 04", pct: 30.6 },
  { week: "Wk 05", pct: 29.5 },
  { week: "Wk 06", pct: 28.9 },
];

const ALERTS: AlertItem[] = [
  {
    id: "a1",
    type: "below-par",
    name: "Chicken Thigh",
    detail: "Current 3.1kg vs par 8kg",
    actionLabel: "Order",
  },
  {
    id: "a2",
    type: "below-par",
    name: "Milk (2L)",
    detail: "Current 6 units vs par 18",
    actionLabel: "Order",
  },
  {
    id: "a3",
    type: "high-variance",
    name: "Olive Oil",
    detail: "Variance +17.8% this week",
  },
  {
    id: "a4",
    type: "high-variance",
    name: "Lemon Juice",
    detail: "Variance -14.2% this week",
  },
  {
    id: "a5",
    type: "overdue-po",
    name: "PO-1249",
    detail: "2 days overdue (FreshCo)",
    actionLabel: "Follow up",
  },
  {
    id: "a6",
    type: "no-recent-purchase",
    name: "Caperberries",
    detail: "No purchase in 37 days",
  },
];

function fmtCurrency(value: number): string {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function startOfDay(date: Date): Date {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function endOfDay(date: Date): Date {
  const next = new Date(date);
  next.setHours(23, 59, 59, 999);
  return next;
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function startOfWeekMonday(date: Date): Date {
  const day = date.getDay();
  const delta = day === 0 ? -6 : 1 - day;
  return startOfDay(addDays(date, delta));
}

function endOfWeekMonday(date: Date): Date {
  return endOfDay(addDays(startOfWeekMonday(date), 6));
}

function startOfMonth(date: Date): Date {
  return startOfDay(new Date(date.getFullYear(), date.getMonth(), 1));
}

function endOfMonth(date: Date): Date {
  return endOfDay(new Date(date.getFullYear(), date.getMonth() + 1, 0));
}

function getDateRange(preset: DatePreset): { start: Date; end: Date } {
  const now = new Date();
  switch (preset) {
    case "today":
      return { start: startOfDay(now), end: endOfDay(now) };
    case "yesterday": {
      const yesterday = addDays(now, -1);
      return { start: startOfDay(yesterday), end: endOfDay(yesterday) };
    }
    case "this-week":
      return { start: startOfWeekMonday(now), end: endOfWeekMonday(now) };
    case "last-week": {
      const previousWeek = addDays(now, -7);
      return {
        start: startOfWeekMonday(previousWeek),
        end: endOfWeekMonday(previousWeek),
      };
    }
    case "this-month":
      return { start: startOfMonth(now), end: endOfMonth(now) };
    case "last-30":
      return { start: startOfDay(addDays(now, -30)), end: endOfDay(now) };
    default: {
      const neverPreset: never = preset;
      return neverPreset;
    }
  }
}

function formatDateRange(start: Date, end: Date): string {
  const fmt = new Intl.DateTimeFormat("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  return `${fmt.format(start)} - ${fmt.format(end)}`;
}

function downloadCsv(filename: string, header: string[], rows: Array<Array<string | number>>) {
  const escapedRows = rows.map((row) =>
    row
      .map((value) => {
        const text = String(value);
        if (text.includes(",") || text.includes("\"")) {
          return `"${text.replaceAll("\"", "\"\"")}"`;
        }
        return text;
      })
      .join(",")
  );

  const csv = [header.join(","), ...escapedRows].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function InventoryInsightsPageClient({ organisation, venue }: InventoryInsightsPageClientProps) {
  const xeroConnection = useVenueXeroConnectionQuery(organisation, venue);
  const xeroInvoices = useVenueXeroInvoicesQuery({
    organisationSlug: organisation,
    venueSlug: venue,
    enabled: xeroConnection.data?.connected === true,
  });
  const xeroBillCount = xeroInvoices.data?.invoices.length ?? 0;
  const invoicesHref = `/${organisation}/${venue}/purchasing/invoices`;

  const { preset: datePreset } = useInsightsPeriod();

  const totalStockValue = useMemo(
    () => CATEGORY_STOCK_VALUE.reduce((sum, category) => sum + category.value, 0),
    []
  );

  const itemsBelowPar = useMemo(
    () => ALERTS.filter((alert) => alert.type === "below-par").length,
    []
  );

  const pendingPOs = useMemo(
    () => ALERTS.filter((alert) => alert.type === "overdue-po").length,
    []
  );

  const highVarianceItems = useMemo(
    () => ALERTS.filter((alert) => alert.type === "high-variance"),
    []
  );

  const parLevelAlerts = useMemo(
    () => ALERTS.filter((alert) => alert.type === "below-par"),
    []
  );

  function handleExportKpis() {
    downloadCsv(
      `inventory-insights-${venue}-${datePreset}.csv`,
      ["Metric", "Value"],
      [
        ["Total Stock Value", totalStockValue],
        ["Items Below Par", itemsBelowPar],
        ["Waste This Week", 2380],
        ["Pending POs", pendingPOs],
      ]
    );
    toast.success("Inventory summary exported");
  }

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-lg font-semibold tracking-tight">Inventory</h2>
          <Badge variant="outline" className="text-muted-foreground text-xs font-normal">
            Demo data
          </Badge>
        </div>
        <Button onClick={handleExportKpis} className="gap-2">
          <Download className="h-4 w-4" />
          Export CSV
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Stock Value</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{fmtCurrency(totalStockValue)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Items Below Par</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="flex items-center gap-2">
            <p className="text-2xl font-bold">{itemsBelowPar}</p>
            {itemsBelowPar > 0 ? <Badge variant="destructive">{itemsBelowPar}</Badge> : null}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Waste This Week</CardTitle>
            <Trash2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{fmtCurrency(2380)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending POs</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{pendingPOs}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingDown className="h-4 w-4" />
              Food Cost % Trend
            </CardTitle>
            <CardDescription>Weekly food cost % against 30% target</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {FOOD_COST_TREND.map((row) => (
              <div key={row.week} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span>{row.week}</span>
                  <span className={cn("font-medium", row.pct > 30 ? "text-red-600" : "text-emerald-600")}>
                    {row.pct.toFixed(1)}%
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn("h-full rounded-full", row.pct > 30 ? "bg-red-500" : "bg-emerald-500")}
                    style={{ width: `${Math.min(100, row.pct * 2.2)}%` }}
                  />
                </div>
              </div>
            ))}
            <p className="pt-1 text-xs text-muted-foreground">Target: 30%</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="h-4 w-4" />
              Stock Value by Category
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {CATEGORY_STOCK_VALUE.map((category) => {
              const percentage = totalStockValue === 0 ? 0 : (category.value / totalStockValue) * 100;
              return (
                <div key={category.category} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{category.category}</span>
                    <span className="text-muted-foreground">
                      {fmtCurrency(category.value)} ({percentage.toFixed(0)}%)
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${percentage}%` }} />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Package className="h-4 w-4" />
              Par Level Alerts
              {parLevelAlerts.length > 0 ? <Badge variant="destructive">{parLevelAlerts.length}</Badge> : null}
            </CardTitle>
            <CardDescription>Items currently below their par level</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 pt-0">
            {parLevelAlerts.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between rounded-md bg-red-50 px-2 py-1.5 text-sm dark:bg-red-950/20"
              >
                <div>
                  <p className="font-medium">{item.name}</p>
                  <p className="text-xs text-muted-foreground">{item.detail}</p>
                </div>
                {item.actionLabel ? (
                  <Button variant="ghost" size="sm" className="h-7 text-xs text-red-600">
                    {item.actionLabel}
                  </Button>
                ) : null}
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingDown className="h-4 w-4" />
              High-Variance Items
              {highVarianceItems.length > 0 ? (
                <Badge variant="outline" className="border-amber-300 text-amber-600">
                  {highVarianceItems.length}
                </Badge>
              ) : null}
            </CardTitle>
            <CardDescription>Items with large variance this period</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 pt-0">
            {highVarianceItems.map((item) => (
              <div
                key={item.id}
                className="rounded-md bg-amber-50 px-2 py-1.5 text-sm dark:bg-amber-950/20"
              >
                <p className="font-medium">{item.name}</p>
                <p className="text-xs text-muted-foreground">{item.detail}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertTriangle className="h-4 w-4" />
            Alerts & Warnings
            <Badge variant="destructive">{ALERTS.length}</Badge>
          </CardTitle>
          <CardDescription>Grouped actionable alerts for inventory health</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Item</TableHead>
                <TableHead>Detail</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ALERTS.map((alert) => (
                <TableRow key={alert.id}>
                  <TableCell>
                    <Badge variant="outline">{alert.type}</Badge>
                  </TableCell>
                  <TableCell className="font-medium">{alert.name}</TableCell>
                  <TableCell className="text-muted-foreground">{alert.detail}</TableCell>
                  <TableCell className="text-right">
                    {alert.actionLabel ? (
                      <Button variant="ghost" size="sm" className="h-7 text-xs">
                        {alert.actionLabel}
                      </Button>
                    ) : (
                      <span className="text-xs text-muted-foreground">-</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card className="border-dashed">
        <CardContent className="flex items-start gap-2 py-4 text-sm text-muted-foreground">
          <Info className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            Charts here still use seeded demo data.{" "}
            {xeroConnection.data?.connected ? (
              <>
                Supplier bills from Xero are available in{" "}
                <Link href={invoicesHref} className="font-medium text-foreground underline">
                  Inventory → Invoices
                </Link>
                {xeroBillCount > 0 ? ` (${xeroBillCount} synced).` : " — sync bills to populate COGS inputs."}
              </>
            ) : (
              "Connect Xero under Settings → Integrations to sync supplier bills."
            )}
          </span>
        </CardContent>
      </Card>
    </section>
  );
}
