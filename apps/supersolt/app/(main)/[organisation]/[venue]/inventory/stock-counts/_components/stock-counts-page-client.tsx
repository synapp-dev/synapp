"use client";

import { useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  Calendar,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  Eye,
  Package,
  Plus,
  Search,
  TrendingDown,
  TrendingUp,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { Input } from "@workspace/ui/components/input";
import { Progress } from "@workspace/ui/components/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@workspace/ui/components/tabs";
import { cn } from "@workspace/ui/lib/utils";

type StockCountsPageClientProps = {
  organisation: string;
  venue: string;
};

type CountStatus = "in-progress" | "completed" | "reviewed";
type StockHealth = "healthy" | "low" | "critical" | "out";
type PageTab = "overview" | "counts";
type CountFilterTab = "all" | "in-progress" | "completed";

type VarianceItem = {
  id: string;
  ingredientName: string;
  expectedQty: number;
  actualQty: number;
  varianceValue: number;
};

type StockCount = {
  id: string;
  countNumber: string;
  countDate: string;
  countedByName: string;
  status: CountStatus;
  itemCount: number;
  totalVarianceValue: number;
  largeVarianceCount: number;
  items: VarianceItem[];
};

type StockLevelAlert = {
  ingredientName: string;
  status: StockHealth;
};

const STOCK_SUMMARY = {
  total: 42,
  healthy: 28,
  low: 8,
  critical: 4,
  out: 2,
  alertItems: [
    { ingredientName: "Saffron Threads", status: "out" as StockHealth },
    { ingredientName: "Truffle Oil", status: "out" as StockHealth },
    { ingredientName: "Wagyu Striploin", status: "critical" as StockHealth },
    { ingredientName: "King Prawns", status: "critical" as StockHealth },
    { ingredientName: "Barramundi Fillet", status: "critical" as StockHealth },
  ] satisfies StockLevelAlert[],
};

const SEED_COUNTS: StockCount[] = [
  {
    id: "sc1",
    countNumber: "SC-0087",
    countDate: "2026-03-18",
    countedByName: "Alex Chen",
    status: "in-progress",
    itemCount: 24,
    totalVarianceValue: -18400,
    largeVarianceCount: 3,
    items: [
      { id: "i1", ingredientName: "Wagyu Striploin", expectedQty: 12, actualQty: 8, varianceValue: -14400 },
      { id: "i2", ingredientName: "King Prawns", expectedQty: 20, actualQty: 18, varianceValue: -3200 },
      { id: "i3", ingredientName: "Cherry Tomatoes", expectedQty: 15, actualQty: 16, varianceValue: 800 },
      { id: "i4", ingredientName: "Olive Oil", expectedQty: 10, actualQty: 10, varianceValue: 0 },
      { id: "i5", ingredientName: "Truffle Oil", expectedQty: 4, actualQty: 2, varianceValue: -1600 },
    ],
  },
  {
    id: "sc2",
    countNumber: "SC-0086",
    countDate: "2026-03-14",
    countedByName: "Sam Taylor",
    status: "completed",
    itemCount: 38,
    totalVarianceValue: -7200,
    largeVarianceCount: 2,
    items: [
      { id: "i6", ingredientName: "Atlantic Salmon", expectedQty: 10, actualQty: 7, varianceValue: -9600 },
      { id: "i7", ingredientName: "Lemons", expectedQty: 30, actualQty: 32, varianceValue: 400 },
      { id: "i8", ingredientName: "Butter", expectedQty: 20, actualQty: 19, varianceValue: -500 },
      { id: "i9", ingredientName: "Heavy Cream", expectedQty: 8, actualQty: 10, varianceValue: 2500 },
    ],
  },
  {
    id: "sc3",
    countNumber: "SC-0085",
    countDate: "2026-03-10",
    countedByName: "Jordan Lee",
    status: "reviewed",
    itemCount: 42,
    totalVarianceValue: -3400,
    largeVarianceCount: 1,
    items: [
      { id: "i10", ingredientName: "Parmesan", expectedQty: 5, actualQty: 4, varianceValue: -3400 },
      { id: "i11", ingredientName: "Basil", expectedQty: 12, actualQty: 12, varianceValue: 0 },
    ],
  },
  {
    id: "sc4",
    countNumber: "SC-0084",
    countDate: "2026-03-07",
    countedByName: "Alex Chen",
    status: "reviewed",
    itemCount: 36,
    totalVarianceValue: 1200,
    largeVarianceCount: 0,
    items: [
      { id: "i12", ingredientName: "Chicken Breast", expectedQty: 25, actualQty: 26, varianceValue: 850 },
      { id: "i13", ingredientName: "Rice", expectedQty: 15, actualQty: 15, varianceValue: 0 },
      { id: "i14", ingredientName: "Soy Sauce", expectedQty: 8, actualQty: 9, varianceValue: 350 },
    ],
  },
  {
    id: "sc5",
    countNumber: "SC-0083",
    countDate: "2026-03-03",
    countedByName: "Sam Taylor",
    status: "reviewed",
    itemCount: 40,
    totalVarianceValue: -12600,
    largeVarianceCount: 2,
    items: [
      { id: "i15", ingredientName: "Eye Fillet", expectedQty: 8, actualQty: 5, varianceValue: -14400 },
      { id: "i16", ingredientName: "Mushrooms", expectedQty: 20, actualQty: 22, varianceValue: 600 },
      { id: "i17", ingredientName: "Shallots", expectedQty: 15, actualQty: 16, varianceValue: 200 },
      { id: "i18", ingredientName: "Thyme", expectedQty: 10, actualQty: 11, varianceValue: 100 },
      { id: "i19", ingredientName: "Red Wine", expectedQty: 6, actualQty: 6, varianceValue: 0 },
      { id: "i20", ingredientName: "Veal Stock", expectedQty: 4, actualQty: 5, varianceValue: 900 },
    ],
  },
  {
    id: "sc6",
    countNumber: "SC-0082",
    countDate: "2026-02-28",
    countedByName: "Jordan Lee",
    status: "reviewed",
    itemCount: 35,
    totalVarianceValue: -900,
    largeVarianceCount: 0,
    items: [
      { id: "i21", ingredientName: "Flour", expectedQty: 10, actualQty: 10, varianceValue: 0 },
      { id: "i22", ingredientName: "Sugar", expectedQty: 8, actualQty: 7, varianceValue: -200 },
      { id: "i23", ingredientName: "Eggs", expectedQty: 60, actualQty: 58, varianceValue: -700 },
    ],
  },
];

function formatCurrency(cents: number): string {
  const abs = Math.abs(cents);
  const formatted = `$${(abs / 100).toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  return cents < 0 ? `−${formatted}` : `+${formatted}`;
}

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("en-AU", { day: "2-digit", month: "short", year: "numeric" }).format(
    new Date(iso)
  );
}

function daysAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  return `${diff} days ago`;
}

function variancePercent(actual: number, expected: number): number {
  if (expected === 0) return 0;
  return ((actual - expected) / expected) * 100;
}

function StatusBadge({ status }: { status: CountStatus }) {
  switch (status) {
    case "in-progress":
      return (
        <Badge variant="outline" className="gap-1 border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-300">
          <Clock className="h-3 w-3" />
          In Progress
        </Badge>
      );
    case "completed":
      return (
        <Badge variant="outline" className="gap-1 border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-700 dark:bg-blue-950 dark:text-blue-300">
          <CheckCircle2 className="h-3 w-3" />
          Completed
        </Badge>
      );
    case "reviewed":
      return (
        <Badge variant="outline" className="gap-1 border-green-300 bg-green-50 text-green-700 dark:border-green-700 dark:bg-green-950 dark:text-green-300">
          <CheckCircle2 className="h-3 w-3" />
          Approved
        </Badge>
      );
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

function OverviewSection() {
  const summary = STOCK_SUMMARY;

  const recentCounts = useMemo(
    () =>
      [...SEED_COUNTS]
        .sort((a, b) => new Date(b.countDate).getTime() - new Date(a.countDate).getTime())
        .slice(0, 5),
    []
  );

  return (
    <div className="space-y-6">
      {summary.alertItems.length > 0 ? (
        <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 dark:border-red-800 dark:bg-red-950">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
          <div>
            <p className="text-sm font-semibold text-red-700 dark:text-red-300">
              {summary.out + summary.critical} ingredients need attention
            </p>
            <p className="mt-0.5 text-xs text-red-600 dark:text-red-400">
              {summary.alertItems.map((i) => i.ingredientName).join(", ")}
            </p>
          </div>
        </div>
      ) : null}

      <div>
        <h3 className="mb-3 text-sm font-semibold">Stock Status</h3>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
          {(
            [
              { label: "Total", value: summary.total, icon: Package, color: "text-foreground" },
              { label: "Healthy", value: summary.healthy, icon: Activity, color: "text-green-600" },
              { label: "Low", value: summary.low, icon: TrendingDown, color: "text-amber-600" },
              { label: "Critical", value: summary.critical, icon: AlertTriangle, color: "text-red-600" },
              { label: "Out of Stock", value: summary.out, icon: Package, color: "text-red-800 dark:text-red-400" },
            ] as const
          ).map(({ label, value, icon: Icon, color }) => (
            <Card key={label}>
              <CardContent className="flex items-center gap-3 p-5">
                <Icon className={cn("h-5 w-5 shrink-0", color)} />
                <div>
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className={cn("text-2xl font-bold", color)}>{value}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <div>
        <h3 className="mb-3 text-sm font-semibold">Recent Counts</h3>
        {recentCounts.length === 0 ? (
          <Card className="p-6 text-center text-sm text-muted-foreground">
            No stock counts yet. Start a count to track inventory.
          </Card>
        ) : (
          <Card className="overflow-hidden">
            <div className="divide-y">
              {recentCounts.map((sc) => (
                <div key={sc.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{sc.countNumber}</p>
                    <p className="text-xs text-muted-foreground">
                      {sc.countedByName} &middot; {formatDate(sc.countDate)}
                    </p>
                  </div>
                  <StatusBadge status={sc.status} />
                  <span
                    className={cn(
                      "text-sm font-semibold tabular-nums",
                      sc.totalVarianceValue < 0 ? "text-red-600" : "text-green-600"
                    )}
                  >
                    {formatCurrency(sc.totalVarianceValue)}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

export function StockCountsPageClient({ organisation, venue }: StockCountsPageClientProps) {
  const [pageTab, setPageTab] = useState<PageTab>("counts");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<CountFilterTab>("all");

  const stats = useMemo(() => {
    const inProgress = SEED_COUNTS.filter((sc) => sc.status === "in-progress").length;
    const completed = SEED_COUNTS.filter(
      (sc) => sc.status === "completed" || sc.status === "reviewed"
    ).length;
    const totalVariance = SEED_COUNTS.filter(
      (sc) => sc.status === "completed" || sc.status === "reviewed"
    ).reduce((sum, sc) => sum + sc.totalVarianceValue, 0);
    return { total: SEED_COUNTS.length, inProgress, completed, totalVariance };
  }, []);

  const filteredCounts = useMemo(() => {
    let result: StockCount[] = SEED_COUNTS;

    switch (activeTab) {
      case "in-progress":
        result = result.filter((sc) => sc.status === "in-progress");
        break;
      case "completed":
        result = result.filter((sc) => sc.status === "completed" || sc.status === "reviewed");
        break;
      case "all":
        break;
      default: {
        const _exhaustive: never = activeTab;
        return _exhaustive;
      }
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (sc) =>
          sc.countNumber.toLowerCase().includes(q) || sc.countedByName.toLowerCase().includes(q)
      );
    }

    return result;
  }, [activeTab, searchQuery]);

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Stock Counts</h1>
          <p className="text-sm text-muted-foreground">
            Organisation: <span className="font-medium">{organisation}</span> | Venue:{" "}
            <span className="font-medium">{venue}</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search counts..."
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="h-9 w-[200px] pl-8"
            />
          </div>
          <Button className="gap-2" onClick={() => toast.info("New count coming soon")}>
            <Plus className="h-4 w-4" />
            New Count
          </Button>
        </div>
      </div>

      <Tabs value={pageTab} onValueChange={(v) => setPageTab(v as PageTab)}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="counts">
            Counts
            <Badge variant="secondary" className="ml-1.5 text-xs">
              {SEED_COUNTS.length}
            </Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <OverviewSection />
        </TabsContent>

        <TabsContent value="counts" className="mt-6 space-y-6">
          {/* Summary stat cards */}
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <Card className="p-5">
              <div className="flex items-center gap-2">
                <ClipboardCheck className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Total</span>
              </div>
              <p className="mt-1 text-2xl font-bold">{stats.total}</p>
            </Card>
            <Card className="p-5">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-amber-500" />
                <span className="text-sm text-muted-foreground">In Progress</span>
              </div>
              <p className="mt-1 text-2xl font-bold">{stats.inProgress}</p>
            </Card>
            <Card className="p-5">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span className="text-sm text-muted-foreground">Completed</span>
              </div>
              <p className="mt-1 text-2xl font-bold">{stats.completed}</p>
            </Card>
            <Card className="p-5">
              <div className="flex items-center gap-2">
                {stats.totalVariance < 0 ? (
                  <TrendingDown className="h-4 w-4 text-red-500" />
                ) : (
                  <TrendingUp className="h-4 w-4 text-green-500" />
                )}
                <span className="text-sm text-muted-foreground">Net Variance</span>
              </div>
              <p
                className={cn(
                  "mt-1 text-2xl font-bold",
                  stats.totalVariance < 0 ? "text-red-600" : "text-green-600"
                )}
              >
                {formatCurrency(stats.totalVariance)}
              </p>
            </Card>
          </div>

          {/* Count filter tabs */}
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as CountFilterTab)}>
            <TabsList>
              <TabsTrigger value="all">
                All
                <Badge variant="secondary" className="ml-1.5 text-xs">
                  {SEED_COUNTS.length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="in-progress">
                In Progress
                <Badge variant="secondary" className="ml-1.5 text-xs">
                  {stats.inProgress}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="completed">
                Completed
                <Badge variant="secondary" className="ml-1.5 text-xs">
                  {stats.completed}
                </Badge>
              </TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="mt-4">
              {filteredCounts.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center gap-2 py-12 text-center">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
                      <ClipboardCheck className="h-7 w-7 text-muted-foreground/50" />
                    </div>
                    <p className="text-sm text-muted-foreground">No stock counts found</p>
                    <Button className="mt-4 gap-2" onClick={() => toast.info("New count coming soon")}>
                      <Plus className="h-4 w-4" />
                      Start a Count
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {filteredCounts.map((sc) => {
                    const accuracy =
                      sc.itemCount > 0
                        ? Math.min(100, ((sc.itemCount - sc.largeVarianceCount) / sc.itemCount) * 100)
                        : 100;

                    return (
                      <Card
                        key={sc.id}
                        className="cursor-pointer shadow-sm transition-shadow hover:shadow-md"
                        onClick={() => toast.info(`Variance summary for ${sc.countNumber}`)}
                      >
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between">
                            <div>
                              <CardTitle className="text-base">{sc.countNumber}</CardTitle>
                              <p className="mt-1 text-xs text-muted-foreground">{sc.countedByName}</p>
                            </div>
                            <StatusBadge status={sc.status} />
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-4 pt-0">
                          <div className="flex items-center gap-3 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3.5 w-3.5" />
                              {formatDate(sc.countDate)}
                            </span>
                            <span>{daysAgo(sc.countDate)}</span>
                          </div>

                          <div className="space-y-1">
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">{sc.itemCount} items</span>
                              <span
                                className={cn(
                                  "font-semibold",
                                  sc.totalVarianceValue < 0 ? "text-red-600" : "text-green-600"
                                )}
                              >
                                {formatCurrency(sc.totalVarianceValue)}
                              </span>
                            </div>
                            <Progress value={accuracy} className="h-1.5" />
                          </div>

                          {sc.largeVarianceCount > 0 ? (
                            <div className="flex items-center gap-1.5 text-xs text-amber-600">
                              <AlertTriangle className="h-3.5 w-3.5" />
                              {sc.largeVarianceCount} item{sc.largeVarianceCount > 1 ? "s" : ""} with
                              large variance
                            </div>
                          ) : null}

                          {/* Top variance items preview */}
                          <div className="rounded-lg border bg-muted/30 p-3">
                            <p className="mb-2 text-xs font-semibold text-muted-foreground">
                              Top Variance Items
                            </p>
                            <div className="space-y-1.5">
                              {[...sc.items]
                                .sort(
                                  (a, b) => Math.abs(b.varianceValue) - Math.abs(a.varianceValue)
                                )
                                .slice(0, 3)
                                .map((item) => {
                                  const pct = variancePercent(item.actualQty, item.expectedQty);
                                  return (
                                    <div
                                      key={item.id}
                                      className="flex items-center justify-between text-xs"
                                    >
                                      <span className="truncate font-medium">
                                        {item.ingredientName}
                                      </span>
                                      <div className="flex items-center gap-2">
                                        <span className="text-muted-foreground">
                                          {item.expectedQty}&rarr;{item.actualQty}
                                        </span>
                                        <span
                                          className={cn(
                                            "font-semibold tabular-nums",
                                            Math.abs(pct) > 10 ? "text-red-600" : "text-muted-foreground"
                                          )}
                                        >
                                          {pct > 0 ? "+" : ""}
                                          {pct.toFixed(1)}%
                                        </span>
                                      </div>
                                    </div>
                                  );
                                })}
                            </div>
                          </div>

                          <div className="flex gap-2 pt-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1 text-xs"
                              onClick={(event) => {
                                event.stopPropagation();
                                toast.info(`Review ${sc.countNumber}`);
                              }}
                            >
                              <Eye className="mr-1 h-3.5 w-3.5" />
                              Review
                            </Button>
                            {sc.status === "in-progress" ? (
                              <Button
                                size="sm"
                                className="flex-1 text-xs"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  toast.info("Continue count coming soon");
                                }}
                              >
                                Continue
                              </Button>
                            ) : null}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
                              onClick={(event) => {
                                event.stopPropagation();
                                toast.info(`Delete ${sc.countNumber} — coming soon`);
                              }}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </TabsContent>
      </Tabs>
    </section>
  );
}
