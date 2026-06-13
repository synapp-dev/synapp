"use client";

import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle,
  Clock,
  FileText,
  Loader2,
  Package,
  Plus,
  Search,
  Send,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import { cn } from "@workspace/ui/lib/utils";
import { purchaseOrderKeys } from "@/entities/purchase-orders/model/keys";
import type { PoStatus } from "@/entities/purchase-orders/model/types";
import { usePurchaseOrdersQuery } from "@/entities/purchase-orders/model/use-purchase-orders-query";
import { PurchaseOrderDetailSheet } from "./purchase-order-detail-sheet";

type TabKey =
  | "all"
  | "draft"
  | "pending_approval"
  | "submitted"
  | "confirmed"
  | "overdue"
  | "delivered"
  | "closed"
  | "cancelled";

const STATUS_CONFIG: Record<
  PoStatus,
  { label: string; variant: "default" | "secondary" | "destructive"; icon: typeof Clock }
> = {
  draft: { label: "Draft", variant: "secondary", icon: Clock },
  pending_approval: { label: "Pending approval", variant: "secondary", icon: Clock },
  submitted: { label: "Submitted", variant: "default", icon: Send },
  confirmed: { label: "Confirmed", variant: "default", icon: CheckCircle },
  delivered: { label: "Delivered", variant: "default", icon: Package },
  closed: { label: "Closed", variant: "default", icon: CheckCircle },
  cancelled: { label: "Cancelled", variant: "destructive", icon: XCircle },
};

const PURCHASE_ORDER_TABS: Array<{ key: TabKey; label: string; status?: PoStatus }> = [
  { key: "all", label: "All" },
  { key: "overdue", label: "Overdue" },
  { key: "draft", label: "Draft", status: "draft" },
  { key: "pending_approval", label: "Pending approval", status: "pending_approval" },
  { key: "submitted", label: "Submitted", status: "submitted" },
  { key: "confirmed", label: "Confirmed", status: "confirmed" },
  { key: "delivered", label: "Delivered", status: "delivered" },
  { key: "closed", label: "Closed", status: "closed" },
];

