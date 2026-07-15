"use client";

import { useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Download,
  FileSpreadsheet,
  RefreshCw,
  Search,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Input } from "@workspace/ui/components/input";
import { Skeleton } from "@workspace/ui/components/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import { cn } from "@workspace/ui/lib/utils";
import { SalesOrderDetailSheet } from "@/entities/sales-insights/components/sales-order-detail-sheet";
import { SalesTabPageHeader } from "@/entities/sales-insights/components/sales-tab-page-header";
import {
  channelLabel,
  formatCurrency,
  formatDayTime,
  paymentLabel,
  sourceLabel,
  statusLabel,
} from "@/entities/sales-insights/lib/sales-format";
import { useSalesInsightsBase } from "@/entities/sales-insights/model/use-sales-insights-base";
import { toDateInputValue } from "@/entities/insights/lib/period";
import type {
  SalesOrderRow,
  SortDir,
  SortField,
} from "@/entities/sales-insights/model/types";

type SalesTransactionsPageClientProps = {
  organisation: string;
  venue: string;
};

/** Transactions shown on the page; the full filtered list is still exported to CSV. */
const MAX_VISIBLE_ORDERS = 100;

function formatCsvDateTime(value: string): string {
  const date = new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day} ${hour}:${minute}`;
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

function StatusDot({ order }: { order: SalesOrderRow }) {
  const status = statusLabel(order);
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium">
      <span
        aria-hidden
        className={cn(
          "size-1.5 shrink-0 rounded-full",
          status === "Sale" && "bg-emerald-500",
          status === "Refund" && "bg-rose-500",
          status === "Void" && "bg-slate-400",
        )}
      />
      {status}
    </span>
  );
}

export function SalesTransactionsPageClient({
  organisation,
  venue,
}: SalesTransactionsPageClientProps) {
  const { dateRange, orders, meta, contentLoading, query } =
    useSalesInsightsBase({ organisation, venue });

  const [channelFilter, setChannelFilter] = useState("all");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<SortField>("order_datetime");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [detailOrder, setDetailOrder] = useState<SalesOrderRow | null>(null);

  const channels = useMemo(() => {
    return [...new Set(orders.map((order) => order.channel))].sort();
  }, [orders]);

  const paymentMethods = useMemo(() => {
    return [
      ...new Set(orders.map((order) => order.payment_method ?? "unknown")),
    ].sort();
  }, [orders]);

  const filteredOrders = useMemo(() => {
    let result = orders;

    if (channelFilter !== "all") {
      result = result.filter((order) => order.channel === channelFilter);
    }

    if (paymentFilter !== "all") {
      result = result.filter(
        (order) => (order.payment_method ?? "unknown") === paymentFilter,
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
          compareValue = (left.order_number ?? "").localeCompare(
            right.order_number ?? "",
          );
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
            right.payment_method ?? "",
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

  const visibleOrders = useMemo(
    () => filteredOrders.slice(0, MAX_VISIBLE_ORDERS),
    [filteredOrders],
  );

  const hasActiveFilters =
    channelFilter !== "all" ||
    paymentFilter !== "all" ||
    searchQuery.trim().length > 0;

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
      dateRange.end,
    )}.csv`;
    link.click();
    URL.revokeObjectURL(csvUrl);

    toast.success(`Exported ${filteredOrders.length} transactions`);
  }

  return (
    <section className="space-y-4">
      <SalesTabPageHeader
        title="Transactions"
        description="Every payment in the selected period. Search, filter, and export the lot."
        actions={
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 text-xs"
            onClick={handleExportCsv}
          >
            <Download className="h-3.5 w-3.5" />
            Export CSV
          </Button>
        }
      />

      <Card className="gap-0 py-0">
        <CardHeader className="flex flex-wrap items-start justify-between gap-2 border-b px-5 py-4 [.border-b]:pb-4">
          <div className="space-y-1">
            <CardTitle className="text-base">Transactions</CardTitle>
            <CardDescription className="text-xs leading-relaxed">
              {contentLoading
                ? "Loading transactions…"
                : `${filteredOrders.length.toLocaleString("en-AU")} of ${orders.length.toLocaleString("en-AU")} in the selected period${
                    filteredOrders.length > MAX_VISIBLE_ORDERS
                      ? ` · latest ${MAX_VISIBLE_ORDERS} shown, export CSV for all`
                      : ""
                  }.`}
            </CardDescription>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 shrink-0 gap-1.5 text-xs"
            onClick={() => {
              void query.refetch();
            }}
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </Button>
        </CardHeader>

        <CardContent className="flex flex-wrap items-center gap-2 border-b px-5 py-3">
          <div className="relative min-w-[150px] max-w-sm flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search order #..."
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="h-8 w-full pl-8"
            />
          </div>

          <Select value={channelFilter} onValueChange={setChannelFilter}>
            <SelectTrigger className="h-8 w-[118px] text-xs">
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
            <SelectTrigger className="h-8 w-[126px] text-xs">
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
            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-1 text-xs"
              onClick={clearFilters}
            >
              <X className="h-3.5 w-3.5" />
              Clear
            </Button>
          ) : null}
        </CardContent>

        <CardContent className="px-0 py-0">
          {contentLoading ? (
            <div className="divide-y">
              {Array.from({ length: 10 }).map((_, index) => (
                <div
                  key={index}
                  className="flex animate-slide-up-fade-in items-center justify-between gap-4 px-5 py-[13px]"
                  style={{ animationDelay: `${index * 55}ms` }}
                >
                  <Skeleton className="h-4 w-24 rounded" />
                  <Skeleton className="h-4 w-40 flex-1 rounded" />
                  <Skeleton className="h-4 w-16 rounded" />
                  <Skeleton className="h-4 w-12 rounded" />
                </div>
              ))}
            </div>
          ) : visibleOrders.length === 0 ? (
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
            <div className="max-h-[68vh] overflow-y-auto rounded-b-xl">
              {/* Raw <table> (not the wrapped Table component) so the sticky
                  header pins to this scroll container, not an inner one. */}
              <table className="w-full caption-bottom text-sm">
                <TableHeader className="sticky top-0 z-10 bg-card shadow-[inset_0_-1px_0_0_var(--border)] [&_tr]:border-b-0">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="pl-5">
                      <button
                        className="flex items-center text-xs font-medium"
                        onClick={() => handleSort("order_datetime")}
                      >
                        Time
                        <SortIcon
                          sortField={sortField}
                          sortDir={sortDir}
                          field="order_datetime"
                        />
                      </button>
                    </TableHead>
                    <TableHead>
                      <button
                        className="flex items-center text-xs font-medium"
                        onClick={() => handleSort("order_number")}
                      >
                        Order #
                        <SortIcon
                          sortField={sortField}
                          sortDir={sortDir}
                          field="order_number"
                        />
                      </button>
                    </TableHead>
                    <TableHead>
                      <button
                        className="flex items-center text-xs font-medium"
                        onClick={() => handleSort("channel")}
                      >
                        Channel
                        <SortIcon
                          sortField={sortField}
                          sortDir={sortDir}
                          field="channel"
                        />
                      </button>
                    </TableHead>
                    <TableHead>
                      <button
                        className="flex items-center text-xs font-medium"
                        onClick={() => handleSort("payment_method")}
                      >
                        Payment
                        <SortIcon
                          sortField={sortField}
                          sortDir={sortDir}
                          field="payment_method"
                        />
                      </button>
                    </TableHead>
                    <TableHead className="text-right">
                      <button
                        className="ml-auto flex items-center justify-end text-xs font-medium"
                        onClick={() => handleSort("gross_amount")}
                      >
                        Gross
                        <SortIcon
                          sortField={sortField}
                          sortDir={sortDir}
                          field="gross_amount"
                        />
                      </button>
                    </TableHead>
                    <TableHead className="text-right">
                      <button
                        className="ml-auto flex items-center justify-end text-xs font-medium"
                        onClick={() => handleSort("net_amount")}
                      >
                        Net
                        <SortIcon
                          sortField={sortField}
                          sortDir={sortDir}
                          field="net_amount"
                        />
                      </button>
                    </TableHead>
                    <TableHead className="pr-5 text-right">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visibleOrders.map((order) => {
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
                          isRefund ? "bg-rose-50/40 dark:bg-rose-950/20" : "",
                        )}
                        onClick={() => setDetailOrder(order)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            setDetailOrder(order);
                          }
                        }}
                      >
                        <TableCell className="whitespace-nowrap pl-5 text-sm tabular-nums">
                          {formatDayTime(order.order_datetime)}
                        </TableCell>
                        <TableCell className="max-w-0 lg:w-full">
                          <span className="block truncate font-mono text-xs text-muted-foreground">
                            {order.order_number ?? order.id.slice(0, 8)}
                          </span>
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-xs">
                          {channelLabel(order.channel)}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-xs">
                          {paymentLabel(order.payment_method)}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-right text-sm tabular-nums">
                          {formatCurrency(order.gross_amount)}
                        </TableCell>
                        <TableCell
                          className={cn(
                            "whitespace-nowrap text-right text-sm font-medium tabular-nums",
                            isRefund ? "text-rose-600 dark:text-rose-400" : "",
                          )}
                        >
                          {isRefund ? "-" : ""}
                          {formatCurrency(order.net_amount)}
                        </TableCell>
                        <TableCell className="whitespace-nowrap pr-5 text-right">
                          <StatusDot order={order} />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <SalesOrderDetailSheet
        order={detailOrder}
        onOpenChange={(open) => {
          if (!open) setDetailOrder(null);
        }}
      />
    </section>
  );
}
