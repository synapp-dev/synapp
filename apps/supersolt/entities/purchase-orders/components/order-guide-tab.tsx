"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Loader2,
  RefreshCw,
  ShoppingCart,
} from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@workspace/ui/components/alert";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Checkbox } from "@workspace/ui/components/checkbox";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@workspace/ui/components/collapsible";
import { Input } from "@workspace/ui/components/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { buildScopedPath } from "@/lib/build-scoped-path";
import { cn } from "@workspace/ui/lib/utils";
import {
  OrderGuideRunHeadline,
  SupplierReasoningPanel,
} from "@/entities/purchase-orders/components/order-guide-reasoning-card";
import { purchaseOrdersApi } from "@/entities/purchase-orders/api/endpoints";
import { purchaseOrderKeys } from "@/entities/purchase-orders/model/keys";
import type {
  OrderGuidePeriodPreset,
  OrderGuideResponse,
  OrderGuideSuggestion,
} from "@/entities/purchase-orders/model/types";
import { useOrderGuideQuery } from "@/entities/purchase-orders/model/use-order-guide-query";
import {
  useOrderGuideReasoning,
  type OrderGuideReasoningStatus,
  type OrderGuideSupplierRead,
} from "@/entities/purchase-orders/model/use-order-guide-reasoning";

type SupplierGroup = OrderGuideResponse["suggestionsBySupplier"][number];

