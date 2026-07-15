"use client";

import { useMemo, useState } from "react";
import {
  SuperbotFocusBanner,
  SuperbotFocusRing,
} from "@/entities/ai-agent-chat/components/superbot-focus";
import {
  ChevronLeft,
  ChevronRight,
  Layers,
  Plus,
  Search,
  Trash2,
  TrendingDown,
  TrendingUp,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@workspace/ui/components/alert-dialog";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Input } from "@workspace/ui/components/input";
import { Progress } from "@workspace/ui/components/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { Skeleton } from "@workspace/ui/components/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import { cn } from "@workspace/ui/lib/utils";
import { WASTE_REASONS, WASTE_REASON_LABEL } from "@/lib/waste/reasons";
import { LogWasteDialog } from "@/entities/waste/components/log-waste-dialog";
import {
  useDeleteWasteEntryMutation,
  useWasteEntriesQuery,
} from "@/entities/waste/model/use-waste-query";
import type { WasteEntryDto } from "@/entities/waste/model/types";

type WastePageProps = {
  organisation: string;
  venue: string;
};

type Period = "today" | "yesterday" | "week" | "month" | "all";
type SortMode = "recent" | "cost";

const PERIODS: { value: Period; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "week", label: "This week" },
  { value: "month", label: "This month" },
  { value: "all", label: "All" },
];

const PAGE_SIZE = 15;

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/**
 * Current period window plus the equal-length window before it, so the
 * summary strip can show a trend without a second request.
 */
function periodRange(period: Period): {
  from: Date;
  /** Exclusive upper bound; undefined = now. */
  to?: Date;
  compareFrom?: Date;
} {
  const today = startOfDay(new Date());
  const day = 86_400_000;
  switch (period) {
    case "today":
      return { from: today, compareFrom: new Date(today.getTime() - day) };
    case "yesterday": {
      const from = new Date(today.getTime() - day);
      return { from, to: today, compareFrom: new Date(from.getTime() - day) };
    }
    case "week": {
      const dow = (today.getDay() + 6) % 7; // Monday start
      const from = new Date(today.getTime() - dow * day);
      return { from, compareFrom: new Date(from.getTime() - 7 * day) };
    }
    case "month": {
      const from = new Date(today.getFullYear(), today.getMonth(), 1);
      return {
        from,
        compareFrom: new Date(today.getFullYear(), today.getMonth() - 1, 1),
      };
    }
    case "all":
      return { from: new Date(2020, 0, 1) };
  }
}