function formatCurrency(cents: number): string {
  return `$${(cents / 100).toLocaleString("en-AU", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("en-AU", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));
}

type PurchaseOrdersTabProps = {
  organisation: string;
  venue: string;
  initialPoId?: string | null;
};

export function PurchaseOrdersTab({
  organisation,
  venue,
  initialPoId,
}: PurchaseOrdersTabProps) {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<TabKey>("all");
  const [selectedPoId, setSelectedPoId] = useState<string | null>(initialPoId ?? null);

  useEffect(() => {
    if (initialPoId) setSelectedPoId(initialPoId);
  }, [initialPoId]);

  const statusFilter =
    activeTab === "all" || activeTab === "overdue"
      ? "all"
      : (PURCHASE_ORDER_TABS.find((t) => t.key === activeTab)?.status ?? "all");

  const listQuery = usePurchaseOrdersQuery({
    organisation,
    venue,
    status: statusFilter,
    search: searchQuery.trim() || undefined,
  });

  const tabCounts = listQuery.data?.statusCounts ?? {};

  const filteredPOs = useMemo(() => {
    let rows = listQuery.data?.orders ?? [];
    if (activeTab === "overdue") {
      rows = rows.filter((po) => po.isOverdue);
    } else if (activeTab === "closed") {
      rows = rows.filter((po) => po.status === "closed" || po.status === "cancelled");
    }
    return rows;
  }, [listQuery.data?.orders, activeTab]);

  function invalidate() {
    void queryClient.invalidateQueries({ queryKey: purchaseOrderKeys.all });
  }

  function tabBadge(count: number) {
    if (count === 0) return null;
    return (
      <Badge variant="secondary" className="ml-1.5 h-5 min-w-[20px] px-1.5 text-[10px]">
        {count}
      </Badge>
    );
  }

  const pipelineSummary = [
    tabCounts.draft ? `${tabCounts.draft} Draft` : null,
    tabCounts.pending_approval ? `${tabCounts.pending_approval} Pending` : null,
    tabCounts.submitted ? `${tabCounts.submitted} Submitted` : null,
    tabCounts.confirmed ? `${tabCounts.confirmed} Confirmed` : null,
    tabCounts.delivered ? `${tabCounts.delivered} Delivered` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <>
      {pipelineSummary ? (
        <p className="text-muted-foreground text-xs">{pipelineSummary}</p>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search PO or supplier..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-9 w-[480px] max-w-full pl-8"
          />
        </div>
        <Button
          type="button"
          onClick={() => toast.info("Choose a supplier in the new PO sheet after selecting a supplier from Suppliers")}
        >
          <Plus className="mr-2 h-4 w-4" />
          New PO
        </Button>
      </div>

      <div className="flex flex-col gap-0">
        <div className="flex w-fit max-w-full gap-1 overflow-x-auto bg-transparent">
          {PURCHASE_ORDER_TABS.map((tab) => {
            const isSelected = activeTab === tab.key;
            const isOverdueTab = tab.key === "overdue";
            const count =
              tab.key === "overdue"
                ? (tabCounts.overdue ?? 0)
                : tab.key === "all"
                  ? (tabCounts.all ?? 0)
                  : (tabCounts[tab.key] ?? 0);

            return (
              <Button
                key={tab.key}
                type="button"
                variant="ghost"
                className={cn(
                  "h-auto w-fit gap-2 rounded-b-none px-6 py-2 text-lg font-medium",
                  isSelected
                    ? "border border-b-0 bg-muted/50 text-foreground"
                    : "border border-b-0 border-transparent text-muted-foreground",
                  isOverdueTab && count > 0 && "text-destructive"
                )}
                onClick={() => setActiveTab(tab.key)}
              >
                <span>{tab.label}</span>
                {isOverdueTab && count > 0 ? (
                  <Badge variant="destructive" className="text-[10px] text-white">
                    {count}
                  </Badge>
                ) : (
                  tabBadge(count)
                )}
              </Button>
            );
          })}
        </div>

        <div className="overflow-hidden rounded-b-md border">
          {listQuery.isLoading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading purchase orders…
            </div>
          ) : listQuery.isError ? (
            <div className="py-16 text-center text-sm text-destructive">
              {(listQuery.error as Error).message}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="pl-6 text-xs font-medium uppercase">PO #</TableHead>
                    <TableHead className="text-xs font-medium uppercase">Supplier</TableHead>
                    <TableHead className="text-xs font-medium uppercase">Order date</TableHead>
                    <TableHead className="text-xs font-medium uppercase">Expected delivery</TableHead>
                    <TableHead className="text-xs font-medium uppercase">Status</TableHead>
                    <TableHead className="text-right text-xs font-medium uppercase">Items</TableHead>
                    <TableHead className="text-right text-xs font-medium uppercase">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPOs.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        className="py-10 text-center text-sm text-muted-foreground"
                      >
                        No purchase orders yet. Run the Order Guide or create a manual PO to get
                        started.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredPOs.map((po) => {
                      const config = STATUS_CONFIG[po.status];
                      const StatusIcon = config.icon;
                      return (
                        <TableRow
                          key={po.id}
                          className={cn(
                            "h-14 cursor-pointer hover:bg-muted/50",
                            po.isOverdue && "bg-red-50/50 dark:bg-red-950/30"
                          )}
                          onClick={() => setSelectedPoId(po.id)}
                        >
                          <TableCell className="pl-6">
                            <div className="flex items-center gap-2">
                              <FileText className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium">{po.poNumber}</span>
                            </div>
                          </TableCell>
                          <TableCell>{po.supplierName}</TableCell>
                          <TableCell>{formatDate(po.createdAt.slice(0, 10))}</TableCell>
                          <TableCell>
                            <span className={po.isOverdue ? "font-semibold text-red-600" : ""}>
                              {formatDate(po.expectedDeliveryDate)}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Badge variant={config.variant}>
                              <StatusIcon className="mr-1 h-3 w-3" />
                              {config.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge variant="outline">{po.itemCount}</Badge>
                          </TableCell>
                          <TableCell className="text-right font-semibold">
                            {formatCurrency(po.totalCents)}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </div>

      <PurchaseOrderDetailSheet
        organisation={organisation}
        venue={venue}
        poId={selectedPoId}
        open={Boolean(selectedPoId)}
        onOpenChange={(open) => {
          if (!open) setSelectedPoId(null);
        }}
        onUpdated={invalidate}
      />
    </>
  );
}
