"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  BarChart3,
  Download,
  ExternalLink,
  FileSpreadsheet,
  Receipt,
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
import { Separator } from "@workspace/ui/components/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@workspace/ui/components/sheet";
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
import { useSquareInvoicesQuery } from "@/entities/sales-insights/model/useSquareInvoicesQuery";
import type {
  DatePreset,
  SalesDateRange,
  SalesMixRow,
  SalesOrderRow,
  SalesOrderSource,
  SortDir,
  SortField,
  SquareInvoiceRow,
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

function formatSquareMoney(
  m: { amount?: number; currency?: string } | undefined
): string {
  if (!m || typeof m.amount !== "number") return "—";
  const cur = m.currency?.toUpperCase();
  if (cur && cur.length === 3) {
    try {
      return (m.amount / 100).toLocaleString("en-AU", {
        style: "currency",
        currency: cur,
        minimumFractionDigits: 2,
      });
    } catch {
      /* invalid currency code */
    }
  }
  return formatCurrency(m.amount);
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
    pos: "POS",
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

function sourceLabel(source: SalesOrderSource | undefined): string {
  if (source === "square") return "Square";
  if (source === "demo") return "Demo";
  return "Manual";
}

function squareInvoiceStatusLabel(status: string): string {
  if (!status) {
    return "Unknown";
  }
  return status
    .split("_")
    .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
    .join(" ");
}

function formatInvoiceDueAmount(row: SquareInvoiceRow): string {
  if (row.next_payment_amount_cents == null) {
    return "—";
  }
  const cur = row.next_payment_currency?.toUpperCase();
  if (cur && cur.length === 3) {
    try {
      return (row.next_payment_amount_cents / 100).toLocaleString("en-AU", {
        style: "currency",
        currency: cur,
        minimumFractionDigits: 2,
      });
    } catch {
      /* invalid currency */
    }
  }
  return formatCurrency(row.next_payment_amount_cents);
}

function formatDetailDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat("en-AU", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function DetailField({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1">
      <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">{label}</p>
      <div className="text-sm break-words">{children}</div>
    </div>
  );
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

function mixLineDetailKey(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function SalesMixItemCell({ row }: { row: SalesMixRow }) {
  const variation = row.squareVariationName?.trim() ?? "";
  const catalog = row.squareCatalogObjectId?.trim() ?? "";
  const receiptDiffers =
    !row.mapped &&
    row.squareLineName &&
    mixLineDetailKey(row.squareLineName) !== mixLineDetailKey(row.label);

  const hasSecondary = Boolean(variation || catalog || receiptDiffers || (!row.mapped && !catalog));

  return (
    <TableCell className="max-w-[min(300px,42vw)] align-top">
      <div className="text-sm leading-snug font-medium break-words">{row.label}</div>
      {hasSecondary ? (
        <div className="text-muted-foreground mt-1.5 space-y-1 text-[11px] leading-snug">
          {variation ? (
            <p>
              <span className="font-medium text-foreground/70">Variation</span>{" "}
              <span className="break-words">{variation}</span>
            </p>
          ) : null}
          {catalog ? (
            <p className="font-mono text-[10px] tracking-tight break-all">{catalog}</p>
          ) : !row.mapped ? (
            <p className="text-[10px] italic">No Square catalog id</p>
          ) : null}
          {receiptDiffers ? (
            <p className="break-words">
              <span className="font-medium text-foreground/70">Receipt line</span>{" "}
              {row.squareLineName}
            </p>
          ) : null}
        </div>
      ) : null}
    </TableCell>
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
  const [detailOrder, setDetailOrder] = useState<SalesOrderRow | null>(null);

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

  const { data: payload, isPending, refetch } = useSalesInsightsQuery({
    organisationSlug: organisation,
    venueSlug: venue,
    dateRange,
  });

  const {
    data: invoicesPayload,
    isPending: invoicesPending,
    refetch: refetchInvoices,
  } = useSquareInvoicesQuery({
    organisationSlug: organisation,
    venueSlug: venue,
    dateRange,
  });

  const orders = payload?.orders ?? [];
  const meta = payload?.meta;
  const salesMix: SalesMixRow[] = payload?.salesMix ?? [];
  const invoices = invoicesPayload?.invoices ?? [];
  const invoiceMeta = invoicesPayload?.meta;

  useEffect(() => {
    if (meta?.squareError) {
      toast.error("Could not load Square payments", {
        description: meta.squareError,
        duration: 12_000,
      });
    }
  }, [meta?.squareError]);

  useEffect(() => {
    if (meta?.squareOrdersError) {
      toast.error("Could not load Square order lines", {
        description: meta.squareOrdersError,
        duration: 14_000,
      });
    }
  }, [meta?.squareOrdersError]);

  useEffect(() => {
    if (invoiceMeta?.squareInvoicesError) {
      toast.error("Could not load Square invoices", {
        description: invoiceMeta.squareInvoicesError,
        duration: 14_000,
      });
    }
  }, [invoiceMeta?.squareInvoicesError]);

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

    const header =
      "Date/Time,Order #,Channel,Gross,Tax,Discount,Net,Payment,Source,Status";
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
        sourceLabel(order.source).toLowerCase(),
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

  const integrationHref = `/${organisation}/${venue}/settings/integrations`;

  const squareConnectHref = useMemo(() => {
    const nextPath = `/${organisation}/${venue}/insights/sales`;
    return `/api/square/oauth/authorize?organisation=${encodeURIComponent(organisation)}&venue=${encodeURIComponent(venue)}&next=${encodeURIComponent(nextPath)}`;
  }, [organisation, venue]);

  const squareIntegrationNeedsAttention = useMemo(() => {
    if (isPending || !meta) {
      return false;
    }
    if (meta.dataSource === "demo") {
      return true;
    }
    if (meta.dataSource === "square" && (meta.squareError || meta.squareOrdersError)) {
      return true;
    }
    return false;
  }, [isPending, meta]);

  const squareConnectPrimaryLabel =
    meta?.dataSource === "square" && (meta.squareError || meta.squareOrdersError)
      ? "Reconnect Square"
      : "Connect Square";

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">Sales Insights</h1>
            {meta?.dataSource === "square" ? (
              <Badge variant="secondary" className="text-xs font-normal">
                Square payments
              </Badge>
            ) : (
              <Badge variant="outline" className="text-muted-foreground text-xs font-normal">
                Demo data
              </Badge>
            )}
          </div>
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

      {squareIntegrationNeedsAttention ? (
        <Card className="border-primary/25 bg-muted/50">
          <CardContent className="flex flex-col gap-4 py-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 space-y-2">
              <p className="text-sm font-medium">
                {meta?.dataSource === "demo"
                  ? "Square is not connected for this venue"
                  : "Square could not load sales data"}
              </p>
              <p className="text-muted-foreground text-xs">
                {meta?.dataSource === "demo"
                  ? "You are seeing demo transactions. Organisation admins can connect Square POS to load real sales for this venue."
                  : "Your venue may be missing a valid Square link, location, or API access. Reconnect Square from this page or review venue settings."}
              </p>
              {meta?.dataSource === "square" && (meta.squareError || meta.squareOrdersError) ? (
                <ul className="text-destructive list-inside list-disc text-xs">
                  {meta.squareError ? <li>{meta.squareError}</li> : null}
                  {meta.squareOrdersError ? <li>{meta.squareOrdersError}</li> : null}
                </ul>
              ) : null}
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              <Button asChild>
                <a href={squareConnectHref}>{squareConnectPrimaryLabel}</a>
              </Button>
              <Button variant="outline" asChild>
                <Link href={integrationHref}>Square settings</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

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
              onClick={() => {
                void refetch();
                void refetchInvoices();
              }}
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
          <div className="mb-3 space-y-1">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold">Sales Mix</h3>
            </div>
            <p className="text-muted-foreground max-w-3xl text-xs leading-relaxed">
              The same label can appear on multiple rows when Square has different catalog items or
              variations (for example two bottle sizes). Details under each name show how rows differ;
              map catalog links in venue settings to combine them under one menu line.
            </p>
          </div>
          {salesMix.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="text-xs font-medium">Item</TableHead>
                  <TableHead className="text-right text-xs font-medium">Qty</TableHead>
                  <TableHead className="text-right text-xs font-medium">Revenue</TableHead>
                  <TableHead className="text-xs font-medium">Map</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {salesMix.map((row) => (
                  <TableRow key={row.mixKey}>
                    <SalesMixItemCell row={row} />
                    <TableCell className="text-right text-sm tabular-nums">
                      {row.quantity.toLocaleString("en-AU", { maximumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-right text-sm tabular-nums">
                      {formatCurrency(row.revenueCents)}
                    </TableCell>
                    <TableCell>
                      {row.mapped ? (
                        <Badge
                          variant="secondary"
                          className="rounded-sm bg-emerald-100 px-1.5 py-0.5 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200"
                        >
                          Mapped
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-muted-foreground rounded-sm text-xs">
                          Unmapped
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="rounded-lg border border-dashed p-6 text-center">
              <BarChart3 className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
              {meta?.dataSource === "square" ? (
                <>
                  <p className="text-sm font-medium">No line-level sales in this range</p>
                  <p className="mt-1 mb-3 text-xs text-muted-foreground">
                    Payments need a Square <code className="text-xs">order_id</code> so we can load
                    line items. Map catalog ids to your menu in settings for labelled mix.
                  </p>
                </>
              ) : (
                <>
                  <p className="text-sm font-medium">Demo mix appears when line items exist</p>
                  <p className="mt-1 mb-3 text-xs text-muted-foreground">
                    Connect Square to load real order lines; use venue settings to map Square catalog
                    ids to your menu.
                  </p>
                </>
              )}
              <Link
                href={integrationHref}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Open settings
              </Link>
            </div>
          )}
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
                  ? meta?.dataSource === "square"
                    ? "No Square payments in this date range (or check the toast if the API failed)."
                    : "No sales data for this period."
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
                      role="button"
                      tabIndex={0}
                      className={cn(
                        "cursor-pointer hover:bg-muted/60",
                        isVoid ? "line-through opacity-50" : "",
                        isRefund ? "bg-red-50/40 dark:bg-red-950/20" : ""
                      )}
                      onClick={() => setDetailOrder(order)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          setDetailOrder(order);
                        }
                      }}
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
                          {sourceLabel(order.source)}
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

      <Card>
        <CardHeader className="border-b pb-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Receipt className="h-5 w-5 text-muted-foreground" />
                Square invoices
              </CardTitle>
              <CardDescription>
                Published Square invoices (excludes drafts) with created date in the range above.
                Requires Square OAuth scope INVOICES_READ; reconnect Square after scopes change.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-0 py-0">
          {invoicesPending ? (
            <div className="flex h-40 items-center justify-center text-muted-foreground">
              <RefreshCw className="mr-2 h-5 w-5 animate-spin" />
              Loading invoices...
            </div>
          ) : invoiceMeta?.dataSource === "demo" ? (
            <div className="flex flex-col items-center gap-3 px-6 py-8 text-center text-sm text-muted-foreground">
              <p>
                Connect Square for this venue to load invoices that have been published to customers
                in this period.
              </p>
              <Button asChild size="sm">
                <a href={squareConnectHref}>Connect Square</a>
              </Button>
            </div>
          ) : invoiceMeta?.squareInvoicesError ? (
            <div className="flex flex-col items-center gap-3 px-6 py-8 text-center">
              <p className="text-sm text-destructive">{invoiceMeta.squareInvoicesError}</p>
              {invoiceMeta.dataSource === "square" ? (
                <Button asChild size="sm">
                  <a href={squareConnectHref}>Reconnect Square</a>
                </Button>
              ) : null}
            </div>
          ) : invoices.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 px-6 py-10 text-center">
              <Receipt className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm font-medium">No published Square invoices in this range</p>
              <p className="text-xs text-muted-foreground">
                Invoices must be published (not draft) and created within the selected dates.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="text-xs font-medium">Created</TableHead>
                  <TableHead className="text-xs font-medium">Invoice #</TableHead>
                  <TableHead className="text-xs font-medium">Title</TableHead>
                  <TableHead className="text-xs font-medium">Status</TableHead>
                  <TableHead className="text-right text-xs font-medium">Amount due</TableHead>
                  <TableHead className="text-xs font-medium">Customer</TableHead>
                  <TableHead className="text-xs font-medium">Pay</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((inv) => (
                  <TableRow key={inv.id}>
                    <TableCell className="text-sm tabular-nums">
                      {formatDayTime(inv.created_at)}
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {inv.invoice_number ?? inv.id.slice(0, 8)}
                    </TableCell>
                    <TableCell className="max-w-[200px] text-sm break-words">
                      {inv.title ?? "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs font-normal">
                        {squareInvoiceStatusLabel(inv.status)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right text-sm tabular-nums">
                      {formatInvoiceDueAmount(inv)}
                    </TableCell>
                    <TableCell className="max-w-[160px] text-sm break-words">
                      {inv.customer_label ?? "—"}
                    </TableCell>
                    <TableCell>
                      {inv.public_url ? (
                        <a
                          href={inv.public_url}
                          className="text-primary inline-flex items-center gap-1 text-xs font-medium underline underline-offset-2"
                          rel="noopener noreferrer"
                          target="_blank"
                        >
                          Open
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Sheet
        open={detailOrder !== null}
        onOpenChange={(open) => {
          if (!open) setDetailOrder(null);
        }}
      >
        <SheetContent
          side="right"
          className="flex w-full flex-col gap-0 overflow-y-auto sm:max-w-lg"
        >
          {detailOrder ? (
            <>
              <SheetHeader className="space-y-1 border-b pb-4 text-left">
                <SheetTitle>Transaction</SheetTitle>
                <SheetDescription>
                  {sourceLabel(detailOrder.source)} · {statusLabel(detailOrder)}
                </SheetDescription>
              </SheetHeader>

              <div className="flex flex-col gap-6 py-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <DetailField label="Date & time">
                    {formatDetailDateTime(detailOrder.order_datetime)}
                  </DetailField>
                  <DetailField label="Source">{sourceLabel(detailOrder.source)}</DetailField>
                  <DetailField label="Order / reference #">
                    {detailOrder.order_number ?? "—"}
                  </DetailField>
                  <DetailField label="Internal id">
                    <span className="font-mono text-xs">{detailOrder.id}</span>
                  </DetailField>
                  <DetailField label="Channel">{channelLabel(detailOrder.channel)}</DetailField>
                  <DetailField label="Payment method">
                    {paymentLabel(detailOrder.payment_method)}
                  </DetailField>
                </div>

                <Separator />

                <div>
                  <p className="text-muted-foreground mb-3 text-xs font-medium uppercase tracking-wide">
                    Amounts (app view)
                  </p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <DetailField label="Gross">{formatCurrency(detailOrder.gross_amount)}</DetailField>
                    <DetailField label="Tax">{formatCurrency(detailOrder.tax_amount)}</DetailField>
                    <DetailField label="Discount">
                      {formatCurrency(detailOrder.discount_amount)}
                    </DetailField>
                    <DetailField label="Net">{formatCurrency(detailOrder.net_amount)}</DetailField>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <DetailField label="Void">{detailOrder.is_void ? "Yes" : "No"}</DetailField>
                  <DetailField label="Refund">{detailOrder.is_refund ? "Yes" : "No"}</DetailField>
                  {detailOrder.refund_reason ? (
                    <DetailField label="Refund reason">{detailOrder.refund_reason}</DetailField>
                  ) : null}
                </div>

                {detailOrder.square ? (
                  <>
                    <Separator />
                    <div>
                      <p className="text-muted-foreground mb-3 text-xs font-medium uppercase tracking-wide">
                        Square payment
                      </p>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <DetailField label="Payment id">
                          <span className="font-mono text-xs">
                            {detailOrder.square.squarePaymentId}
                          </span>
                        </DetailField>
                        <DetailField label="API status">
                          {detailOrder.square.status ?? "—"}
                        </DetailField>
                        <DetailField label="Source type">
                          {detailOrder.square.sourceType ?? "—"}
                        </DetailField>
                        <DetailField label="Location id">
                          {detailOrder.square.locationId ? (
                            <span className="font-mono text-xs">
                              {detailOrder.square.locationId}
                            </span>
                          ) : (
                            "—"
                          )}
                        </DetailField>
                        <DetailField label="Order id (Square)">
                          {detailOrder.square.orderId ? (
                            <span className="font-mono text-xs">{detailOrder.square.orderId}</span>
                          ) : (
                            "—"
                          )}
                        </DetailField>
                        <DetailField label="Customer id">
                          {detailOrder.square.customerId ? (
                            <span className="font-mono text-xs">
                              {detailOrder.square.customerId}
                            </span>
                          ) : (
                            "—"
                          )}
                        </DetailField>
                        <DetailField label="Reference id">
                          {detailOrder.square.referenceId ?? "—"}
                        </DetailField>
                        <DetailField label="Receipt #">
                          {detailOrder.square.receiptNumber ?? "—"}
                        </DetailField>
                        <DetailField label="Created (API)">
                          {detailOrder.square.createdAt
                            ? formatDetailDateTime(detailOrder.square.createdAt)
                            : "—"}
                        </DetailField>
                        <DetailField label="Updated (API)">
                          {detailOrder.square.updatedAt
                            ? formatDetailDateTime(detailOrder.square.updatedAt)
                            : "—"}
                        </DetailField>
                        <DetailField label="Amount money">
                          {formatSquareMoney(detailOrder.square.amountMoney)}
                        </DetailField>
                        <DetailField label="Total money">
                          {formatSquareMoney(detailOrder.square.totalMoney)}
                        </DetailField>
                        <DetailField label="Refunded money">
                          {formatSquareMoney(detailOrder.square.refundedMoney)}
                        </DetailField>
                        {detailOrder.square.note ? (
                          <DetailField label="Note">{detailOrder.square.note}</DetailField>
                        ) : null}
                        {detailOrder.square.receiptUrl ? (
                          <div className="sm:col-span-2">
                            <DetailField label="Receipt">
                              <a
                                href={detailOrder.square.receiptUrl}
                                className="text-primary inline-flex items-center gap-1 font-medium underline underline-offset-2"
                                rel="noopener noreferrer"
                                target="_blank"
                              >
                                Open in Square
                                <ExternalLink className="h-3.5 w-3.5" />
                              </a>
                            </DetailField>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </>
                ) : null}
                {detailOrder.saleLineItems?.length ? (
                  <>
                    <Separator />
                    <div>
                      <p className="text-muted-foreground mb-3 text-xs font-medium uppercase tracking-wide">
                        {detailOrder.source === "demo" ? "Demo line items" : "Order line items"}
                      </p>
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/50">
                            <TableHead className="text-xs">Item</TableHead>
                            <TableHead className="text-right text-xs">Qty</TableHead>
                            <TableHead className="text-right text-xs">Line $</TableHead>
                            {detailOrder.source === "square" ? (
                              <TableHead className="text-xs">Map</TableHead>
                            ) : null}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {detailOrder.saleLineItems.map((li) => (
                            <TableRow key={li.lineUid}>
                              <TableCell className="max-w-[200px] text-sm break-words">
                                {li.menuItemName ?? li.lineName}
                                {li.squareVariationName ? (
                                  <span className="text-muted-foreground mt-0.5 block text-[10px]">
                                    Variation: {li.squareVariationName}
                                  </span>
                                ) : null}
                                {detailOrder.source === "square" && li.squareCatalogObjectId ? (
                                  <span className="text-muted-foreground mt-0.5 block font-mono text-[10px]">
                                    {li.squareCatalogObjectId}
                                  </span>
                                ) : null}
                              </TableCell>
                              <TableCell className="text-right text-sm tabular-nums">
                                {li.quantity.toLocaleString("en-AU", {
                                  maximumFractionDigits: 2,
                                })}
                              </TableCell>
                              <TableCell className="text-right text-sm tabular-nums">
                                {formatCurrency(li.grossAmountCents)}
                              </TableCell>
                              {detailOrder.source === "square" ? (
                                <TableCell className="text-xs capitalize text-muted-foreground">
                                  {li.matchSource.replaceAll("_", " ")}
                                </TableCell>
                              ) : null}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </>
                ) : null}
              </div>
            </>
          ) : null}
        </SheetContent>
      </Sheet>
    </section>
  );
}
