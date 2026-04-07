"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@workspace/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import type {
  IngredientCategory,
  IngredientStatus,
  UpsertIngredientInput,
} from "@/entities/ingredients/model/types";

type IngredientFormState = {
  name: string;
  category: IngredientCategory;
  unit: string;
  costPerUnitCents: number;
  bestSupplierCostCents: number | null;
  currentStockLevel: number;
  status: IngredientStatus;
};

type IngredientEditorDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  initialValue?: Partial<UpsertIngredientInput>;
  isSaving?: boolean;
  onSubmit: (payload: UpsertIngredientInput) => Promise<void> | void;
};

const INGREDIENT_CATEGORIES: Array<{ value: IngredientCategory; label: string }> = [
  { value: "proteins", label: "Proteins" },
  { value: "produce", label: "Produce" },
  { value: "dairy", label: "Dairy" },
  { value: "dry-goods", label: "Dry Goods" },
  { value: "beverages", label: "Beverages" },
  { value: "oils-condiments", label: "Oils & Condiments" },
  { value: "other", label: "Other" },
];

const INGREDIENT_UNITS = ["g", "kg", "ml", "l", "ea"] as const;

function createDefaultState(
  mode: "create" | "edit",
  initialValue?: Partial<UpsertIngredientInput>
): IngredientFormState {
  return {
    name: initialValue?.name ?? "",
    category: initialValue?.category ?? "other",
    unit: initialValue?.unit ?? "ea",
    costPerUnitCents: initialValue?.costPerUnitCents ?? 0,
    bestSupplierCostCents: initialValue?.bestSupplierCostCents ?? null,
    currentStockLevel: initialValue?.currentStockLevel ?? 0,
    status: initialValue?.status ?? (mode === "create" ? "active" : "inactive"),
  };
}

export function IngredientEditorDialog({
  open,
  onOpenChange,
  mode,
  initialValue,
  isSaving,
  onSubmit,
}: IngredientEditorDialogProps) {
  const [form, setForm] = useState<IngredientFormState>(() =>
    createDefaultState(mode, initialValue)
  );
  const [bestSupplierCost, setBestSupplierCost] = useState(
    form.bestSupplierCostCents === null
      ? ""
      : (form.bestSupplierCostCents / 100).toFixed(2)
  );

  useEffect(() => {
    const next = createDefaultState(mode, initialValue);
    setForm(next);
    setBestSupplierCost(
      next.bestSupplierCostCents === null
        ? ""
        : (next.bestSupplierCostCents / 100).toFixed(2)
    );
  }, [initialValue, mode, open]);

  const costPerUnitDollars = useMemo(
    () => (form.costPerUnitCents / 100).toFixed(2),
    [form.costPerUnitCents]
  );

  async function handleSubmit() {
    const name = form.name.trim();
    if (!name) {
      return;
    }

    const parsedBestSupplier =
      bestSupplierCost.trim().length === 0
        ? null
        : Math.round(Math.max(0, Number(bestSupplierCost)) * 100);

    await onSubmit({
      name,
      category: form.category,
      unit: form.unit,
      costPerUnitCents: Math.max(0, Math.round(form.costPerUnitCents)),
      bestSupplierCostCents:
        parsedBestSupplier !== null && Number.isFinite(parsedBestSupplier)
          ? parsedBestSupplier
          : null,
      currentStockLevel: Math.max(0, form.currentStockLevel),
      status: form.status,
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "Create Ingredient" : "Edit Ingredient"}
          </DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "Add a new ingredient to your venue catalog."
              : "Update ingredient details and defaults."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-1">
          <div className="grid gap-2">
            <Label htmlFor="ingredient-name">Name</Label>
            <Input
              id="ingredient-name"
              value={form.name}
              onChange={(event) =>
                setForm((current) => ({ ...current, name: event.target.value }))
              }
              placeholder="e.g. Chicken Breast"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label>Category</Label>
              <Select
                value={form.category}
                onValueChange={(value) =>
                  setForm((current) => ({
                    ...current,
                    category: value as IngredientCategory,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {INGREDIENT_CATEGORIES.map((category) => (
                    <SelectItem key={category.value} value={category.value}>
                      {category.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label>Unit</Label>
              <Select
                value={form.unit}
                onValueChange={(value) =>
                  setForm((current) => ({ ...current, unit: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {INGREDIENT_UNITS.map((unit) => (
                    <SelectItem key={unit} value={unit}>
                      {unit}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label htmlFor="ingredient-cost">Cost / Unit (A$)</Label>
              <Input
                id="ingredient-cost"
                type="number"
                min={0}
                step="0.01"
                value={costPerUnitDollars}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    costPerUnitCents: Math.round(
                      Math.max(0, Number(event.target.value) || 0) * 100
                    ),
                  }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="ingredient-best-cost">Best Supplier Cost (A$)</Label>
              <Input
                id="ingredient-best-cost"
                type="number"
                min={0}
                step="0.01"
                value={bestSupplierCost}
                onChange={(event) => setBestSupplierCost(event.target.value)}
                placeholder="Optional"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label htmlFor="ingredient-stock">Current Stock Level</Label>
              <Input
                id="ingredient-stock"
                type="number"
                min={0}
                step="0.01"
                value={form.currentStockLevel}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    currentStockLevel: Math.max(
                      0,
                      Number(event.target.value) || 0
                    ),
                  }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label>Status</Label>
              <Select
                value={form.status}
                onValueChange={(value) =>
                  setForm((current) => ({
                    ...current,
                    status: value as IngredientStatus,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => void handleSubmit()}
            disabled={!form.name.trim() || isSaving}
          >
            {isSaving ? "Saving..." : mode === "create" ? "Create" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
