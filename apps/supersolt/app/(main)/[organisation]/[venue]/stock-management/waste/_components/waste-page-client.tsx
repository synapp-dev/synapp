"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Plus,
  Search,
  TrendingDown,
  TrendingUp,
  Trash2,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { Input } from "@workspace/ui/components/input";
import { Progress } from "@workspace/ui/components/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { Separator } from "@workspace/ui/components/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import { cn } from "@workspace/ui/lib/utils";

type WastePageClientProps = {
  organisation: string;
  venue: string;
};

type WasteReason =
  | "spoilage"
  | "expired"
  | "overproduction"
  | "breakage"
  | "staff_meal"
  | "promo"
  | "theft_unknown"
  | "spillage"
  | "prep-waste"
  | "other";

type Daypart = "breakfast" | "lunch" | "dinner" | "late_night";

type WasteEntry = {
  id: string;
  wasteDate: string;
  wasteTime: string;
  ingredientId: string;
  ingredientName: string;
  quantity: number;
  unit: string;
  value: number;
  reason: WasteReason;
  daypart: Daypart;
  recordedByName: string;
  notes?: string;
};

const WASTE_REASONS: { value: WasteReason; label: string }[] = [
  { value: "spoilage", label: "Spoilage" },
  { value: "expired", label: "Expired" },
  { value: "overproduction", label: "Overproduction" },
  { value: "breakage", label: "Dropped/Breakage" },
  { value: "staff_meal", label: "Staff Meal" },
  { value: "promo", label: "Promo/Comp" },
  { value: "theft_unknown", label: "Theft/Unknown" },
  { value: "spillage", label: "Spillage" },
  { value: "prep-waste", label: "Prep Waste" },
  { value: "other", label: "Other" },
];

const REASON_LABEL: Record<string, string> = Object.fromEntries(
  WASTE_REASONS.map((r) => [r.value, r.label])
);

type DateFilterValue = "today" | "week" | "month" | "all";

const PAGE_SIZE = 15;