function formatCents(cents: number): string {
  return `$${(Math.abs(cents) / 100).toLocaleString("en-AU", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatQty(qty: number): string {
  return Number.isInteger(qty) ? String(qty) : qty.toFixed(2).replace(/0$/, "");
}

function formatWhen(iso: string): { date: string; time: string } {
  const d = new Date(iso);
  return {
    date: new Intl.DateTimeFormat("en-AU", {
      day: "2-digit",
      month: "short",
    }).format(d),
    time: new Intl.DateTimeFormat("en-AU", {
      hour: "numeric",
      minute: "2-digit",
    }).format(d),
  };
}

export function WastePage({ organisation, venue }: WastePageProps) {
  const [period, setPeriod] = useState<Period>("week");
  const [reasonFilter, setReasonFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("recent");
  const [page, setPage] = useState(1);
  const [logOpen, setLogOpen] = useState(false);
  const [quickLogItem, setQuickLogItem] = useState<{
    kind: "ingredient" | "batch";
    id: string;
  } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<WasteEntryDto | null>(null);

  const range = useMemo(() => periodRange(period), [period]);
  const query = useWasteEntriesQuery({
    organisation,
    venue,
    fromIso: (range.compareFrom ?? range.from).toISOString(),
    toIso: range.to?.toISOString(),
  });
  const deleteMutation = useDeleteWasteEntryMutation({ organisation, venue });

  const allFetched = useMemo(
    () => query.data?.entries ?? [],
    [query.data],
  );

  // Split fetched rows into the selected period and the compare window.
  const { periodEntries, previousEntries } = useMemo(() => {
    const fromMs = range.from.getTime();
    const toMs = range.to?.getTime() ?? Number.POSITIVE_INFINITY;
    const current: WasteEntryDto[] = [];
    const previous: WasteEntryDto[] = [];
    for (const entry of allFetched) {
      const t = new Date(entry.occurredAt).getTime();
      if (t >= fromMs && t < toMs) current.push(entry);
      else if (range.compareFrom && t >= range.compareFrom.getTime() && t < fromMs)
        previous.push(entry);
    }
    return { periodEntries: current, previousEntries: previous };
  }, [allFetched, range]);

  const filtered = useMemo(() => {
    let items = periodEntries;
    if (reasonFilter !== "all") {
      items = items.filter((e) => e.reason === reasonFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      items = items.filter((e) => e.itemName.toLowerCase().includes(q));
    }
    return [...items].sort((a, b) =>
      sortMode === "cost"
        ? b.costCents - a.costCents
        : new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime(),
    );
  }, [periodEntries, reasonFilter, searchQuery, sortMode]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const summary = useMemo(() => {
    const total = periodEntries.reduce((sum, e) => sum + e.costCents, 0);
    const previousTotal = previousEntries.reduce((sum, e) => sum + e.costCents, 0);
    const trendPct =
      range.compareFrom && previousTotal > 0
        ? Math.round(((total - previousTotal) / previousTotal) * 100)
        : null;

    const byItem = new Map<string, { entry: WasteEntryDto; cents: number; count: number }>();
    const byReason = new Map<string, number>();
    for (const entry of periodEntries) {
      const itemKey = entry.ingredientId ?? entry.recipeId ?? entry.itemName;
      const existing = byItem.get(itemKey);
      if (existing) {
        existing.cents += entry.costCents;
        existing.count += 1;
      } else {
        byItem.set(itemKey, { entry, cents: entry.costCents, count: 1 });
      }
      byReason.set(entry.reason, (byReason.get(entry.reason) ?? 0) + entry.costCents);
    }
    const topItems = [...byItem.values()].sort((a, b) => b.cents - a.cents).slice(0, 5);
    const reasonRows = [...byReason.entries()]
      .map(([reason, cents]) => ({ reason, cents }))
      .sort((a, b) => b.cents - a.cents);

    // Most frequently wasted items (whole fetch window) for quick-log chips.
    const freq = new Map<string, { entry: WasteEntryDto; count: number }>();
    for (const entry of allFetched) {
      const key = `${entry.isBatch ? "batch" : "ingredient"}:${entry.ingredientId ?? entry.recipeId}`;
      if (!entry.ingredientId && !entry.recipeId) continue;
      const existing = freq.get(key);
      if (existing) existing.count += 1;
      else freq.set(key, { entry, count: 1 });
    }
    const frequentItems = [...freq.values()]
      .sort((a, b) => b.count - a.count)
      .slice(0, 8)
      .map(({ entry }) => ({
        kind: entry.isBatch ? ("batch" as const) : ("ingredient" as const),
        id: (entry.isBatch ? entry.recipeId : entry.ingredientId)!,
        name: entry.itemName,
      }));

    return {
      total,
      trendPct,
      entryCount: periodEntries.length,
      topItems,
      reasonRows,
      maxReasonCents: reasonRows[0]?.cents ?? 1,
      frequentItems,
    };
  }, [periodEntries, previousEntries, allFetched, range.compareFrom]);

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await deleteMutation.mutateAsync(deleteTarget.id);
      toast.success(`Deleted ${deleteTarget.itemName} entry`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete entry");
    } finally {
      setDeleteTarget(null);
    }
  }

  const isEmpty = !query.isLoading && allFetched.length === 0;

  return (
    <section className="flex flex-col gap-5">
      <SuperbotFocusBanner destination="inventory_waste" />
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Waste</h1>
          <p className="text-muted-foreground text-sm">
            Log what got thrown out, and why. Logged waste explains stock variance
            and surfaces cost leaks.
          </p>
        </div>
        <SuperbotFocusRing targetId="superbot-log-waste">
          <Button
            onClick={() => {
              setQuickLogItem(null);
              setLogOpen(true);
            }}
          >
            <Plus className="mr-2 size-4" />
            Log waste
          </Button>
        </SuperbotFocusRing>
      </div>

      {/* Summary strip */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase tracking-wider">
              Wasted · {PERIODS.find((p) => p.value === period)?.label}
            </CardDescription>
            {query.isLoading ? (
              <Skeleton className="h-9 w-24" />
            ) : (
              <CardTitle className="text-3xl">{formatCents(summary.total)}</CardTitle>
            )}
            {summary.trendPct !== null && summary.trendPct !== 0 ? (
              <p
                className={cn(
                  "flex items-center gap-1 text-xs font-medium",
                  summary.trendPct > 0 ? "text-red-600" : "text-green-600",
                )}
              >
                {summary.trendPct > 0 ? (
                  <TrendingUp className="size-3" />
                ) : (
                  <TrendingDown className="size-3" />
                )}
                {summary.trendPct > 0 ? "+" : ""}
                {summary.trendPct}% vs previous
              </p>
            ) : null}
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase tracking-wider">
              Entries
            </CardDescription>
            {query.isLoading ? (
              <Skeleton className="h-9 w-12" />
            ) : (
              <CardTitle className="text-3xl">{summary.entryCount}</CardTitle>
            )}
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase tracking-wider">
              Top wasted item
            </CardDescription>
            {query.isLoading ? (
              <Skeleton className="h-7 w-32" />
            ) : (
              <CardTitle className="truncate text-lg">
                {summary.topItems[0]?.entry.itemName ?? "—"}
              </CardTitle>
            )}
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase tracking-wider">
              Top reason
            </CardDescription>
            {query.isLoading ? (
              <Skeleton className="h-7 w-32" />
            ) : (
              <CardTitle className="truncate text-lg">
                {summary.reasonRows[0]
                  ? (WASTE_REASON_LABEL[summary.reasonRows[0].reason] ??
                    summary.reasonRows[0].reason)
                  : "—"}
              </CardTitle>
            )}
          </CardHeader>
        </Card>
      </div>

      {/* Quick-log chips */}
      {summary.frequentItems.length > 0 ? (
        <Card>
          <CardContent className="p-4">
            <div className="mb-3 flex items-center gap-2">
              <Zap className="size-4 text-amber-500" />
              <h3 className="text-sm font-semibold">Quick log: frequently wasted</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {summary.frequentItems.map((item) => (
                <Button
                  key={`${item.kind}-${item.id}`}
                  variant="outline"
                  size="sm"
                  className="text-xs"
                  onClick={() => {
                    setQuickLogItem({ kind: item.kind, id: item.id });
                    setLogOpen(true);
                  }}
                >
                  <Plus className="mr-1 size-3" />
                  {item.name}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1 rounded-lg border p-0.5">
          {PERIODS.map((p) => (
            <Button
              key={p.value}
              variant={period === p.value ? "secondary" : "ghost"}
              size="sm"
              className="h-8 text-xs"
              onClick={() => {
                setPeriod(p.value);
                setPage(1);
              }}
            >
              {p.label}
            </Button>
          ))}
        </div>
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search item…"
            value={searchQuery}
            onChange={(event) => {
              setSearchQuery(event.target.value);
              setPage(1);
            }}
            className="h-9 w-[170px] pl-8"
          />
        </div>
        <Select
          value={reasonFilter}
          onValueChange={(v) => {
            setReasonFilter(v);
            setPage(1);
          }}
        >
          <SelectTrigger className="h-9 w-[170px]">
            <SelectValue placeholder="Reason" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All reasons</SelectItem>
            {WASTE_REASONS.map((r) => (
              <SelectItem key={r.value} value={r.value}>
                {r.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={sortMode} onValueChange={(v) => setSortMode(v as SortMode)}>
          <SelectTrigger className="h-9 w-[150px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="recent">Most recent</SelectItem>
            <SelectItem value="cost">Highest cost</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Breakdown cards */}
      {!query.isLoading && periodEntries.length > 0 ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardContent className="p-4">
              <h3 className="mb-3 text-sm font-semibold">Waste by reason</h3>
              <div className="space-y-3">
                {summary.reasonRows.map((row) => (
                  <div key={row.reason} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">
                        {WASTE_REASON_LABEL[row.reason] ?? row.reason}
                      </span>
                      <span className="font-semibold text-red-600">
                        {formatCents(row.cents)}
                      </span>
                    </div>
                    <Progress
                      value={(row.cents / summary.maxReasonCents) * 100}
                      className="h-2"
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <h3 className="mb-3 text-sm font-semibold">Top wasted items</h3>
              <div className="space-y-2.5">
                {summary.topItems.map((item, i) => (
                  <div
                    key={`${item.entry.ingredientId ?? item.entry.recipeId ?? item.entry.itemName}`}
                    className="flex items-center justify-between"
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="w-4 shrink-0 text-xs text-muted-foreground">
                        {i + 1}.
                      </span>
                      <span className="truncate text-sm font-medium">
                        {item.entry.itemName}
                      </span>
                      <Badge variant="outline" className="shrink-0 text-xs">
                        {item.count}×
                      </Badge>
                    </div>
                    <span className="text-sm font-semibold text-red-600">
                      {formatCents(item.cents)}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {/* Waste log */}
      {query.isLoading ? (
        <Card>
          <CardContent className="space-y-3 p-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </CardContent>
        </Card>
      ) : query.error ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Failed to load waste entries: {query.error.message}
          </CardContent>
        </Card>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-2 py-12 text-center">
            <div className="flex size-14 items-center justify-center rounded-2xl bg-muted">
              <Trash2 className="size-7 text-muted-foreground/50" />
            </div>
            <p className="font-semibold">
              {isEmpty ? "No waste logged yet" : "No waste logged in this period"}
            </p>
            <p className="max-w-sm text-sm text-muted-foreground">
              {isEmpty
                ? "Tap “Log waste” to start tracking. Most operators reduce waste 30–50% in the first 6 months just by tracking it."
                : "Try a different period or clear your filters."}
            </p>
            {isEmpty ? (
              <Button className="mt-4" onClick={() => setLogOpen(true)}>
                <Plus className="mr-2 size-4" />
                Log first waste
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
                  <TableHead className="text-xs font-medium uppercase tracking-wider">
                    When
                  </TableHead>
                  <TableHead className="text-xs font-medium uppercase tracking-wider">
                    Item
                  </TableHead>
                  <TableHead className="text-xs font-medium uppercase tracking-wider">
                    Qty
                  </TableHead>
                  <TableHead className="text-xs font-medium uppercase tracking-wider">
                    Reason
                  </TableHead>
                  <TableHead className="text-xs font-medium uppercase tracking-wider">
                    Cost
                  </TableHead>
                  <TableHead className="hidden text-xs font-medium uppercase tracking-wider md:table-cell">
                    Logged by
                  </TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginated.map((entry) => {
                  const when = formatWhen(entry.occurredAt);
                  return (
                    <TableRow key={entry.id}>
                      <TableCell className="whitespace-nowrap">
                        <div>{when.date}</div>
                        <span className="text-xs text-muted-foreground">{when.time}</span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 font-medium">
                          {entry.isBatch ? (
                            <Layers className="size-3.5 shrink-0 text-muted-foreground" />
                          ) : null}
                          {entry.itemName}
                        </div>
                        {entry.note ? (
                          <p className="max-w-[220px] truncate text-xs text-muted-foreground">
                            {entry.note}
                          </p>
                        ) : null}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {formatQty(entry.qty)} {entry.unit}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {WASTE_REASON_LABEL[entry.reason] ?? entry.reason}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-semibold text-red-600">
                        {formatCents(entry.costCents)}
                      </TableCell>
                      <TableCell className="hidden text-xs text-muted-foreground md:table-cell">
                        {entry.loggedBy ?? "—"}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="size-7 p-0 text-muted-foreground hover:text-destructive"
                          onClick={() => setDeleteTarget(entry)}
                        >
                          <Trash2 className="size-3" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>

            {totalPages > 1 ? (
              <div className="flex items-center justify-between border-t px-4 py-3">
                <p className="text-xs text-muted-foreground">
                  Showing {(safePage - 1) * PAGE_SIZE + 1}–
                  {Math.min(safePage * PAGE_SIZE, filtered.length)} of {filtered.length}
                </p>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={safePage <= 1}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    <ChevronLeft className="size-4" />
                  </Button>
                  <span className="px-2 text-xs">
                    {safePage} / {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={safePage >= totalPages}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    <ChevronRight className="size-4" />
                  </Button>
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      )}

      <LogWasteDialog
        organisation={organisation}
        venue={venue}
        open={logOpen}
        onOpenChange={setLogOpen}
        initialItem={quickLogItem}
      />

      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete waste entry?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget
                ? `${formatQty(deleteTarget.qty)} ${deleteTarget.unit} ${deleteTarget.itemName} (${formatCents(deleteTarget.costCents)}) will be removed and stock on hand recalculated.`
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteMutation.isPending}
              onClick={() => void handleDelete()}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