function formatCurrency(cents: number): string {
  return `$${(cents / 100).toLocaleString("en-AU", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatScheduleDate(isoDate: string): string {
  return new Date(`${isoDate}T12:00:00`).toLocaleDateString("en-AU", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

function formatCutoff(orderByTime: string | null): string {
  if (!orderByTime) return "";
  const [hours, minutes] = orderByTime.split(":");
  const hour = Number(hours);
  if (!Number.isFinite(hour)) return "";
  const suffix = hour >= 12 ? "pm" : "am";
  const display = hour % 12 === 0 ? 12 : hour % 12;
  return ` by ${display}${minutes && minutes !== "00" ? `:${minutes}` : ""}${suffix}`;
}

type SelectionKey = string;

function selectionKey(s: OrderGuideSuggestion): SelectionKey {
  return `${s.supplierId}:${s.supplierProductId}`;
}

type OrderGuideTabProps = {
  organisation: string;
  venue: string;
  onPosCreated: (poIds: string[]) => void;
};

export function OrderGuideTab({ organisation, venue, onPosCreated }: OrderGuideTabProps) {
  const queryClient = useQueryClient();
  const [period, setPeriod] = useState<OrderGuidePeriodPreset>("7d");
  const [selected, setSelected] = useState<Set<SelectionKey>>(new Set());
  const [qtyOverrides, setQtyOverrides] = useState<Record<SelectionKey, number>>({});
  const [expandedWhy, setExpandedWhy] = useState<Set<SelectionKey>>(new Set());
  const [activeIndex, setActiveIndex] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);

  const guideQuery = useOrderGuideQuery({ organisation, venue, period });
  const data = guideQuery.data;
  const suppliers = useMemo(() => data?.suggestionsBySupplier ?? [], [data]);

  const reasoning = useOrderGuideReasoning({
    organisation,
    venue,
    periodPreset: period,
    runKey: data?.computedAt ? `${data.computedAt}:${period}` : null,
    enabled: suppliers.length > 0,
  });

  // Keep the active supplier in range as the list changes (period / refresh).
  useEffect(() => {
    setActiveIndex((prev) => (prev >= suppliers.length ? 0 : prev));
  }, [suppliers.length]);

  const refreshMutation = useMutation({
    mutationFn: async () => {
      const result = await purchaseOrdersApi.post.orderGuideRefresh(
        organisation,
        venue,
        period
      );
      if (result.error) throw new Error(result.error.message);
      return result.data!;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: purchaseOrderKeys.all });
      toast.success("Order guide refreshed");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const createPosMutation = useMutation({
    mutationFn: async () => {
      if (!data) throw new Error("No guide data");

      const bySupplier = new Map<
        string,
        Array<{
          supplierProductId: string;
          ingredientId: string;
          productName: string;
          quantityPacks: number;
          unitPriceCents: number;
        }>
      >();

      for (const group of data.suggestionsBySupplier) {
        for (const line of group.lines) {
          const key = selectionKey(line);
          if (!selected.has(key)) continue;
          const qty = qtyOverrides[key] ?? line.suggestedPackQuantity;
          const lines = bySupplier.get(group.supplierId) ?? [];
          lines.push({
            supplierProductId: line.supplierProductId,
            ingredientId: line.ingredientId,
            productName: line.supplierProductName,
            quantityPacks: qty,
            unitPriceCents: line.unitPriceCents,
          });
          bySupplier.set(group.supplierId, lines);
        }
      }

      const selections = [...bySupplier.entries()].map(([supplierId, lines]) => ({
        supplierId,
        lines,
      }));

      if (selections.length === 0) {
        throw new Error("Select at least one item");
      }

      const result = await purchaseOrdersApi.post.createPosFromGuide(
        organisation,
        venue,
        selections
      );
      if (result.error) throw new Error(result.error.message);
      return result.data!.poIds;
    },
    onSuccess: (poIds) => {
      void queryClient.invalidateQueries({ queryKey: purchaseOrderKeys.all });
      toast.success(`Created ${poIds.length} draft PO${poIds.length === 1 ? "" : "s"}`);
      setSelected(new Set());
      onPosCreated(poIds);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const selectedCount = selected.size;

  function goTo(index: number) {
    setDirection(index >= activeIndex ? 1 : -1);
    setActiveIndex(index);
  }

  function selectedInGroup(group: SupplierGroup): number {
    let count = 0;
    for (const line of group.lines) {
      if (selected.has(selectionKey(line))) count += 1;
    }
    return count;
  }

  function setGroupSelection(group: SupplierGroup, checked: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      for (const line of group.lines) {
        const key = selectionKey(line);
        if (checked) next.add(key);
        else next.delete(key);
      }
      return next;
    });
  }

  function toggleLine(line: OrderGuideSuggestion, checked: boolean) {
    const key = selectionKey(line);
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(key);
      else next.delete(key);
      return next;
    });
  }

  if (guideQuery.isLoading) {
    return (
      <div className="flex items-center justify-center gap-2 py-20 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        Computing order suggestions…
      </div>
    );
  }

  if (guideQuery.isError) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Could not load order guide</AlertTitle>
        <AlertDescription>{(guideQuery.error as Error).message}</AlertDescription>
      </Alert>
    );
  }

  const guide = data!;
  const activeGroup = suppliers[Math.min(activeIndex, suppliers.length - 1)];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={period}
            onValueChange={(v) => setPeriod(v as OrderGuidePeriodPreset)}
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="3d">Next 3 days</SelectItem>
              <SelectItem value="7d">Next 7 days</SelectItem>
              <SelectItem value="14d">Next 14 days</SelectItem>
            </SelectContent>
          </Select>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={refreshMutation.isPending}
            onClick={() => refreshMutation.mutate()}
          >
            <RefreshCw
              className={cn("mr-2 h-4 w-4", refreshMutation.isPending && "animate-spin")}
            />
            Refresh
          </Button>
          {guide.computedAt ? (
            <span className="text-muted-foreground text-xs">
              Last computed {new Date(guide.computedAt).toLocaleString("en-AU")}
            </span>
          ) : null}
        </div>
        <Button
          type="button"
          disabled={selectedCount === 0 || createPosMutation.isPending}
          onClick={() => createPosMutation.mutate()}
        >
          <ShoppingCart className="mr-2 h-4 w-4" />
          Create POs ({selectedCount})
        </Button>
      </div>

      {guide.coldStart ? (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Forecast not yet available</AlertTitle>
          <AlertDescription>
            We need at least 14 days of POS history before forecast-driven suggestions appear.{" "}
            <Link
              href={buildScopedPath(organisation, venue, "purchasing/orders?tab=purchase-orders")}
              className="underline"
            >
              Create POs manually
            </Link>{" "}
            in the meantime.
          </AlertDescription>
        </Alert>
      ) : null}

      {guide.stockCountMissing ? (
        <Alert>
          <AlertTitle>Stock-on-hand unknown</AlertTitle>
          <AlertDescription>
            Suggestions assume zero current stock.{" "}
            <Link
              href={buildScopedPath(organisation, venue, "stock-management/stock-counts")}
              className="underline"
            >
              Run a stock count
            </Link>{" "}
            for more accurate quantities.
          </AlertDescription>
        </Alert>
      ) : null}

      {guide.noSupplierProducts ? (
        <Alert>
          <AlertTitle>No supplier products mapped</AlertTitle>
          <AlertDescription>
            Map active supplier products to ingredients in{" "}
            <Link
              href={buildScopedPath(organisation, venue, "purchasing/suppliers")}
              className="underline"
            >
              Suppliers
            </Link>{" "}
            to enable the order guide.
          </AlertDescription>
        </Alert>
      ) : null}

      {suppliers.length === 0 && !guide.coldStart ? (
        <p className="text-muted-foreground py-8 text-center text-sm">
          Nothing to order for this period — stock and pending deliveries cover forecasted demand.
        </p>
      ) : null}

      {suppliers.length > 0 && activeGroup ? (
        <>
          <OrderGuideRunHeadline
            headline={reasoning.runHeadline}
            status={reasoning.status}
            onRegenerate={() => void reasoning.regenerate()}
          />

          <SupplierSwitcher
            suppliers={suppliers}
            activeIndex={activeIndex}
            selectedInGroup={selectedInGroup}
            onSelect={goTo}
          />

          <div
            key={activeGroup.supplierId}
            className={cn(
              "animate-in fade-in duration-300",
              direction === 1 ? "slide-in-from-right-6" : "slide-in-from-left-6"
            )}
          >
            <SupplierDashboard
              group={activeGroup}
              read={reasoning.bySupplier.get(activeGroup.supplierId)}
              reasoningStatus={reasoning.status}
              selectedCount={selectedInGroup(activeGroup)}
              selected={selected}
              qtyOverrides={qtyOverrides}
              expandedWhy={expandedWhy}
              onToggleLine={toggleLine}
              onSetGroupSelection={setGroupSelection}
              onQtyChange={(key, value) =>
                setQtyOverrides((prev) => ({ ...prev, [key]: value }))
              }
              onToggleWhy={(key, open) =>
                setExpandedWhy((prev) => {
                  const next = new Set(prev);
                  if (open) next.add(key);
                  else next.delete(key);
                  return next;
                })
              }
            />
          </div>

          {suppliers.length > 1 ? (
            <div className="flex items-center justify-between">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={activeIndex === 0}
                onClick={() => goTo(activeIndex - 1)}
              >
                <ChevronLeft className="mr-1 h-4 w-4" />
                Previous
              </Button>
              <span className="text-muted-foreground text-xs">
                Supplier {activeIndex + 1} of {suppliers.length}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={activeIndex >= suppliers.length - 1}
                onClick={() => goTo(activeIndex + 1)}
              >
                Next
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

function SupplierSwitcher({
  suppliers,
  activeIndex,
  selectedInGroup,
  onSelect,
}: {
  suppliers: SupplierGroup[];
  activeIndex: number;
  selectedInGroup: (group: SupplierGroup) => number;
  onSelect: (index: number) => void;
}) {
  return (
    <div
      className="flex gap-2 overflow-x-auto pb-1"
      role="tablist"
      aria-label="Suppliers"
    >
      {suppliers.map((group, index) => {
        const active = index === activeIndex;
        const selectedHere = selectedInGroup(group);
        const orderToday = group.schedule?.nextOrderIsToday ?? false;
        const dotClass = group.belowMinimum
          ? "bg-destructive"
          : orderToday
            ? "bg-emerald-500"
            : "bg-muted-foreground/40";
        return (
          <button
            key={group.supplierId}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onSelect(index)}
            className={cn(
              "flex shrink-0 items-center gap-2 rounded-lg border px-3 py-2 text-left transition-colors",
              active
                ? "border-primary/40 bg-background ring-primary/20 shadow-sm ring-1"
                : "border-input bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground"
            )}
          >
            <span className={cn("h-2 w-2 shrink-0 rounded-full", dotClass)} />
            <span className="flex flex-col">
              <span
                className={cn(
                  "max-w-[11rem] truncate text-sm font-medium",
                  active ? "text-foreground" : ""
                )}
              >
                {group.supplierName}
              </span>
              <span className="text-muted-foreground text-xs">
                {formatCurrency(group.subtotalCents)}
                {group.lines.length > 0
                  ? ` · ${group.lines.length} line${group.lines.length === 1 ? "" : "s"}`
                  : ""}
              </span>
            </span>
            {selectedHere > 0 ? (
              <Badge className="ml-1 h-5 shrink-0 px-1.5 text-[10px]">
                {selectedHere}
              </Badge>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

function SupplierDashboard({
  group,
  read,
  reasoningStatus,
  selectedCount,
  selected,
  qtyOverrides,
  expandedWhy,
  onToggleLine,
  onSetGroupSelection,
  onQtyChange,
  onToggleWhy,
}: {
  group: SupplierGroup;
  read: OrderGuideSupplierRead | undefined;
  reasoningStatus: OrderGuideReasoningStatus;
  selectedCount: number;
  selected: Set<SelectionKey>;
  qtyOverrides: Record<SelectionKey, number>;
  expandedWhy: Set<SelectionKey>;
  onToggleLine: (line: OrderGuideSuggestion, checked: boolean) => void;
  onSetGroupSelection: (group: SupplierGroup, checked: boolean) => void;
  onQtyChange: (key: SelectionKey, value: number) => void;
  onToggleWhy: (key: SelectionKey, open: boolean) => void;
}) {
  const allSelected = selectedCount === group.lines.length && group.lines.length > 0;

  return (
    <div className="overflow-hidden rounded-xl border">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b bg-muted/30 px-5 py-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-lg font-semibold">{group.supplierName}</p>
            {group.schedule ? (
              group.schedule.nextOrderIsToday ? (
                <Badge className="bg-emerald-600 text-white hover:bg-emerald-600">
                  Order today{formatCutoff(group.schedule.orderByTime)} · delivers{" "}
                  {formatScheduleDate(group.schedule.nextDeliveryDate)}
                </Badge>
              ) : (
                <Badge variant="outline">
                  Next order {formatScheduleDate(group.schedule.nextOrderDate)} · delivers{" "}
                  {formatScheduleDate(group.schedule.nextDeliveryDate)}
                </Badge>
              )
            ) : null}
          </div>
          <p className="text-muted-foreground mt-1 text-xs">
            {group.schedule?.orderDaysLabel
              ? `Order days: ${group.schedule.orderDaysLabel}`
              : `Lead time ${group.leadTimeDays} days`}
            {group.orderingEmail ? ` · ${group.orderingEmail}` : ""}
          </p>
        </div>
        <div className="text-right">
          <p className="text-lg font-semibold">{formatCurrency(group.subtotalCents)}</p>
          {group.belowMinimum ? (
            <Badge variant="destructive" className="mt-1">
              Below minimum ({formatCurrency(group.minimumShortfallCents)} short)
            </Badge>
          ) : (
            <p className="text-muted-foreground text-xs">
              {selectedCount} of {group.lines.length} selected
            </p>
          )}
        </div>
      </div>

      <div className="space-y-4 p-5">
        <SupplierReasoningPanel read={read} status={reasoningStatus} />

        <div className="flex items-center justify-between">
          <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
            Suggested lines
          </p>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={() => onSetGroupSelection(group, !allSelected)}
          >
            {allSelected ? "Clear all" : "Select all"}
          </Button>
        </div>

        <div className="divide-y rounded-lg border">
          {group.lines.map((line) => {
            const key = selectionKey(line);
            return (
              <LineRow
                key={key}
                line={line}
                checked={selected.has(key)}
                qty={qtyOverrides[key] ?? line.suggestedPackQuantity}
                whyOpen={expandedWhy.has(key)}
                onToggle={(checked) => onToggleLine(line, checked)}
                onQtyChange={(value) => onQtyChange(key, value)}
                onWhyToggle={(open) => onToggleWhy(key, open)}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

function LineRow({
  line,
  checked,
  qty,
  whyOpen,
  onToggle,
  onQtyChange,
  onWhyToggle,
}: {
  line: OrderGuideSuggestion;
  checked: boolean;
  qty: number;
  whyOpen: boolean;
  onToggle: (checked: boolean) => void;
  onQtyChange: (value: number) => void;
  onWhyToggle: (open: boolean) => void;
}) {
  const b = line.breakdown;

  return (
    <div
      className={cn(
        "flex flex-col gap-2 px-4 py-3 transition-colors",
        checked ? "bg-primary/[0.04]" : ""
      )}
    >
      <div className="flex flex-wrap items-start gap-3">
        <Checkbox
          checked={checked}
          onCheckedChange={(v) => onToggle(v === true)}
          aria-label={`Select ${line.ingredientName}`}
        />
        <div className="min-w-0 flex-1">
          <p className="font-medium">{line.ingredientName}</p>
          <p className="text-muted-foreground text-sm">
            {line.supplierProductName} · {line.suggestedPackQuantity}{" "}
            {line.breakdown.packLabel} suggested ·{" "}
            {formatCurrency(line.suggestedSubtotalCents)}
          </p>
        </div>
        <Input
          type="number"
          min={0}
          className="h-8 w-20"
          value={qty}
          onChange={(e) => onQtyChange(Number(e.target.value))}
        />
      </div>
      <Collapsible open={whyOpen} onOpenChange={onWhyToggle}>
        <CollapsibleTrigger asChild>
          <Button type="button" variant="ghost" size="sm" className="h-7 px-2">
            {whyOpen ? (
              <ChevronDown className="mr-1 h-3 w-3" />
            ) : (
              <ChevronRight className="mr-1 h-3 w-3" />
            )}
            Why?
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="bg-muted/30 rounded-md p-3 font-mono text-xs">
          <p className="text-muted-foreground">
            {b.demandSource === "consumption_14d"
              ? `Demand from 14-day usage (${(b.avgDailyBaseUnits ?? 0).toFixed(2)}/day)`
              : b.demandSource === "consumption_28d"
                ? `Demand from 28-day usage (${(b.avgDailyBaseUnits ?? 0).toFixed(2)}/day)`
                : "Demand from revenue estimate"}
          </p>
          <p>Forecasted demand: {b.forecastedDemandBaseUnits.toFixed(2)}</p>
          <p>− Current stock: {b.currentStockBaseUnits.toFixed(2)}</p>
          <p>− Pending deliveries: {b.pendingDeliveriesBaseUnits.toFixed(2)}</p>
          <p>+ Buffer ({b.bufferPercent}%): {b.bufferAddedBaseUnits.toFixed(2)}</p>
          <p>= Need: {b.needBaseUnits.toFixed(2)}</p>
          <p>
            → Order {b.suggestedPackQuantity} × {b.packLabel} ({b.unitsPerPack}{" "}
            {b.packUnit}/pack)
          </p>
          {b.assumptions.map((a) => (
            <p key={a} className="text-amber-700 dark:text-amber-400">
              {a}
            </p>
          ))}
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
