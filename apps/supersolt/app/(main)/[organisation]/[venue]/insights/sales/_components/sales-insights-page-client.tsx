"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  BarChart3,
  Download,
  ExternalLink,
  FileSpreadsheet,
  RefreshCw,
  Search,
  X,
} from "lucide-react";
import { toast } from "sonner";
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@workspace/ui/components/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import { cn } from "@workspace/ui/lib/utils";
import { useSalesInsightsQuery } from "@/entities/sales-insights/model/useSalesInsightsQuery";
import type {
  DatePreset,
  SalesDateRange,
  SalesOrderRow,
  SortDir,
  SortField,
} from "@/entities/sales-insights/model/types";

type SalesInsightsPageClientProps = {
  organisation: string;
  venue: string;
};

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

function getPresetDateRange(preset: DatePreset): SalesDateRange {
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
      const lastWeekAnchor = addDays(now, -7);
      return {
        start: startOfWeekMonday(lastWeekAnchor),
        end: endOfWeekMonday(lastWeekAnchor),
      };
    }
    case "this-month":
      return { start: startOfMonth(now), end: endOfMonth(now) };
    case "last-30":
      return { start: startOfDay(addDays(now, -30)), end: endOfDay(now) };
    case "custom":
      return { start: startOfDay(now), end: endOfDay(now) };
    default: {
      const neverPreset: never = preset;
      return neverPreset;
    }
  }
}

function formatCurrency(cents: number): string {
  const abs = Math.abs(cents / 100);
  const sign = cents < 0 ? "-" : "";
  return `${sign}$${abs.toLocaleString("en-AU", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDayTime(value: string): string {
  const date = new Date(value);
  return new Intl.DateTimeFormat("en-AU", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

function formatCsvDateTime(value: string): string {
  const date = new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day} ${hour}:${minute}`;
}

function formatDateRangeText(dateRange: SalesDateRange): string {
  const start = new Intl.DateTimeFormat("en-AU", {
    day: "numeric",
    month: "short",
  }).format(dateRange.start);
  const end = new Intl.DateTimeFormat("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(dateRange.end);
  return `${start} - ${end}`;
}

function toDateInputValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function fromDateInputValue(value: string, isEnd: boolean): Date | undefined {
  if (!value) {
    return undefined;
  }
  const [yearValue, monthValue, dayValue] = value.split("-");
  const year = Number(yearValue);
  const month = Number(monthValue);
  const day = Number(dayValue);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
    return undefined;
  }
  const next = new Date(year, month - 1, day);
  return isEnd ? endOfDay(next) : startOfDay(next);
}

function channelLabel(channel: string): string {
  const map: Record<string, string> = {
    "dine-in": "Dine-in",
    takeaway: "Takeaway",
    delivery: "Delivery",
    online: "Online",
  };
  return map[channel] ?? `${channel.charAt(0).toUpperCase()}${channel.slice(1)}`;
}

function paymentLabel(paymentMethod: string | null): string {
  if (!paymentMethod) {
    return "Unknown";
  }

  const map: Record<string, string> = {
    card: "Card",
    cash: "Cash",
    digital_wallet: "Digital Wallet",
    eftpos: "EFTPOS",
  };

  if (map[paymentMethod]) {
    return map[paymentMethod];
  }

  return paymentMethod.charAt(0).toUpperCase() + paymentMethod.slice(1).replaceAll("_", " ");
}

function statusLabel(order: SalesOrderRow): "Void" | "Refund" | "Sale" {
  if (order.is_void) {
    return "Void";
  }
  if (order.is_refund) {
    return "Refund";
  }
  return "Sale";
}

type SortIconProps = {
  sortField: SortField;
  sortDir: SortDir;
  field: SortField;
};

function SortIcon({ sortField, sortDir, field }: SortIconProps) {
  if (sortField !== field) {
    return <ArrowUpDown className="ml-1 h-3.5 w-3.5 opacity-40" />;
  }
  return sortDir === "asc" ? (
    <ArrowUp className="ml-1 h-3.5 w-3.5" />
  ) : (
    <ArrowDown className="ml-1 h-3.5 w-3.5" />
  );
}

