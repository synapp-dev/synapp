"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  BarChart3,
  ChevronDown,
  ChevronRight,
  ClipboardCheck,
  Clock,
  DollarSign,
  FileText,
  Info,
  Package,
  ShoppingCart,
  Trash2,
  TrendingDown,
} from "lucide-react";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@workspace/ui/components/collapsible";
import { cn } from "@workspace/ui/lib/utils";

type InventoryOverviewPageClientProps = {
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

type ActivityType = "count" | "waste" | "po-received" | "po-created";

type ActivityEvent = {
  id: string;
  type: ActivityType;
  description: string;
  timestamp: string;
};

type CategoryStock = {
  category: string;
  value: number;
};

type FoodCostWeek = {
  week: string;
  pct: number | null;
};

const ALERTS: AlertItem[] = [
  { id: "a1", type: "below-par", name: "Chicken Breast", detail: "Current 2.4kg vs par 8kg", actionLabel: "Order" },
  { id: "a2", type: "below-par", name: "Milk (2L)", detail: "Current 4 units vs par 18", actionLabel: "Order" },
  { id: "a3", type: "below-par", name: "Mixed Lettuce", detail: "Current 1.2kg vs par 5kg", actionLabel: "Order" },
  { id: "a4", type: "overdue-po", name: "PO-1249", detail: "2 days overdue (FreshCo)", actionLabel: "Follow up" },
  { id: "a5", type: "high-variance", name: "Olive Oil", detail: "Variance +17.8% this week" },
  { id: "a6", type: "high-variance", name: "Lemon Juice", detail: "Variance -14.2% this week" },
  { id: "a7", type: "no-recent-purchase", name: "Caperberries", detail: "No purchase in 37 days" },
  { id: "a8", type: "no-recent-purchase", name: "Saffron Threads", detail: "No purchase in 52 days" },
];

const ACTIVITY: ActivityEvent[] = [
  { id: "e1", type: "count", description: "Stock count completed — 42 items counted", timestamp: "2026-03-19T08:30:00Z" },
  { id: "e2", type: "waste", description: "Waste logged: 3.2kg Mixed Lettuce ($28.48)", timestamp: "2026-03-18T17:15:00Z" },
  { id: "e3", type: "po-received", description: "PO-1247 received from MeatWorks (6 items)", timestamp: "2026-03-18T10:45:00Z" },
  { id: "e4", type: "po-created", description: "PO-1250 created for FreshCo (8 items)", timestamp: "2026-03-17T14:20:00Z" },
  { id: "e5", type: "count", description: "Spot count: Bar spirits — 12 items, 1 variance", timestamp: "2026-03-17T09:00:00Z" },
  { id: "e6", type: "waste", description: "Waste logged: 1.8kg Salmon Fillet ($71.10)", timestamp: "2026-03-16T18:30:00Z" },
];

const CATEGORY_STOCK: CategoryStock[] = [
  { category: "Proteins", value: 12840 },
  { category: "Produce", value: 6840 },
  { category: "Dry Goods", value: 4930 },
  { category: "Dairy", value: 3220 },
  { category: "Beverages", value: 7580 },
];

const FOOD_COST_TREND: FoodCostWeek[] = [
  { week: "Wk 10", pct: 28.4 },
  { week: "Wk 11", pct: 29.1 },
  { week: "Wk 12", pct: 31.2 },
  { week: "Wk 13", pct: 30.6 },
  { week: "Wk 14", pct: 29.5 },
  { week: "Wk 15", pct: 28.9 },
];

function fmtCurrency(value: number): string {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

const ALERT_CONFIG: Record<AlertType, { label: string; icon: typeof AlertTriangle; color: string }> = {
  "below-par": { label: "Below Par Level", icon: AlertTriangle, color: "text-red-500" },
  "overdue-po": { label: "Overdue Purchase Orders", icon: Clock, color: "text-orange-500" },
  "high-variance": { label: "High Variance (Last Count)", icon: TrendingDown, color: "text-amber-500" },
  "no-recent-purchase": { label: "No Recent Purchase (30d)", icon: ShoppingCart, color: "text-blue-500" },
};

const ACTIVITY_ICONS: Record<ActivityType, typeof FileText> = {
  count: ClipboardCheck,
  waste: Trash2,
  "po-received": Package,
  "po-created": FileText,
};

function AlertsSection({ alerts }: { alerts: AlertItem[] }) {
  const [open, setOpen] = useState(true);

  const grouped = useMemo(() => {
    const groups: Record<AlertType, AlertItem[]> = {
      "below-par": [],
      "overdue-po": [],
      "high-variance": [],
      "no-recent-purchase": [],
    };
    for (const alert of alerts) {
      groups[alert.type].push(alert);
    }
    return groups;
  }, [alerts]);

  if (alerts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertTriangle className="h-4 w-4" />
            Alerts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No alerts — all clear!</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <Card>
        <CardHeader className="pb-3">
          <CollapsibleTrigger asChild>
            <button type="button" className="flex w-full items-center gap-2 text-left">
              {open ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              )}
              <CardTitle className="flex items-center gap-2 text-base">
                <AlertTriangle className="h-4 w-4" />
                Alerts
                <Badge variant="destructive">{alerts.length}</Badge>
              </CardTitle>
            </button>
          </CollapsibleTrigger>
        </CardHeader>
        <CollapsibleContent>
          <CardContent className="space-y-4 pt-0">
            {(Object.keys(grouped) as AlertType[]).map((type) => {
              const items = grouped[type];
              if (items.length === 0) {
                return null;
              }

              const config = ALERT_CONFIG[type];
              const TypeIcon = config.icon;

              return (
                <div key={type}>
                  <div className={cn("mb-2 flex items-center gap-1.5 text-sm font-medium", config.color)}>
                    <TypeIcon className="h-3.5 w-3.5" />
                    {config.label} ({items.length})
                  </div>
                  <div className="space-y-1.5">
                    {items.slice(0, 5).map((alert) => (
                      <div
                        key={alert.id}
                        className="flex items-center justify-between rounded-md bg-muted/50 px-2 py-1.5 text-sm"
                      >
                        <div className="min-w-0 flex-1">
                          <span className="font-medium">{alert.name}</span>
                          <span className="ml-2 text-muted-foreground">{alert.detail}</span>
                        </div>
                        {alert.actionLabel ? (
                          <Button variant="ghost" size="sm" className="ml-2 h-7 shrink-0 text-xs">
                            {alert.actionLabel}
                          </Button>
                        ) : null}
                      </div>
                    ))}
                    {items.length > 5 ? (
                      <p className="pl-2 text-xs text-muted-foreground">+{items.length - 5} more</p>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

function ActivityFeed({ events }: { events: ActivityEvent[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        {events.length === 0 ? (
          <p className="text-sm text-muted-foreground">No recent activity.</p>
        ) : (
          <div className="space-y-3">
            {events.map((event) => {
              const Icon = ACTIVITY_ICONS[event.type];
              return (
                <div key={event.id} className="flex items-start gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm leading-tight">{event.description}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {new Date(event.timestamp).toLocaleString("en-AU", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function InventoryOverviewPageClient({ organisation, venue }: InventoryOverviewPageClientProps) {
  const totalStockValue = useMemo(
    () => CATEGORY_STOCK.reduce((sum, cat) => sum + cat.value, 0),
    []
  );

  const itemsBelowPar = useMemo(
    () => ALERTS.filter((a) => a.type === "below-par").length,
    []
  );

  const pendingPOs = useMemo(
    () => ALERTS.filter((a) => a.type === "overdue-po").length,
    []
  );

  return (
    <section className="space-y-5">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Inventory Overview</h1>
        <p className="text-sm text-muted-foreground">
          Organisation: <span className="font-medium">{organisation}</span> | Venue:{" "}
          <span className="font-medium">{venue}</span>
        </p>
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
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending POs</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{pendingPOs}</p>
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
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_0.54fr]">
        <div className="space-y-4">
          <AlertsSection alerts={ALERTS} />

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <TrendingDown className="h-4 w-4" />
                Food Cost % Trend
              </CardTitle>
              <CardDescription>Weekly food cost against 30% target</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {FOOD_COST_TREND.map((row) => (
                <div key={row.week} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span>{row.week}</span>
                    <span
                      className={cn(
                        "font-medium",
                        row.pct !== null && row.pct > 30 ? "text-red-600" : "text-emerald-600"
                      )}
                    >
                      {row.pct !== null ? `${row.pct.toFixed(1)}%` : "N/A"}
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className={cn(
                        "h-full rounded-full",
                        row.pct !== null && row.pct > 30 ? "bg-red-500" : "bg-emerald-500"
                      )}
                      style={{ width: `${Math.min(100, (row.pct ?? 0) * 2.2)}%` }}
                    />
                  </div>
                </div>
              ))}
              <p className="pt-1 text-xs text-muted-foreground">Target: 30%</p>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <BarChart3 className="h-4 w-4" />
                Stock Value by Category
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {CATEGORY_STOCK.map((cat) => {
                const pct = totalStockValue === 0 ? 0 : (cat.value / totalStockValue) * 100;
                return (
                  <div key={cat.category} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{cat.category}</span>
                      <span className="text-muted-foreground">
                        {fmtCurrency(cat.value)} ({pct.toFixed(0)}%)
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <ActivityFeed events={ACTIVITY} />
        </div>
      </div>

      <Card className="border-dashed">
        <CardContent className="flex items-start gap-2 py-4 text-sm text-muted-foreground">
          <Info className="mt-0.5 h-4 w-4 shrink-0" />
          Dashboard layout ported from reference with local seeded data. Hook integrations will
          replace demo values once inventory API endpoints are ready.
        </CardContent>
      </Card>
    </section>
  );
}
