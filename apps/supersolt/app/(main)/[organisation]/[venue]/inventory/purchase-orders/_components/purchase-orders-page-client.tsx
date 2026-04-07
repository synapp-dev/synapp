"use client";

import { useMemo, useState } from "react";
import {
  CheckCircle,
  Clock,
  FileText,
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
import { Separator } from "@workspace/ui/components/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@workspace/ui/components/table";
import { cn } from "@workspace/ui/lib/utils";

type PurchaseOrdersPageClientProps = {
  organisation: string;
  venue: string;
};

type POStatus = "draft" | "submitted" | "confirmed" | "delivered" | "cancelled";
type TabKey = "all" | "draft" | "submitted" | "overdue" | "delivered" | "closed";

type PurchaseOrder = {
  id: string;
  poNumber: string;
  supplierName: string;
  orderDate: string;
  expectedDelivery: string;
  status: POStatus;
  itemCount: number;
  total: number;
};

const STATUS_CONFIG: Record<POStatus, { label: string; variant: "default" | "secondary" | "destructive"; icon: typeof Clock }> = {
  draft: { label: "Draft", variant: "secondary", icon: Clock },
  submitted: { label: "Submitted", variant: "default", icon: Send },
  confirmed: { label: "Confirmed", variant: "default", icon: CheckCircle },
  delivered: { label: "Delivered", variant: "default", icon: Package },
  cancelled: { label: "Cancelled", variant: "destructive", icon: XCircle },
};

const SEED_POS: PurchaseOrder[] = [
  {
    id: "po1",
    poNumber: "PO-1250",
    supplierName: "FreshCo Produce",
    orderDate: "2026-03-17",
    expectedDelivery: "2026-03-21",
    status: "submitted",
    itemCount: 8,
    total: 48600,
  },
  {
    id: "po2",
    poNumber: "PO-1249",
    supplierName: "FreshCo Produce",
    orderDate: "2026-03-10",
    expectedDelivery: "2026-03-14",
    status: "submitted",
    itemCount: 6,
    total: 32400,
  },
  {
    id: "po3",
    poNumber: "PO-1248",
    supplierName: "MeatWorks",
    orderDate: "2026-03-15",
    expectedDelivery: "2026-03-19",
    status: "draft",
    itemCount: 4,
    total: 128500,
  },
  {
    id: "po4",
    poNumber: "PO-1247",
    supplierName: "MeatWorks",
    orderDate: "2026-03-12",
    expectedDelivery: "2026-03-16",
    status: "delivered",
    itemCount: 6,
    total: 156200,
  },
  {
    id: "po5",
    poNumber: "PO-1246",
    supplierName: "Pacific Seafood",
    orderDate: "2026-03-14",
    expectedDelivery: "2026-03-18",
    status: "confirmed",
    itemCount: 3,
    total: 89400,
  },
  {
    id: "po6",
    poNumber: "PO-1245",
    supplierName: "Dairy Direct",
    orderDate: "2026-03-11",
    expectedDelivery: "2026-03-15",
    status: "delivered",
    itemCount: 5,
    total: 21800,
  },
  {
    id: "po7",
    poNumber: "PO-1244",
    supplierName: "Pacific Seafood",
    orderDate: "2026-03-07",
    expectedDelivery: "2026-03-10",
    status: "cancelled",
    itemCount: 2,
    total: 45600,
  },
  {
    id: "po8",
    poNumber: "PO-1243",
    supplierName: "FreshCo Produce",
    orderDate: "2026-03-05",
    expectedDelivery: "2026-03-08",
    status: "delivered",
    itemCount: 7,
    total: 38900,
  },
];

function formatCurrency(cents: number): string {
  return `$${(cents / 100).toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(iso: string): string {
  const date = new Date(iso);
  return new Intl.DateTimeFormat("en-AU", { day: "2-digit", month: "short", year: "numeric" }).format(date);
}

function isOverdue(po: PurchaseOrder): boolean {
  if (po.status === "delivered" || po.status === "cancelled" || po.status === "draft") return false;
  return new Date(po.expectedDelivery) < new Date();
}

function isClosed(po: PurchaseOrder): boolean {
  return po.status === "delivered" || po.status === "cancelled";
}

const PURCHASE_ORDER_TABS: Array<{ key: TabKey; label: string }> = [
  { key: "all", label: "All" },
  { key: "overdue", label: "Overdue" },
  { key: "draft", label: "Draft" },
  { key: "submitted", label: "Submitted" },
  { key: "delivered", label: "Delivered" },
  { key: "closed", label: "Closed" },
];

export function PurchaseOrdersPageClient({ organisation, venue }: PurchaseOrdersPageClientProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<TabKey>("all");

  const tabCounts = useMemo(() => {
    const counts = { all: 0, draft: 0, submitted: 0, overdue: 0, delivered: 0, closed: 0 };
    for (const po of SEED_POS) {
      counts.all++;
      if (po.status === "draft") counts.draft++;
      if (po.status === "submitted" || po.status === "confirmed") counts.submitted++;
      if (isOverdue(po)) counts.overdue++;
      if (po.status === "delivered") counts.delivered++;
      if (isClosed(po)) counts.closed++;
    }
    return counts;
  }, []);

  const filteredPOs = useMemo(() => {
    let result = SEED_POS;

    switch (activeTab) {
      case "draft":
        result = result.filter((po) => po.status === "draft");
        break;
      case "submitted":
        result = result.filter((po) => po.status === "submitted" || po.status === "confirmed");
        break;
      case "overdue":
        result = result.filter((po) => isOverdue(po));
        break;
      case "delivered":
        result = result.filter((po) => po.status === "delivered");
        break;
      case "closed":
        result = result.filter((po) => isClosed(po));
        break;
      case "all":
        break;
      default: {
        const neverTab: never = activeTab;
        return neverTab;
      }
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (po) =>
          po.poNumber.toLowerCase().includes(q) || po.supplierName.toLowerCase().includes(q)
      );
    }

    return [...result].sort(
      (a, b) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime()
    );
  }, [activeTab, searchQuery]);

  function tabBadge(count: number) {
    if (count === 0) return null;
    return (
      <Badge variant="secondary" className="ml-1.5 h-5 min-w-[20px] px-1.5 text-[10px]">
        {count}
      </Badge>
    );
  }

  return (
    <section className="flex min-h-[calc(100vh-10rem)] flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="inline-flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <FileText className="h-5 w-5 text-muted-foreground" />
          Purchase Orders
        </h1>
      </div>
      <Separator />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search PO or supplier..."
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            className="h-9 w-[480px] max-w-full pl-8"
          />
        </div>
       
      </div>

      <div className="flex flex-col gap-0">
        <div className="flex w-fit max-w-full gap-1 overflow-x-auto bg-transparent">
          {PURCHASE_ORDER_TABS.map((tab) => {
            const isSelected = activeTab === tab.key;
            const isOverdueTab = tab.key === "overdue";
            const overdueCount = tabCounts.overdue;
            const count = tabCounts[tab.key];

            return (
              <Button
                key={tab.key}
                type="button"
                variant="ghost"
                className={cn(
                  "h-auto w-fit gap-2 rounded-b-none px-6 py-2 text-lg font-medium justify-between flex",
                  isSelected
                    ? "border border-b-0 bg-muted/50 text-foreground hover:bg-muted/50"
                    : "border border-b-0 border-transparent bg-transparent text-muted-foreground hover:bg-transparent",
                  isOverdueTab &&
                    overdueCount > 0 &&
                    (isSelected
                      ? "text-destructive hover:text-destructive"
                      : "text-destructive/90 hover:text-destructive")
                )}
                onClick={() => setActiveTab(tab.key)}
                aria-pressed={isSelected}
              >
                <span>{tab.label}</span>
                {isOverdueTab && count > 0 ? (
                  <Badge
                    variant="destructive"
                    className="ml-1.5 h-5 min-w-[20px] px-1.5 text-[10px] text-white"
                  >
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
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="pl-6 text-xs font-medium uppercase tracking-wider">PO #</TableHead>
                  <TableHead className="text-xs font-medium uppercase tracking-wider">Supplier</TableHead>
                  <TableHead className="text-xs font-medium uppercase tracking-wider">Order Date</TableHead>
                  <TableHead className="text-xs font-medium uppercase tracking-wider">Expected Delivery</TableHead>
                  <TableHead className="text-xs font-medium uppercase tracking-wider">Status</TableHead>
                  <TableHead className="text-right text-xs font-medium uppercase tracking-wider">Items</TableHead>
                  <TableHead className="text-right text-xs font-medium uppercase tracking-wider">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow
                  className="h-14 cursor-pointer bg-[#bcdc88]/20 hover:bg-[#bcdc88]/50"
                  onClick={() => toast.info("Create purchase order coming soon")}
                >
                  <TableCell className="pl-6">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-dashed border-primary/50 bg-primary/5">
                        <Plus className="h-3.5 w-3.5 text-primary" />
                      </div>
                      <span className="font-medium">Create purchase order</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">-</TableCell>
                  <TableCell className="text-muted-foreground">-</TableCell>
                  <TableCell className="text-muted-foreground">-</TableCell>
                  <TableCell className="text-muted-foreground">-</TableCell>
                  <TableCell className="text-right text-muted-foreground">-</TableCell>
                  <TableCell className="text-right text-muted-foreground">-</TableCell>
                </TableRow>

                {filteredPOs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">
                      No purchase orders found. Adjust filters or create a new order.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredPOs.map((po) => {
                    const config = STATUS_CONFIG[po.status];
                    const StatusIcon = config.icon;
                    const overdue = isOverdue(po);
                    const daysOverdue = overdue
                      ? Math.floor(
                          (new Date().getTime() - new Date(po.expectedDelivery).getTime()) /
                            (1000 * 60 * 60 * 24)
                        )
                      : 0;

                    return (
                      <TableRow
                        key={po.id}
                        className={cn(
                          "h-14 cursor-pointer hover:bg-muted/50",
                          overdue ? "bg-red-50/50 dark:bg-red-950/30" : ""
                        )}
                      >
                        <TableCell className="pl-6">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{po.poNumber}</span>
                          </div>
                        </TableCell>
                        <TableCell>{po.supplierName}</TableCell>
                        <TableCell>{formatDate(po.orderDate)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            <span className={overdue ? "font-semibold text-red-600" : ""}>
                              {formatDate(po.expectedDelivery)}
                            </span>
                            {overdue ? (
                              <Badge variant="destructive" className="px-1.5 py-0 text-[10px]">
                                {daysOverdue}d late
                              </Badge>
                            ) : null}
                          </div>
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
                          {formatCurrency(po.total)}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </section>
  );
}