const SEED_WASTE: WasteEntry[] = [
  { id: "w1", wasteDate: "2026-03-19", wasteTime: "07:30", ingredientId: "ing1", ingredientName: "Sourdough Loaf", quantity: 3, unit: "ea", value: 2100, reason: "expired", daypart: "breakfast", recordedByName: "Alex Chen" },
  { id: "w2", wasteDate: "2026-03-19", wasteTime: "11:45", ingredientId: "ing2", ingredientName: "Mixed Salad Greens", quantity: 1.5, unit: "kg", value: 1800, reason: "spoilage", daypart: "lunch", recordedByName: "Sam Taylor" },
  { id: "w3", wasteDate: "2026-03-18", wasteTime: "20:15", ingredientId: "ing3", ingredientName: "Wagyu Striploin", quantity: 0.5, unit: "kg", value: 6400, reason: "overproduction", daypart: "dinner", recordedByName: "Jordan Lee" },
  { id: "w4", wasteDate: "2026-03-18", wasteTime: "14:30", ingredientId: "ing4", ingredientName: "Barramundi Fillet", quantity: 2, unit: "ea", value: 4800, reason: "breakage", daypart: "lunch", recordedByName: "Alex Chen" },
  { id: "w5", wasteDate: "2026-03-18", wasteTime: "12:00", ingredientId: "ing5", ingredientName: "Cherry Tomatoes", quantity: 0.8, unit: "kg", value: 960, reason: "prep-waste", daypart: "lunch", recordedByName: "Sam Taylor" },
  { id: "w6", wasteDate: "2026-03-17", wasteTime: "19:30", ingredientId: "ing6", ingredientName: "King Prawns", quantity: 1, unit: "kg", value: 5600, reason: "spoilage", daypart: "dinner", recordedByName: "Jordan Lee" },
  { id: "w7", wasteDate: "2026-03-17", wasteTime: "13:15", ingredientId: "ing7", ingredientName: "Truffle Oil", quantity: 0.1, unit: "L", value: 3200, reason: "spillage", daypart: "lunch", recordedByName: "Alex Chen" },
  { id: "w8", wasteDate: "2026-03-17", wasteTime: "08:00", ingredientId: "ing8", ingredientName: "Eggs (Free Range)", quantity: 6, unit: "ea", value: 540, reason: "breakage", daypart: "breakfast", recordedByName: "Sam Taylor" },
  { id: "w9", wasteDate: "2026-03-16", wasteTime: "21:00", ingredientId: "ing9", ingredientName: "Atlantic Salmon", quantity: 1.2, unit: "kg", value: 5760, reason: "overproduction", daypart: "dinner", recordedByName: "Jordan Lee" },
  { id: "w10", wasteDate: "2026-03-16", wasteTime: "12:30", ingredientId: "ing2", ingredientName: "Mixed Salad Greens", quantity: 0.5, unit: "kg", value: 600, reason: "spoilage", daypart: "lunch", recordedByName: "Alex Chen" },
  { id: "w11", wasteDate: "2026-03-15", wasteTime: "19:45", ingredientId: "ing3", ingredientName: "Wagyu Striploin", quantity: 0.3, unit: "kg", value: 3840, reason: "staff_meal", daypart: "dinner", recordedByName: "Sam Taylor" },
  { id: "w12", wasteDate: "2026-03-15", wasteTime: "10:30", ingredientId: "ing10", ingredientName: "Heavy Cream", quantity: 2, unit: "L", value: 1400, reason: "expired", daypart: "breakfast", recordedByName: "Jordan Lee" },
  { id: "w13", wasteDate: "2026-03-14", wasteTime: "18:00", ingredientId: "ing6", ingredientName: "King Prawns", quantity: 0.5, unit: "kg", value: 2800, reason: "promo", daypart: "dinner", recordedByName: "Alex Chen" },
  { id: "w14", wasteDate: "2026-03-14", wasteTime: "13:00", ingredientId: "ing11", ingredientName: "Parmesan", quantity: 0.2, unit: "kg", value: 1600, reason: "prep-waste", daypart: "lunch", recordedByName: "Sam Taylor" },
  { id: "w15", wasteDate: "2026-03-13", wasteTime: "20:30", ingredientId: "ing9", ingredientName: "Atlantic Salmon", quantity: 0.8, unit: "kg", value: 3840, reason: "spoilage", daypart: "dinner", recordedByName: "Jordan Lee" },
  { id: "w16", wasteDate: "2026-03-13", wasteTime: "07:15", ingredientId: "ing1", ingredientName: "Sourdough Loaf", quantity: 2, unit: "ea", value: 1400, reason: "expired", daypart: "breakfast", recordedByName: "Alex Chen" },
  { id: "w17", wasteDate: "2026-03-12", wasteTime: "22:00", ingredientId: "ing3", ingredientName: "Wagyu Striploin", quantity: 0.4, unit: "kg", value: 5120, reason: "theft_unknown", daypart: "late_night", recordedByName: "Sam Taylor" },
  { id: "w18", wasteDate: "2026-03-12", wasteTime: "14:00", ingredientId: "ing5", ingredientName: "Cherry Tomatoes", quantity: 1.2, unit: "kg", value: 1440, reason: "spoilage", daypart: "lunch", recordedByName: "Jordan Lee" },
  { id: "w19", wasteDate: "2026-03-11", wasteTime: "19:00", ingredientId: "ing4", ingredientName: "Barramundi Fillet", quantity: 1, unit: "ea", value: 2400, reason: "overproduction", daypart: "dinner", recordedByName: "Alex Chen" },
  { id: "w20", wasteDate: "2026-03-10", wasteTime: "12:15", ingredientId: "ing8", ingredientName: "Eggs (Free Range)", quantity: 4, unit: "ea", value: 360, reason: "breakage", daypart: "lunch", recordedByName: "Sam Taylor" },
];

