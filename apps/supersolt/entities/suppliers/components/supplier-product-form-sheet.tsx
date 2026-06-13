"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@workspace/ui/components/sheet";
import { Switch } from "@workspace/ui/components/switch";
import { cn } from "@workspace/ui/lib/utils";
import { useIngredientSelectorQuery } from "@/entities/ingredients/model/useIngredientsQuery";
import { useSupplierProductMutations } from "@/entities/supplier-products/model/useSupplierProductMutations";
import type {
  SupplierProductSummary,
  UpsertSupplierProductInput,
} from "@/entities/supplier-products/model/types";

const PACK_UNITS = [
  { value: "each", label: "Each" },
  { value: "g", label: "Grams (g)" },
  { value: "kg", label: "Kilograms (kg)" },
  { value: "mL", label: "Millilitres (mL)" },
  { value: "L", label: "Litres (L)" },
] as const;

type SupplierProductFormSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organisation: string;
  venue: string;
  supplierId: string;
  product?: SupplierProductSummary | null;
};

function defaultForm(): UpsertSupplierProductInput {
  return {
    name: "",
    skuCode: "",
    packLabel: "each",
    unitsPerPack: 1,
    packUnit: "each",
    unitPriceCents: 0,
    ingredientId: null,
    makeActive: true,
  };
}

function dollarsToCents(value: string): number {
  const parsed = Number.parseFloat(value.replace(/[^0-9.]/g, ""));
  if (!Number.isFinite(parsed)) return 0;
  return Math.round(parsed * 100);
}

function centsToDollars(cents: number): string {
  return (cents / 100).toFixed(2);
}

export function SupplierProductFormSheet({
  open,
  onOpenChange,
  organisation,
  venue,
  supplierId,
  product,
}: SupplierProductFormSheetProps) {
  const [form, setForm] = useState<UpsertSupplierProductInput>(defaultForm);
  const [priceInput, setPriceInput] = useState("0.00");

  const ingredientsQuery = useIngredientSelectorQuery({ organisationSlug: organisation, venueSlug: venue });
  const { createProduct, updateProduct } = useSupplierProductMutations({
    organisationSlug: organisation,
    venueSlug: venue,
    supplierId,
  });

  const isEditing = Boolean(product);
  const pending = createProduct.isPending || updateProduct.isPending;

  useEffect(() => {
    if (!open) return;
    if (product) {
      setForm({
        name: product.name,
        skuCode: product.skuCode ?? "",
        packLabel: product.packLabel,
        unitsPerPack: product.unitsPerPack,
        packUnit: product.packUnit,
        unitPriceCents: product.unitPriceCents,
        ingredientId: product.ingredientId,
        makeActive: product.isActiveForIngredient,
      });
      setPriceInput(centsToDollars(product.unitPriceCents));
    } else {
      setForm(defaultForm());
      setPriceInput("0.00");
    }
  }, [open, product]);

  async function handleSave() {
    if (!form.name.trim()) {
      toast.error("Product name is required");
      return;
    }

    const payload: UpsertSupplierProductInput = {
      ...form,
      name: form.name.trim(),
      unitPriceCents: dollarsToCents(priceInput),
      skuCode: form.skuCode?.trim() || null,
      packLabel: form.packLabel?.trim() || "each",
      unitsPerPack: Number(form.unitsPerPack) || 1,
    };

    try {
      if (isEditing && product) {
        await updateProduct.mutateAsync({ productId: product.id, payload });
        toast.success("Product updated");
      } else {
        await createProduct.mutateAsync(payload);
        toast.success("Product created");
      }
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save product");
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="top"
        className={cn(
          "inset-x-1/2 right-auto top-0 bottom-14 flex w-full max-w-2xl -translate-x-1/2 flex-col overflow-hidden rounded-t-none rounded-b-xl border md:w-[50vw]",
        )}
      >
        <SheetTitle className="sr-only">{isEditing ? "Edit product" : "Add product"}</SheetTitle>
        <SheetDescription className="sr-only">Supplier product form</SheetDescription>

        <div className="flex h-full min-h-0 flex-col">
          <div className="border-b p-4 md:p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-1">
                <h2 className="text-lg font-semibold">
                  {isEditing ? "Edit supplier product" : "Add supplier product"}
                </h2>
                <p className="text-xs text-muted-foreground">
                  Pack info, pricing, and ingredient mapping for recipe costs.
                </p>
              </div>
              <Button size="sm" disabled={pending} onClick={() => void handleSave()}>
                Save
              </Button>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-4 md:p-6">
            <div className="space-y-4 rounded-lg border p-4">
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="sp-name">Product name</Label>
                  <Input
                    id="sp-name"
                    value={form.name}
                    onChange={(e) => setForm((c) => ({ ...c, name: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sp-sku">SKU / code</Label>
                  <Input
                    id="sp-sku"
                    value={form.skuCode ?? ""}
                    onChange={(e) => setForm((c) => ({ ...c, skuCode: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sp-pack-label">Pack label</Label>
                  <Input
                    id="sp-pack-label"
                    placeholder="e.g. carton, sack, slab"
                    value={form.packLabel ?? ""}
                    onChange={(e) => setForm((c) => ({ ...c, packLabel: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sp-units">Units per pack</Label>
                  <Input
                    id="sp-units"
                    type="number"
                    min={0.001}
                    step="any"
                    value={form.unitsPerPack ?? 1}
                    onChange={(e) =>
                      setForm((c) => ({ ...c, unitsPerPack: Number(e.target.value) || 1 }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Pack unit</Label>
                  <Select
                    value={form.packUnit ?? "each"}
                    onValueChange={(v) => setForm((c) => ({ ...c, packUnit: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PACK_UNITS.map((u) => (
                        <SelectItem key={u.value} value={u.value}>
                          {u.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sp-price">Pack price (AUD)</Label>
                  <Input
                    id="sp-price"
                    inputMode="decimal"
                    value={priceInput}
                    onChange={(e) => setPriceInput(e.target.value)}
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Ingredient mapping</Label>
                  <Select
                    value={form.ingredientId ?? "_none"}
                    onValueChange={(v) =>
                      setForm((c) => ({
                        ...c,
                        ingredientId: v === "_none" ? null : v,
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select ingredient" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_none">No ingredient (non-recipe)</SelectItem>
                      {(ingredientsQuery.data ?? []).map((ing) => (
                        <SelectItem key={ing.id} value={ing.id}>
                          {ing.name} ({ing.unit})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {form.ingredientId ? (
                  <div className="flex items-center gap-2 md:col-span-2">
                    <Switch
                      id="sp-active"
                      checked={form.makeActive ?? false}
                      onCheckedChange={(v) => setForm((c) => ({ ...c, makeActive: v }))}
                    />
                    <Label htmlFor="sp-active">Use as active cost source for this ingredient</Label>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