export function SalesInsightsPageClient({
  organisation,
  venue,
}: SalesInsightsPageClientProps) {
  const [datePreset, setDatePreset] = useState<DatePreset>("last-week");
  const [customFrom, setCustomFrom] = useState<Date | undefined>();
  const [customTo, setCustomTo] = useState<Date | undefined>();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [channelFilter, setChannelFilter] = useState("all");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<SortField>("order_datetime");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const dateRange = useMemo((): SalesDateRange => {
    if (datePreset === "custom") {
      const now = new Date();
      return {
        start: customFrom ?? startOfDay(now),
        end: customTo ?? endOfDay(now),
      };
    }
    return getPresetDateRange(datePreset);
  }, [customFrom, customTo, datePreset]);

  const {
    data: orders = [],
    isPending,
    refetch,
  } = useSalesInsightsQuery({
    organisationSlug: organisation,
    venueSlug: venue,
    dateRange,
  });

  const channels = useMemo(() => {
    return [...new Set(orders.map((order) => order.channel))].sort();
  }, [orders]);

  const paymentMethods = useMemo(() => {
    return [...new Set(orders.map((order) => order.payment_method ?? "unknown"))].sort();
  }, [orders]);

  const filteredOrders = useMemo(() => {
    let result = orders;

    if (channelFilter !== "all") {
      result = result.filter((order) => order.channel === channelFilter);
    }

    if (paymentFilter !== "all") {
      result = result.filter(
        (order) => (order.payment_method ?? "unknown") === paymentFilter
      );
    }

    if (searchQuery.trim()) {
      const normalizedQuery = searchQuery.toLowerCase().trim();
      result = result.filter((order) => {
        const orderNumber = order.order_number?.toLowerCase() ?? "";
        return (
          orderNumber.includes(normalizedQuery) ||
          order.id.toLowerCase().includes(normalizedQuery)
        );
      });
    }

    return [...result].sort((left, right) => {
      let compareValue = 0;

      switch (sortField) {
        case "order_datetime":
          compareValue =
            new Date(left.order_datetime).getTime() -
            new Date(right.order_datetime).getTime();
          break;
        case "order_number":
          compareValue = (left.order_number ?? "").localeCompare(right.order_number ?? "");
          break;
        case "channel":
          compareValue = left.channel.localeCompare(right.channel);
          break;
        case "gross_amount":
          compareValue = left.gross_amount - right.gross_amount;
          break;
        case "tax_amount":
          compareValue = left.tax_amount - right.tax_amount;
          break;
        case "net_amount":
          compareValue = left.net_amount - right.net_amount;
          break;
        case "payment_method":
          compareValue = (left.payment_method ?? "").localeCompare(
            right.payment_method ?? ""
          );
          break;
        default: {
          const neverField: never = sortField;
          return neverField;
        }
      }

      return sortDir === "asc" ? compareValue : -compareValue;
    });
  }, [orders, channelFilter, paymentFilter, searchQuery, sortField, sortDir]);

  const stats = useMemo(() => {
    const validTransactions = filteredOrders.filter((order) => !order.is_void);
    const sales = validTransactions.filter((order) => !order.is_refund);
    const refunds = validTransactions.filter((order) => order.is_refund);

    const totalRevenue = sales.reduce((sum, order) => sum + order.net_amount, 0);
    const totalRefunds = refunds.reduce((sum, order) => sum + order.net_amount, 0);
    const totalTax = sales.reduce((sum, order) => sum + order.tax_amount, 0);

    return {
      totalOrders: sales.length,
      totalRevenue,
      totalTax,
      totalRefunds,
      refundCount: refunds.length,
      voidCount: filteredOrders.filter((order) => order.is_void).length,
      avgCheck: sales.length === 0 ? 0 : totalRevenue / sales.length,
    };
  }, [filteredOrders]);

  const hasActiveFilters =
    channelFilter !== "all" || paymentFilter !== "all" || searchQuery.trim().length > 0;

  function clearFilters() {
    setChannelFilter("all");
    setPaymentFilter("all");
    setSearchQuery("");
  }

  function handleSort(field: SortField) {
    if (sortField === field) {
      setSortDir((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }
    setSortField(field);
    setSortDir(field === "order_datetime" ? "desc" : "asc");
  }

  function handleExportCsv() {
    if (filteredOrders.length === 0) {
      toast.error("No transactions to export");
      return;
    }

    const header = "Date/Time,Order #,Channel,Gross,Tax,Discount,Net,Payment,Source,Status";
    const rows = filteredOrders.map((order) => {
      return [
        formatCsvDateTime(order.order_datetime),
        `"${order.order_number ?? order.id.slice(0, 8)}"`,
        channelLabel(order.channel),
        (order.gross_amount / 100).toFixed(2),
        (order.tax_amount / 100).toFixed(2),
        (order.discount_amount / 100).toFixed(2),
        (order.net_amount / 100).toFixed(2),
        paymentLabel(order.payment_method),
        "manual",
        statusLabel(order),
      ].join(",");
    });

    const csvContent = [header, ...rows].join("\n");
    const csvBlob = new Blob([csvContent], { type: "text/csv" });
    const csvUrl = URL.createObjectURL(csvBlob);
    const link = document.createElement("a");
    link.href = csvUrl;
    link.download = `sales-${toDateInputValue(dateRange.start)}-to-${toDateInputValue(
      dateRange.end
    )}.csv`;
    link.click();
    URL.revokeObjectURL(csvUrl);

    toast.success(`Exported ${filteredOrders.length} transactions`);
  }

  const integrationHref = `/${organisation}/${venue}/settings`;

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Sales Insights</h1>
          <p className="text-sm text-muted-foreground">
            Organisation: <span className="font-medium">{organisation}</span> | Venue:{" "}
            <span className="font-medium">{venue}</span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={datePreset}
            onValueChange={(value) => {
              const nextPreset = value as DatePreset;
              setDatePreset(nextPreset);
              if (nextPreset === "custom") {
                setTimeout(() => setPickerOpen(true), 50);
              }
            }}
          >
            <SelectTrigger className="w-[148px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="yesterday">Yesterday</SelectItem>
              <SelectItem value="this-week">This Week</SelectItem>
              <SelectItem value="last-week">Last Week</SelectItem>
              <SelectItem value="this-month">This Month</SelectItem>
              <SelectItem value="last-30">Last 30 Days</SelectItem>
              <SelectItem value="custom">Custom...</SelectItem>
            </SelectContent>
          </Select>

          <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="h-9">
                Custom Range
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-[300px] space-y-3">
              <div className="space-y-1">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  From
                </p>
                <Input
                  type="date"
                  value={toDateInputValue(customFrom ?? dateRange.start)}
                  onChange={(event) => {
                    const value = fromDateInputValue(event.target.value, false);
                    setCustomFrom(value);
                    setDatePreset("custom");
                  }}
                />
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  To
                </p>
                <Input
                  type="date"
                  value={toDateInputValue(customTo ?? dateRange.end)}
                  onChange={(event) => {
                    const value = fromDateInputValue(event.target.value, true);
                    setCustomTo(value);
                    setDatePreset("custom");
                  }}
                />
              </div>
              <div className="flex justify-end">
                <Button size="sm" onClick={() => setPickerOpen(false)}>
                  Apply
                </Button>
              </div>
            </PopoverContent>
          </Popover>

          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {formatDateRangeText(dateRange)}
          </span>

          <Button className="gap-2" onClick={handleExportCsv}>
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase tracking-wider">
              Orders
            </CardDescription>
            <CardTitle className="text-3xl">{stats.totalOrders}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase tracking-wider">
              Revenue
            </CardDescription>
            <CardTitle className="text-3xl">{formatCurrency(stats.totalRevenue)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase tracking-wider">
              Avg Check
            </CardDescription>
            <CardTitle className="text-3xl">{formatCurrency(stats.avgCheck)}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase tracking-wider">
              Tax Collected
            </CardDescription>
            <CardTitle className="text-xl">{formatCurrency(stats.totalTax)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase tracking-wider">
              Refunds
            </CardDescription>
            <CardTitle className="text-xl">
              {stats.refundCount} ({formatCurrency(stats.totalRefunds)})
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase tracking-wider">
              Voids
            </CardDescription>
            <CardTitle className="text-xl">{stats.voidCount}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardContent className="flex flex-wrap items-center gap-3 border-b py-4">
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search order #..."
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="h-9 w-[210px] pl-8"
            />
          </div>

          <Select value={channelFilter} onValueChange={setChannelFilter}>
            <SelectTrigger className="h-9 w-[136px]">
              <SelectValue placeholder="Channel" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Channels</SelectItem>
              {channels.map((channel) => (
                <SelectItem key={channel} value={channel}>
                  {channelLabel(channel)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={paymentFilter} onValueChange={setPaymentFilter}>
            <SelectTrigger className="h-9 w-[148px]">
              <SelectValue placeholder="Payment" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Payments</SelectItem>
              {paymentMethods.map((paymentMethod) => (
                <SelectItem key={paymentMethod} value={paymentMethod}>
                  {paymentLabel(paymentMethod)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {hasActiveFilters ? (
            <Button variant="ghost" size="sm" className="h-8 gap-1 text-xs" onClick={clearFilters}>
              <X className="h-3.5 w-3.5" />
              Clear
            </Button>
          ) : null}

          <div className="ml-auto flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-1 text-xs"
              onClick={() => void refetch()}
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Refresh
            </Button>
            <span className="text-xs text-muted-foreground">
              {filteredOrders.length} of {orders.length} transactions
            </span>
          </div>
        </CardContent>

        <CardContent className="border-b py-5">
          <div className="mb-3 flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">Sales Mix</h3>
          </div>
          <div className="rounded-lg border border-dashed p-6 text-center">
            <BarChart3 className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
            <p className="text-sm font-medium">Connect your POS to see sales mix</p>
            <p className="mt-1 mb-3 text-xs text-muted-foreground">
              Item-level data (menu items sold, quantity, and item revenue) requires a POS
              integration.
            </p>
            <Link
              href={integrationHref}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Open settings
            </Link>
          </div>
        </CardContent>

        <CardContent className="px-0 py-0">
          {isPending ? (
            <div className="flex h-64 items-center justify-center text-muted-foreground">
              <RefreshCw className="mr-2 h-5 w-5 animate-spin" />
              Loading transactions...
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="flex h-64 flex-col items-center justify-center gap-2 text-center">
              <FileSpreadsheet className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm font-medium">No transactions found</p>
              <p className="text-xs text-muted-foreground">
                {orders.length === 0
                  ? "No sales data for this period."
                  : "Try adjusting your filters."}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>
                    <button
                      className="flex items-center text-xs font-medium"
                      onClick={() => handleSort("order_datetime")}
                    >
                      Date/Time
                      <SortIcon sortField={sortField} sortDir={sortDir} field="order_datetime" />
                    </button>
                  </TableHead>
                  <TableHead>
                    <button
                      className="flex items-center text-xs font-medium"
                      onClick={() => handleSort("order_number")}
                    >
                      Order #
                      <SortIcon sortField={sortField} sortDir={sortDir} field="order_number" />
                    </button>
                  </TableHead>
                  <TableHead>
                    <button
                      className="flex items-center text-xs font-medium"
                      onClick={() => handleSort("channel")}
                    >
                      Channel
                      <SortIcon sortField={sortField} sortDir={sortDir} field="channel" />
                    </button>
                  </TableHead>
                  <TableHead className="text-right">
                    <button
                      className="ml-auto flex items-center justify-end text-xs font-medium"
                      onClick={() => handleSort("gross_amount")}
                    >
                      Gross
                      <SortIcon sortField={sortField} sortDir={sortDir} field="gross_amount" />
                    </button>
                  </TableHead>
                  <TableHead className="text-right">
                    <button
                      className="ml-auto flex items-center justify-end text-xs font-medium"
                      onClick={() => handleSort("tax_amount")}
                    >
                      Tax
                      <SortIcon sortField={sortField} sortDir={sortDir} field="tax_amount" />
                    </button>
                  </TableHead>
                  <TableHead className="text-right">
                    <button
                      className="ml-auto flex items-center justify-end text-xs font-medium"
                      onClick={() => handleSort("net_amount")}
                    >
                      Net
                      <SortIcon sortField={sortField} sortDir={sortDir} field="net_amount" />
                    </button>
                  </TableHead>
                  <TableHead>
                    <button
                      className="flex items-center text-xs font-medium"
                      onClick={() => handleSort("payment_method")}
                    >
                      Payment
                      <SortIcon sortField={sortField} sortDir={sortDir} field="payment_method" />
                    </button>
                  </TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.map((order) => {
                  const isRefund = order.is_refund;
                  const isVoid = order.is_void;

                  return (
                    <TableRow
                      key={order.id}
                      className={cn(
                        isVoid ? "line-through opacity-50" : "",
                        isRefund ? "bg-red-50/40 dark:bg-red-950/20" : ""
                      )}
                    >
                      <TableCell className="text-sm tabular-nums">
                        {formatDayTime(order.order_datetime)}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {order.order_number ?? order.id.slice(0, 8)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{channelLabel(order.channel)}</Badge>
                      </TableCell>
                      <TableCell className="text-right text-sm tabular-nums">
                        {formatCurrency(order.gross_amount)}
                      </TableCell>
                      <TableCell className="text-right text-sm text-muted-foreground tabular-nums">
                        {formatCurrency(order.tax_amount)}
                      </TableCell>
                      <TableCell
                        className={cn(
                          "text-right text-sm font-medium tabular-nums",
                          isRefund ? "text-red-600 dark:text-red-400" : ""
                        )}
                      >
                        {isRefund ? "-" : ""}
                        {formatCurrency(order.net_amount)}
                      </TableCell>
                      <TableCell className="text-sm">
                        {paymentLabel(order.payment_method)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="rounded-sm px-1.5 py-0.5">
                          Manual
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {isVoid ? (
                          <Badge
                            variant="secondary"
                            className="rounded-sm bg-slate-100 px-1.5 py-0.5 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                          >
                            Void
                          </Badge>
                        ) : isRefund ? (
                          <Badge
                            variant="secondary"
                            className="rounded-sm bg-red-100 px-1.5 py-0.5 text-red-700 dark:bg-red-950 dark:text-red-300"
                          >
                            Refund
                          </Badge>
                        ) : (
                          <Badge
                            variant="secondary"
                            className="rounded-sm bg-emerald-100 px-1.5 py-0.5 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                          >
                            Sale
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
