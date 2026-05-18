"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, ShoppingCart, Zap } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { Checkbox } from "@workspace/ui/components/checkbox";
import { Input } from "@workspace/ui/components/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@workspace/ui/components/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@workspace/ui/components/table";
import { cn } from "@workspace/ui/lib/utils";

import { SuperbotSuggestionDestinationBanner } from "@/entities/ai-agent-chat/components/superbot-suggestion-destination-banner";

type OrderGuidePageClientProps = {
  organisation: string;
  venue: string;
};

type Urgency = "critical" | "low" | "adequate" | "overstocked";

type Supplier = {
  id: string;
  name: string;
  nextDelivery: string;
  daysUntilDelivery: number;
};

type OrderProduct = {
  id: string;
  supplierId: string;
  name: string;
  unit: string;
  costPerUnit: number;
  currentStock: number;
  parLevel: number;
  daysOfStock: number;
  weeklyUsage: number;
  recommendedQty: number;
  urgency: Urgency;
};

const SUPPLIERS: Supplier[] = [
  { id: "sup1", name: "FreshCo Produce", nextDelivery: "Fri 21 Mar", daysUntilDelivery: 2 },
  { id: "sup2", name: "MeatWorks", nextDelivery: "Mon 24 Mar", daysUntilDelivery: 5 },
  { id: "sup3", name: "Pacific Seafood", nextDelivery: "Thu 20 Mar", daysUntilDelivery: 1 },
  { id: "sup4", name: "Dairy Direct", nextDelivery: "Wed 26 Mar", daysUntilDelivery: 7 },
];

const PRODUCTS: OrderProduct[] = [
  { id: "p1", supplierId: "sup1", name: "Mixed Lettuce", unit: "kg", costPerUnit: 890, currentStock: 1.2, parLevel: 5, daysOfStock: 1, weeklyUsage: 8.4, recommendedQty: 6, urgency: "critical" },
  { id: "p2", supplierId: "sup1", name: "Lemons", unit: "kg", costPerUnit: 480, currentStock: 2.0, parLevel: 5, daysOfStock: 3, weeklyUsage: 4.2, recommendedQty: 4, urgency: "low" },
  { id: "p3", supplierId: "sup1", name: "Cherry Tomatoes", unit: "kg", costPerUnit: 720, currentStock: 4.5, parLevel: 6, daysOfStock: 5, weeklyUsage: 6.3, recommendedQty: 3, urgency: "adequate" },
  { id: "p4", supplierId: "sup1", name: "Avocado", unit: "unit", costPerUnit: 320, currentStock: 18, parLevel: 24, daysOfStock: 4, weeklyUsage: 28, recommendedQty: 12, urgency: "low" },
  { id: "p5", supplierId: "sup2", name: "Wagyu Mince", unit: "kg", costPerUnit: 3200, currentStock: 2.1, parLevel: 8, daysOfStock: 2, weeklyUsage: 7.0, recommendedQty: 8, urgency: "low" },
  { id: "p6", supplierId: "sup2", name: "Chicken Breast", unit: "kg", costPerUnit: 1250, currentStock: 0.8, parLevel: 8, daysOfStock: 0, weeklyUsage: 12.6, recommendedQty: 10, urgency: "critical" },
  { id: "p7", supplierId: "sup2", name: "Lamb Rack", unit: "kg", costPerUnit: 4800, currentStock: 6.0, parLevel: 5, daysOfStock: 7, weeklyUsage: 5.6, recommendedQty: 0, urgency: "overstocked" },
  { id: "p8", supplierId: "sup3", name: "Atlantic Salmon", unit: "kg", costPerUnit: 3950, currentStock: 1.5, parLevel: 5, daysOfStock: 1, weeklyUsage: 7.0, recommendedQty: 5, urgency: "critical" },
  { id: "p9", supplierId: "sup3", name: "Prawns (Tiger)", unit: "kg", costPerUnit: 4200, currentStock: 3.0, parLevel: 4, daysOfStock: 4, weeklyUsage: 5.6, recommendedQty: 2, urgency: "low" },
  { id: "p10", supplierId: "sup4", name: "Milk (Full Cream)", unit: "L", costPerUnit: 195, currentStock: 6, parLevel: 18, daysOfStock: 2, weeklyUsage: 21, recommendedQty: 18, urgency: "critical" },
  { id: "p11", supplierId: "sup4", name: "Burrata", unit: "unit", costPerUnit: 620, currentStock: 12, parLevel: 8, daysOfStock: 10, weeklyUsage: 8.4, recommendedQty: 0, urgency: "overstocked" },
];