function formatCurrency(cents: number): string {
  const abs = Math.abs(cents);
  return `$${(abs / 100).toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("en-AU", { day: "2-digit", month: "short", year: "numeric" }).format(
    new Date(iso)
  );
}

export function WastePageClient({ organisation, venue }: WastePageClientProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFilter, setDateFilter] = useState<DateFilterValue>("month");
  const [reasonFilter, setReasonFilter] = useState("all");
  const [showDashboard, setShowDashboard] = useState(true);
  const [page, setPage] = useState(1);

  const filteredWaste = useMemo(() => {
    let items: WasteEntry[] = SEED_WASTE;

    if (dateFilter !== "all") {
      const now = Date.now();
      const cutoffs: Record<Exclude<DateFilterValue, "all">, number> = {
        today: now - 86_400_000,
        week: now - 7 * 86_400_000,
        month: now - 30 * 86_400_000,
      };
      const cutoff = cutoffs[dateFilter];
      items = items.filter((w) => new Date(w.wasteDate).getTime() >= cutoff);
    }

    if (reasonFilter !== "all") {
      items = items.filter((w) => w.reason === reasonFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      items = items.filter((w) => w.ingredientName.toLowerCase().includes(q));
    }

    return [...items].sort(
      (a, b) => new Date(b.wasteDate).getTime() - new Date(a.wasteDate).getTime()
    );
  }, [dateFilter, reasonFilter, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredWaste.length / PAGE_SIZE));
  const paginatedWaste = useMemo(
    () => filteredWaste.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [filteredWaste, page]
  );

  const dashboard = useMemo(() => {
    const now = Date.now();
    const weekStart = now - 7 * 86_400_000;
    const lastWeekStart = now - 14 * 86_400_000;

    const weekWaste = SEED_WASTE.filter((w) => new Date(w.wasteDate).getTime() >= weekStart);
    const lastWeekWaste = SEED_WASTE.filter((w) => {
      const t = new Date(w.wasteDate).getTime();
      return t >= lastWeekStart && t < weekStart;
    });
    const monthWaste = SEED_WASTE.filter(
      (w) => new Date(w.wasteDate).getTime() >= now - 30 * 86_400_000
    );

    const weekTotal = weekWaste.reduce((sum, w) => sum + w.value, 0);
    const lastWeekTotal = lastWeekWaste.reduce((sum, w) => sum + w.value, 0);
    const monthTotal = monthWaste.reduce((sum, w) => sum + w.value, 0);
    const weekChange =
      lastWeekTotal > 0 ? Math.round(((weekTotal - lastWeekTotal) / lastWeekTotal) * 100) : 0;

    const byItem = new Map<string, { name: string; value: number; count: number }>();
    for (const w of monthWaste) {
      const existing = byItem.get(w.ingredientId) ?? { name: w.ingredientName, value: 0, count: 0 };
      existing.value += w.value;
      existing.count += 1;
      byItem.set(w.ingredientId, existing);
    }
    const topItems = Array.from(byItem.values())
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    const topWastedItem = topItems[0]?.name ?? "—";

    const byReason = new Map<string, number>();
    for (const w of monthWaste) {
      byReason.set(w.reason, (byReason.get(w.reason) ?? 0) + w.value);
    }
    const reasonData = Array.from(byReason.entries())
      .map(([reason, value]) => ({ reason, label: REASON_LABEL[reason] ?? reason, value }))
      .sort((a, b) => b.value - a.value);
    const maxReasonValue = reasonData[0]?.value ?? 1;

    const frequentIds = Array.from(
      SEED_WASTE.reduce((map, w) => {
        map.set(w.ingredientId, (map.get(w.ingredientId) ?? 0) + 1);
        return map;
      }, new Map<string, number>())
    )
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([id]) => {
        const entry = SEED_WASTE.find((w) => w.ingredientId === id);
        return { id, name: entry?.ingredientName ?? id };
      });

    return {
      weekTotal,
      weekChange,
      monthTotal,
      topItems,
      topWastedItem,
      reasonData,
      maxReasonValue,
      frequentIds,
      logEntries: SEED_WASTE.length,
    };
  }, []);

  return (
    <section className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Waste Tracking</h1>
          <p className="text-sm text-muted-foreground">
            Organisation: <span className="font-medium">{organisation}</span> | Venue:{" "}
            <span className="font-medium">{venue}</span>
          </p>
        </div>
        <Button className="gap-2" onClick={() => toast.info("Log waste dialog coming soon")}>
          <Plus className="h-4 w-4" />
          Log Waste
        </Button>
      </div>

      {/* Stat cards */}
      <div className="grid gap-3 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase tracking-wider">This Week</CardDescription>
            <CardTitle className="text-3xl">{formatCurrency(dashboard.weekTotal)}</CardTitle>
            {dashboard.weekChange !== 0 ? (
              <p
                className={cn(
                  "flex items-center gap-1 text-xs font-medium",
                  dashboard.weekChange > 0 ? "text-red-600" : "text-green-600"
                )}
              >
                {dashboard.weekChange > 0 ? (
                  <TrendingUp className="h-3 w-3" />
                ) : (
                  <TrendingDown className="h-3 w-3" />
                )}
                {dashboard.weekChange > 0 ? "+" : ""}
                {dashboard.weekChange}% vs last week
              </p>
            ) : null}
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase tracking-wider">This Month</CardDescription>
            <CardTitle className="text-3xl">{formatCurrency(dashboard.monthTotal)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase tracking-wider">Top Wasted Item</CardDescription>
            <CardTitle className="truncate text-lg">{dashboard.topWastedItem}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase tracking-wider">Log Entries</CardDescription>
            <CardTitle className="text-3xl">{dashboard.logEntries}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search ingredient..."
            value={searchQuery}
            onChange={(event) => {
              setSearchQuery(event.target.value);
              setPage(1);
            }}
            className="h-9 w-[180px] pl-8"
          />
        </div>
        <Select
          value={dateFilter}
          onValueChange={(v) => {
            setDateFilter(v as DateFilterValue);
            setPage(1);
          }}
        >
          <SelectTrigger className="h-9 w-[130px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="today">Today</SelectItem>
            <SelectItem value="week">Last 7 Days</SelectItem>
            <SelectItem value="month">This Month</SelectItem>
            <SelectItem value="all">All Time</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={reasonFilter}
          onValueChange={(v) => {
            setReasonFilter(v);
            setPage(1);
          }}
        >
          <SelectTrigger className="h-9 w-[150px]">
            <SelectValue placeholder="Reason" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Reasons</SelectItem>
            {WASTE_REASONS.map((r) => (
              <SelectItem key={r.value} value={r.value}>
                {r.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant={showDashboard ? "default" : "outline"}
          size="sm"
          className="h-9 text-xs"
          onClick={() => setShowDashboard(!showDashboard)}
        >
          Dashboard
        </Button>
      </div>

      {/* Dashboard section */}
      {showDashboard ? (
        <div className="space-y-4">
          {/* Quick-add chips */}
          {dashboard.frequentIds.length > 0 ? (
            <Card>
              <CardContent className="p-4">
                <div className="mb-3 flex items-center gap-2">
                  <Zap className="h-4 w-4 text-amber-500" />
                  <h3 className="text-sm font-semibold">Quick Log — Top Wasted Items</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {dashboard.frequentIds.map((item) => (
                    <Button
                      key={item.id}
                      variant="outline"
                      size="sm"
                      className="text-xs"
                      onClick={() => toast.info(`Log waste for ${item.name}`)}
                    >
                      <Plus className="mr-1 h-3 w-3" />
                      {item.name}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : null}

          <div className="grid gap-4 lg:grid-cols-2">
            {/* Waste by Reason */}
            {dashboard.reasonData.length > 0 ? (
              <Card>
                <CardContent className="p-4">
                  <h3 className="mb-3 text-sm font-semibold">Waste by Reason (This Month)</h3>
                  <div className="space-y-3">
                    {dashboard.reasonData.map((item) => (
                      <div key={item.reason} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium">{item.label}</span>
                          <span className="font-semibold text-red-600">
                            {formatCurrency(item.value)}
                          </span>
                        </div>
                        <Progress
                          value={(item.value / dashboard.maxReasonValue) * 100}
                          className="h-2"
                        />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ) : null}

            {/* Top Wasted Items */}
            {dashboard.topItems.length > 0 ? (
              <Card>
                <CardContent className="p-4">
                  <h3 className="mb-3 text-sm font-semibold">Top Wasted Items (This Month)</h3>
                  <div className="space-y-2.5">
                    {dashboard.topItems.map((item, i) => (
                      <div key={item.name} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-4 text-xs text-muted-foreground">{i + 1}.</span>
                          <span className="text-sm font-medium">{item.name}</span>
                          <Badge variant="outline" className="text-xs">
                            {item.count}x
                          </Badge>
                        </div>
                        <span className="text-sm font-semibold text-red-600">
                          {formatCurrency(item.value)}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ) : null}
          </div>

          <Separator />
        </div>
      ) : null}

      {/* Waste Log Table */}
      {filteredWaste.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-2 py-12 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
              <Trash2 className="h-7 w-7 text-muted-foreground/50" />
            </div>
            <p className="font-semibold">
              {SEED_WASTE.length === 0 ? "No Waste Logged Yet" : "No Waste Found"}
            </p>
            <p className="max-w-sm text-sm text-muted-foreground">
              {SEED_WASTE.length === 0
                ? "Start tracking waste to identify patterns and reduce costs."
                : "Try adjusting your filters."}
            </p>
            {SEED_WASTE.length === 0 ? (
              <Button
                className="mt-4 gap-2"
                onClick={() => toast.info("Log waste dialog coming soon")}
              >
                <Plus className="h-4 w-4" />
                Log First Waste
              </Button>
            ) : null}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="px-0 py-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="text-xs font-medium uppercase tracking-wider">Date</TableHead>
                  <TableHead className="text-xs font-medium uppercase tracking-wider">
                    Ingredient
                  </TableHead>
                  <TableHead className="text-xs font-medium uppercase tracking-wider">Qty</TableHead>
                  <TableHead className="text-xs font-medium uppercase tracking-wider">Reason</TableHead>
                  <TableHead className="text-xs font-medium uppercase tracking-wider">Cost</TableHead>
                  <TableHead className="hidden text-xs font-medium uppercase tracking-wider md:table-cell">
                    Logged By
                  </TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedWaste.map((w) => (
                  <TableRow key={w.id}>
                    <TableCell className="whitespace-nowrap">
                      <div>{formatDate(w.wasteDate)}</div>
                      <span className="text-xs text-muted-foreground">{w.wasteTime}</span>
                    </TableCell>
                    <TableCell className="font-medium">{w.ingredientName}</TableCell>
                    <TableCell className="whitespace-nowrap">
                      {w.quantity} {w.unit}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{REASON_LABEL[w.reason] ?? w.reason}</Badge>
                    </TableCell>
                    <TableCell className="font-semibold text-red-600">
                      {formatCurrency(w.value)}
                    </TableCell>
                    <TableCell className="hidden text-xs text-muted-foreground md:table-cell">
                      {w.recordedByName}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                        onClick={() => toast.info(`Delete ${w.ingredientName} entry — coming soon`)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {/* Pagination */}
            {totalPages > 1 ? (
              <div className="flex items-center justify-between border-t px-4 py-3">
                <p className="text-xs text-muted-foreground">
                  Showing {(page - 1) * PAGE_SIZE + 1}–
                  {Math.min(page * PAGE_SIZE, filteredWaste.length)} of {filteredWaste.length}
                </p>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="px-2 text-xs">
                    {page} / {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      )}
    </section>
  );
}
