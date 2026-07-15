"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  ChevronDown,
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
import { OrderGuideReasoningCard } from "@/entities/purchase-orders/components/order-guide-reasoning-card";
import { purchaseOrdersApi } from "@/entities/purchase-orders/api/endpoints";
import { purchaseOrderKeys } from "@/entities/purchase-orders/model/keys";
import type {
  OrderGuidePeriodPreset,
  OrderGuideSuggestion,
} from "@/entities/purchase-orders/model/types";
import { useOrderGuideQuery } from "@/entities/purchase-orders/model/use-order-guide-query";

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

  const guideQuery = useOrderGuideQuery({ organisation, venue, period });

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
      const data = guideQuery.data;
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

  const data = guideQuery.data!;

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
          {data.computedAt ? (
            <span className="text-muted-foreground text-xs">
              Last computed {new Date(data.computedAt).toLocaleString("en-AU")}
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

      {data.coldStart ? (
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

      {data.stockCountMissing ? (
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

      {data.noSupplierProducts ? (
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

      {data.suggestionsBySupplier.length === 0 && !data.coldStart ? (
        <p className="text-muted-foreground py-8 text-center text-sm">
          Nothing to order for this period — stock and pending deliveries cover forecasted demand.
        </p>
      ) : null}

      <OrderGuideReasoningCard
        organisation={organisation}
        venue={venue}
        periodPreset={period}
        runKey={data.computedAt ? `${data.computedAt}:${period}` : null}
        enabled={data.suggestionsBySupplier.length > 0}
      />

      {data.suggestionsBySupplier.map((group) => (
        <div key={group.supplierId} className="rounded-lg border">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-muted/30 px-4 py-3">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-semibold">{group.supplierName}</p>
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
              <p className="text-muted-foreground text-xs">
                {group.schedule?.orderDaysLabel
                  ? `Order days: ${group.schedule.orderDaysLabel}`
                  : `Lead time ${group.leadTimeDays} days`}
                {group.orderingEmail ? ` · ${group.orderingEmail}` : ""}
              </p>
            </div>
            <div className="text-right">
              <p className="font-medium">{formatCurrency(group.subtotalCents)}</p>
              {group.belowMinimum ? (
                <Badge variant="destructive" className="mt-1">
                  Below minimum ({formatCurrency(group.minimumShortfallCents)} short)
                </Badge>
              ) : null}
            </div>
          </div>
          <div className="divide-y">
            {group.lines.map((line) => {
              const key = selectionKey(line);
              const checked = selected.has(key);
              const qty = qtyOverrides[key] ?? line.suggestedPackQuantity;
              const whyOpen = expandedWhy.has(key);
              const b = line.breakdown;

              return (
                <div key={key} className="flex flex-col gap-2 px-4 py-3">
                  <div className="flex flex-wrap items-start gap-3">
                    <Checkbox
                      checked={checked}
                      onCheckedChange={(v) => toggleLine(line, v === true)}
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
                      onChange={(e) =>
                        setQtyOverrides((prev) => ({
                          ...prev,
                          [key]: Number(e.target.value),
                        }))
                      }
                    />
                  </div>
                  <Collapsible
                    open={whyOpen}
                    onOpenChange={(open) =>
                      setExpandedWhy((prev) => {
                        const next = new Set(prev);
                        if (open) next.add(key);
                        else next.delete(key);
                        return next;
                      })
                    }
                  >
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
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