function formatCurrency(cents: number): string {
  return `$${(cents / 100).toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function daysOfStockColor(days: number): string {
  if (days < 2) return "text-red-600 font-semibold";
  if (days <= 4) return "text-amber-600 font-semibold";
  return "text-emerald-600";
}

function UrgencyBadge({ urgency }: { urgency: Urgency }) {
  switch (urgency) {
    case "critical":
      return <Badge variant="destructive">Critical</Badge>;
    case "low":
      return <Badge className="bg-amber-500 text-white">Low Stock</Badge>;
    case "adequate":
      return <Badge variant="default">Adequate</Badge>;
    case "overstocked":
      return <Badge variant="secondary">Overstocked</Badge>;
    default: {
      const neverUrgency: never = urgency;
      return neverUrgency;
    }
  }
}

export function OrderGuidePageClient({ organisation, venue }: OrderGuidePageClientProps) {
  const [selectedSupplierId, setSelectedSupplierId] = useState("");
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [customQuantities, setCustomQuantities] = useState<Record<string, number>>({});

  const selectedSupplier = SUPPLIERS.find((s) => s.id === selectedSupplierId) ?? null;

  const supplierProducts = useMemo(() => {
    if (!selectedSupplier) return [];
    return PRODUCTS.filter((p) => p.supplierId === selectedSupplierId).sort((a, b) => {
      const order: Record<Urgency, number> = { critical: 0, low: 1, adequate: 2, overstocked: 3 };
      return order[a.urgency] - order[b.urgency];
    });
  }, [selectedSupplierId, selectedSupplier]);

  const globalStats = useMemo(() => {
    const critical = PRODUCTS.filter((p) => p.urgency === "critical").length;
    const low = PRODUCTS.filter((p) => p.urgency === "low").length;
    return { critical, low };
  }, []);

  const supplierOverview = useMemo(() => {
    return SUPPLIERS.map((supplier) => {
      const products = PRODUCTS.filter((p) => p.supplierId === supplier.id);
      const criticalItems = products.filter((p) => p.urgency === "critical");
      const lowItems = products.filter((p) => p.urgency === "low");
      return { supplier, products, criticalItems, lowItems };
    }).sort((a, b) => b.criticalItems.length - a.criticalItems.length || b.lowItems.length - a.lowItems.length);
  }, []);

  function getOrderQty(product: OrderProduct): number {
    return customQuantities[product.id] ?? product.recommendedQty;
  }

  const totalOrderValue = useMemo(() => {
    let sum = 0;
    for (const productId of selectedProducts) {
      const product = PRODUCTS.find((p) => p.id === productId);
      if (!product) continue;
      sum += getOrderQty(product) * product.costPerUnit;
    }
    return sum;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProducts, customQuantities]);

  function handleToggle(productId: string) {
    setSelectedProducts((prev) => {
      const next = new Set(prev);
      if (next.has(productId)) {
        next.delete(productId);
      } else {
        next.add(productId);
      }
      return next;
    });
  }

  function handleSelectLowCritical() {
    const ids = supplierProducts
      .filter((p) => p.urgency === "critical" || p.urgency === "low")
      .map((p) => p.id);
    setSelectedProducts(new Set(ids));
  }

  function handleCreatePO() {
    toast.success(`Draft PO created for ${selectedSupplier?.name} (${selectedProducts.size} items)`);
    setSelectedProducts(new Set());
    setCustomQuantities({});
  }

  function handleGenerateAll() {
    toast.success(`${supplierOverview.filter((s) => s.criticalItems.length > 0 || s.lowItems.length > 0).length} purchase orders generated`);
  }

  return (
    <section className="space-y-5">
      <SuperbotSuggestionDestinationBanner pathSuffix="inventory/order-guide" />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Order Guide</h1>
          <p className="text-sm text-muted-foreground">
            Organisation: <span className="font-medium">{organisation}</span> | Venue:{" "}
            <span className="font-medium">{venue}</span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={selectedSupplierId} onValueChange={setSelectedSupplierId}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select supplier..." />
            </SelectTrigger>
            <SelectContent>
              {SUPPLIERS.map((supplier) => (
                <SelectItem key={supplier.id} value={supplier.id}>
                  {supplier.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {!selectedSupplier && (globalStats.critical > 0 || globalStats.low > 0) ? (
            <Button variant="outline" className="gap-2" onClick={handleGenerateAll}>
              <Zap className="h-4 w-4" />
              Generate All Orders
            </Button>
          ) : null}
          {selectedProducts.size > 0 ? (
            <Button className="gap-2" onClick={handleCreatePO}>
              <ShoppingCart className="h-4 w-4" />
              Create PO
            </Button>
          ) : null}
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase tracking-wider">Suppliers</CardDescription>
            <CardTitle className="text-3xl">{SUPPLIERS.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase tracking-wider">Critical Items</CardDescription>
            <CardTitle className="text-3xl text-red-600">{globalStats.critical}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase tracking-wider">Low Stock Items</CardDescription>
            <CardTitle className="text-3xl text-amber-600">{globalStats.low}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {selectedSupplier ? (
        <div className="space-y-4">
          <Card>
            <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
              <div className="space-y-0.5">
                <p className="font-semibold">{selectedSupplier.name}</p>
                <p className="text-xs text-muted-foreground">
                  Next delivery: {selectedSupplier.nextDelivery} ({selectedSupplier.daysUntilDelivery}d)
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={handleSelectLowCritical}>
                  Select Low/Critical
                </Button>
                <Badge variant="outline">{selectedProducts.size} selected</Badge>
                {totalOrderValue > 0 ? <Badge>Total: {formatCurrency(totalOrderValue)}</Badge> : null}
              </div>
            </CardContent>
          </Card>

          {supplierProducts.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center gap-2 py-12 text-center">
                <AlertTriangle className="h-10 w-10 text-muted-foreground" />
                <p className="font-semibold">No Products Found</p>
                <p className="text-sm text-muted-foreground">
                  This supplier has no active products.
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="px-0 py-0">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="w-12" />
                      <TableHead className="text-xs font-medium uppercase tracking-wider">Product</TableHead>
                      <TableHead className="text-xs font-medium uppercase tracking-wider">Current Stock</TableHead>
                      <TableHead className="text-xs font-medium uppercase tracking-wider">Par Level</TableHead>
                      <TableHead className="text-xs font-medium uppercase tracking-wider">Days of Stock</TableHead>
                      <TableHead className="text-xs font-medium uppercase tracking-wider">Usage/wk</TableHead>
                      <TableHead className="text-xs font-medium uppercase tracking-wider">Recommended</TableHead>
                      <TableHead className="text-xs font-medium uppercase tracking-wider">Order Qty</TableHead>
                      <TableHead className="text-xs font-medium uppercase tracking-wider">Cost</TableHead>
                      <TableHead className="text-xs font-medium uppercase tracking-wider">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {supplierProducts.map((product) => {
                      const orderQty = getOrderQty(product);
                      const isSelected = selectedProducts.has(product.id);

                      return (
                        <TableRow
                          key={product.id}
                          className={cn(
                            isSelected ? "bg-blue-50/60 dark:bg-blue-950/30" : "",
                            !isSelected && product.daysOfStock < 2 ? "bg-red-50/30 dark:bg-red-950/20" : ""
                          )}
                        >
                          <TableCell>
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => handleToggle(product.id)}
                            />
                          </TableCell>
                          <TableCell>
                            <p className="font-medium">{product.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {product.unit} | {formatCurrency(product.costPerUnit)}
                            </p>
                          </TableCell>
                          <TableCell
                            className={cn(product.currentStock < product.parLevel * 0.5 ? "text-red-600 font-semibold" : "")}
                          >
                            {product.currentStock} {product.unit}
                          </TableCell>
                          <TableCell>
                            {product.parLevel} {product.unit}
                          </TableCell>
                          <TableCell>
                            <span className={daysOfStockColor(product.daysOfStock)}>
                              {product.daysOfStock >= 999 ? "—" : `${product.daysOfStock} days`}
                            </span>
                          </TableCell>
                          <TableCell>
                            {product.weeklyUsage.toFixed(1)} {product.unit}
                          </TableCell>
                          <TableCell>
                            <span className="font-semibold text-blue-600">
                              {product.recommendedQty} {product.unit}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min={0}
                              value={orderQty}
                              onChange={(event) =>
                                setCustomQuantities((prev) => ({
                                  ...prev,
                                  [product.id]: Number.parseInt(event.target.value, 10) || 0,
                                }))
                              }
                              className="w-20"
                            />
                          </TableCell>
                          <TableCell>{formatCurrency(orderQty * product.costPerUnit)}</TableCell>
                          <TableCell>
                            <UrgencyBadge urgency={product.urgency} />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {selectedProducts.size > 0 ? (
            <Card className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/40 dark:to-purple-950/40">
              <CardContent className="flex items-center justify-between py-6">
                <div className="space-y-1 text-sm">
                  <p className="text-lg font-semibold">Order Summary</p>
                  <p>
                    <span className="text-muted-foreground">Items:</span>{" "}
                    <span className="font-semibold">{selectedProducts.size}</span>
                  </p>
                  <p>
                    <span className="text-muted-foreground">Subtotal:</span>{" "}
                    <span className="font-semibold">{formatCurrency(totalOrderValue)}</span>
                  </p>
                  <p>
                    <span className="text-muted-foreground">GST (10%):</span>{" "}
                    <span className="font-semibold">{formatCurrency(Math.round(totalOrderValue * 0.1))}</span>
                  </p>
                  <p className="text-lg">
                    <span className="text-muted-foreground">Total:</span>{" "}
                    <span className="font-bold">{formatCurrency(Math.round(totalOrderValue * 1.1))}</span>
                  </p>
                </div>
                <Button size="lg" onClick={handleCreatePO} className="gap-2">
                  <ShoppingCart className="h-4 w-4" />
                  Create Purchase Order
                </Button>
              </CardContent>
            </Card>
          ) : null}
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Select a supplier to view their order guide, or use{" "}
            <strong>Generate All Orders</strong> to auto-create POs for all low-stock items.
          </p>
          {supplierOverview.map(({ supplier, products, criticalItems, lowItems }) => {
            const hasUrgent = criticalItems.length > 0 || lowItems.length > 0;
            return (
              <Card
                key={supplier.id}
                className={cn("cursor-pointer transition-shadow hover:shadow-md", hasUrgent ? "border-amber-200" : "")}
                onClick={() => setSelectedSupplierId(supplier.id)}
              >
                <CardContent className="py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold">{supplier.name}</p>
                        {criticalItems.length > 0 ? (
                          <Badge variant="destructive" className="text-xs">
                            {criticalItems.length} critical
                          </Badge>
                        ) : null}
                        {lowItems.length > 0 ? (
                          <Badge className="bg-amber-500 text-xs text-white">
                            {lowItems.length} low
                          </Badge>
                        ) : null}
                      </div>
                      <p className="mt-0.5 text-sm text-muted-foreground">
                        {products.length} product{products.length !== 1 ? "s" : ""} · Next delivery:{" "}
                        <span className={supplier.daysUntilDelivery <= 1 ? "font-medium text-amber-600" : ""}>
                          {supplier.nextDelivery} ({supplier.daysUntilDelivery}d)
                        </span>
                      </p>
                      {hasUrgent ? (
                        <p className="mt-1 truncate text-xs text-muted-foreground">
                          {[...criticalItems, ...lowItems]
                            .slice(0, 4)
                            .map((p) => p.name)
                            .join(", ")}
                          {criticalItems.length + lowItems.length > 4
                            ? ` +${criticalItems.length + lowItems.length - 4} more`
                            : ""}
                        </p>
                      ) : null}
                    </div>
                    <Button variant="outline" size="sm" className="shrink-0">
                      View
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </section>
  );
}
