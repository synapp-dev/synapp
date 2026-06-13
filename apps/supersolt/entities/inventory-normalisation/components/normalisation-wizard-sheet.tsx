"use client";

import { useEffect, useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@workspace/ui/components/badge";
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
import type { IngredientCategory } from "@/entities/ingredients/model/types";
import { useNormalisationMutations } from "@/entities/inventory-normalisation/model/useNormalisationMutations";
import type {
  NormalisationQueueItem,
  NormalisationSuggestion,
  NormaliseCommitInput,
} from "@/entities/inventory-normalisation/model/types";

const PACK_UNITS = [
  { value: "each", label: "Each" },
  { value: "g", label: "Grams (g)" },
  { value: "kg", label: "Kilograms (kg)" },
  { value: "mL", label: "Millilitres (mL)" },
  { value: "L", label: "Litres (L)" },
] as const;

const CATEGORIES: Array<{ value: IngredientCategory; label: string }> = [
  { value: "proteins", label: "Proteins" },
  { value: "produce", label: "Produce" },
  { value: "dairy", label: "Dairy" },
  { value: "dry-goods", label: "Dry goods" },
  { value: "beverages", label: "Beverages" },
  { value: "oils-condiments", label: "Oils & condiments" },
  { value: "other", label: "Other" },
];

const STEPS = ["Review", "Pack", "Ingredient", "Confirm"] as const;

type WizardStep = (typeof STEPS)[number];

type NormalisationWizardSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organisation: string;
  venue: string;
  item: NormalisationQueueItem | null;
};

function dollarsToCents(value: string): number {
  const parsed = Number.parseFloat(value.replace(/[^0-9.]/g, ""));
  if (!Number.isFinite(parsed)) return 0;
  return Math.round(parsed * 100);
}

function centsToDollars(cents: number): string {
  return (cents / 100).toFixed(2);
}

function formatCostPerUnit(cents: number, unit: string): string {
  return `$${(cents / 100).toFixed(2)} per ${unit}`;
}

export function NormalisationWizardSheet({
  open,
  onOpenChange,
  organisation,
  venue,
  item,
}: NormalisationWizardSheetProps) {
  const [step, setStep] = useState<WizardStep>("Review");
  const [suggestUnavailable, setSuggestUnavailable] = useState(false);
  const [suggestion, setSuggestion] = useState<NormalisationSuggestion | null>(null);
  const [ingredientMode, setIngredientMode] = useState<"create" | "link">("create");
  const [linkedIngredientId, setLinkedIngredientId] = useState<string | null>(null);
  const [productName, setProductName] = useState("");
  const [packLabel, setPackLabel] = useState("each");
  const [unitsPerPack, setUnitsPerPack] = useState("1");
  const [packUnit, setPackUnit] = useState<string>("each");
  const [priceInput, setPriceInput] = useState("0.00");
  const [ingredientName, setIngredientName] = useState("");
  const [ingredientCategory, setIngredientCategory] = useState<IngredientCategory>("other");
  const [ingredientUnit, setIngredientUnit] = useState("each");
  const [makeActiveSource, setMakeActiveSource] = useState(true);

  const { suggest, commit, skip } = useNormalisationMutations({
    organisationSlug: organisation,
    venueSlug: venue,
  });

  const ingredientsQuery = useIngredientSelectorQuery({
    organisationSlug: organisation,
    venueSlug: venue,
  });

  const stepIndex = STEPS.indexOf(step);
  const isEditing = item?.normalisationStatus === "normalised";
  const pending = commit.isPending || skip.isPending;

  useEffect(() => {
    if (!open || !item) return;

    setStep("Review");
    setSuggestUnavailable(false);
    setSuggestion(null);
    setIngredientMode("create");
    setLinkedIngredientId(null);
    setProductName(item.rawDescription);
    setPackLabel(item.rawUnit?.trim() || "each");
    setUnitsPerPack("1");
    setPackUnit(item.rawUnit?.trim() || "each");
    setPriceInput(
      item.lastUnitPriceCents != null
        ? centsToDollars(item.lastUnitPriceCents)
        : item.lastLineTotalCents != null
          ? centsToDollars(item.lastLineTotalCents)
          : "0.00",
    );
    setIngredientName(item.rawDescription);
    setIngredientCategory("other");
    setIngredientUnit(item.rawUnit?.trim() || "each");
    setMakeActiveSource(true);

    if (item.normalisationStatus === "normalised") {
      setSuggestUnavailable(true);
      return;
    }

    void (async () => {
      try {
        const result = await suggest.mutateAsync(item.id);
        setSuggestion(result);
        setProductName(result.productName);
        setPackLabel(result.packLabel);
        setUnitsPerPack(String(result.unitsPerPack));
        setPackUnit(result.packUnit);
        if (result.unitPriceCents != null) {
          setPriceInput(centsToDollars(result.unitPriceCents));
        }
        setIngredientName(result.ingredientName);
        setIngredientCategory(result.ingredientCategory);
        setIngredientUnit(result.ingredientUnit);
      } catch {
        setSuggestUnavailable(true);
      }
    })();
  }, [open, item?.id, item?.normalisationStatus]);

  const unitPriceCents = dollarsToCents(priceInput);
  const unitsPerPackNum = Math.max(0.001, Number(unitsPerPack) || 1);
  const costPerBaseUnitCents = Math.round(unitPriceCents / unitsPerPackNum);

  function goNext() {
    const idx = STEPS.indexOf(step);
    if (idx < STEPS.length - 1) {
      setStep(STEPS[idx + 1]!);
    }
  }

  function goBack() {
    const idx = STEPS.indexOf(step);
    if (idx > 0) {
      setStep(STEPS[idx - 1]!);
    }
  }

  async function handleSkipDuplicate() {
    if (!item) return;
    try {
      await skip.mutateAsync(item.id);
      toast.success("Skipped as duplicate line");
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to skip");
    }
  }

  async function handleRetrySuggest() {
    if (!item) return;
    setSuggestUnavailable(false);
    try {
      const result = await suggest.mutateAsync(item.id);
      setSuggestion(result);
      setProductName(result.productName);
      setPackLabel(result.packLabel);
      setUnitsPerPack(String(result.unitsPerPack));
      setPackUnit(result.packUnit);
      if (result.unitPriceCents != null) {
        setPriceInput(centsToDollars(result.unitPriceCents));
      }
      setIngredientName(result.ingredientName);
      setIngredientCategory(result.ingredientCategory);
      setIngredientUnit(result.ingredientUnit);
      toast.success("Suggestion updated");
    } catch {
      setSuggestUnavailable(true);
      toast.error("AI suggestions unavailable — enter details manually");
    }
  }

  async function handleConfirm() {
    if (!item) return;
    if (!productName.trim()) {
      toast.error("Product name is required");
      return;
    }
    if (ingredientMode === "link" && !linkedIngredientId) {
      toast.error("Select an ingredient to link");
      return;
    }

    const supplierProduct = {
      name: productName.trim(),
      packLabel: packLabel.trim() || "each",
      unitsPerPack: unitsPerPackNum,
      packUnit: packUnit as "g" | "kg" | "mL" | "L" | "each",
      unitPriceCents,
    };

    let payload: NormaliseCommitInput;
    if (ingredientMode === "link" && linkedIngredientId) {
      payload = {
        rawItemId: item.id,
        mode: "link",
        ingredientId: linkedIngredientId,
        supplierProduct,
        makeActiveSource,
      };
    } else {
      payload = {
        rawItemId: item.id,
        mode: "create",
        ingredient: {
          name: ingredientName.trim() || productName.trim(),
          category: ingredientCategory,
          unit: ingredientUnit.trim() || packUnit,
          costPerUnitCents: costPerBaseUnitCents,
          currentStockLevel: 0,
          status: "active",
          supplierId: item.supplierId,
        },
        supplierProduct,
        makeActiveSource,
      };
    }

    try {
      await commit.mutateAsync(payload);
      toast.success(isEditing ? "Mapping updated" : "Item normalised");
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save");
    }
  }

  if (!item) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="top"
        className={cn(
          "inset-x-1/2 right-auto top-0 bottom-14 flex w-full max-w-3xl -translate-x-1/2 flex-col overflow-hidden rounded-t-none rounded-b-xl border md:w-[60vw]",
        )}
      >
        <SheetTitle className="sr-only">Normalise raw item</SheetTitle>
        <SheetDescription className="sr-only">Guided normalisation wizard</SheetDescription>

        <div className="flex h-full min-h-0 flex-col">
          <div className="border-b p-4 md:p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-2">
                <h2 className="text-lg font-semibold">
                  {isEditing ? "Edit mapping" : "Normalise item"}
                </h2>
                <div className="flex flex-wrap gap-1.5">
                  {STEPS.map((label, index) => (
                    <Badge
                      key={label}
                      variant={index === stepIndex ? "default" : "secondary"}
                    >
                      {index + 1}. {label}
                    </Badge>
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                {step !== "Review" ? (
                  <Button variant="outline" size="sm" onClick={goBack}>
                    Back
                  </Button>
                ) : null}
                {step !== "Confirm" ? (
                  <Button size="sm" onClick={goNext}>
                    Next
                  </Button>
                ) : (
                  <Button size="sm" disabled={pending} onClick={() => void handleConfirm()}>
                    {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirm"}
                  </Button>
                )}
              </div>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-4 md:p-6">
            {step === "Review" ? (
              <div className="space-y-4 rounded-lg border p-4">
                {(item.similarPendingItems?.length ?? 0) > 0 ? (
                  <div className="space-y-3 rounded-md border border-amber-500/40 bg-amber-500/5 p-3">
                    <p className="text-sm font-medium">
                      This may be the same product as another pending line
                    </p>
                    <ul className="text-muted-foreground space-y-1 text-sm">
                      {item.similarPendingItems?.map((similar) => (
                        <li key={similar.id} className="truncate" title={similar.rawDescription}>
                          • {similar.rawDescription}
                        </li>
                      ))}
                    </ul>
                    <p className="text-muted-foreground text-xs">
                      Normalise the line with the most detail once, then skip shorter duplicates.
                      Continue if these are genuinely different products.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={pending}
                        onClick={() => void handleSkipDuplicate()}
                      >
                        Skip this line (duplicate)
                      </Button>
                    </div>
                  </div>
                ) : null}
                <div>
                  <p className="text-muted-foreground text-xs font-medium uppercase">Supplier</p>
                  <p className="font-medium">{item.supplierName}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs font-medium uppercase">Raw description</p>
                  <p className="font-medium">{item.rawDescription}</p>
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  <div>
                    <p className="text-muted-foreground text-xs">Unit</p>
                    <p>{item.rawUnit ?? "—"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Last qty</p>
                    <p>{item.lastQuantity ?? "—"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Last price</p>
                    <p>
                      {item.lastUnitPriceCents != null
                        ? formatCostPerUnit(item.lastUnitPriceCents, "unit")
                        : "—"}
                    </p>
                  </div>
                </div>
                {suggestion?.rationale ? (
                  <p className="text-muted-foreground text-sm">{suggestion.rationale}</p>
                ) : null}
              </div>
            ) : null}

            {step === "Pack" ? (
              <div className="space-y-4 rounded-lg border p-4">
                {suggest.isPending ? (
                  <div className="text-muted-foreground flex items-center gap-2 text-sm">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Analysing line item…
                  </div>
                ) : null}
                {suggestUnavailable ? (
                  <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-amber-500/30 bg-amber-500/5 p-3 text-sm">
                    <span>AI suggestions unavailable — enter details manually.</span>
                    <Button variant="outline" size="sm" onClick={() => void handleRetrySuggest()}>
                      <Sparkles className="mr-1 h-3.5 w-3.5" />
                      Retry suggest
                    </Button>
                  </div>
                ) : null}
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-2 md:col-span-2">
                    <Label>Product name</Label>
                    <Input value={productName} onChange={(e) => setProductName(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Pack label</Label>
                    <Input
                      placeholder="box, carton, bag"
                      value={packLabel}
                      onChange={(e) => setPackLabel(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Units per pack</Label>
                    <Input
                      type="number"
                      min={0.001}
                      step="any"
                      value={unitsPerPack}
                      onChange={(e) => setUnitsPerPack(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Pack unit</Label>
                    <Select value={packUnit} onValueChange={setPackUnit}>
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
                    <Label>Pack price (AUD)</Label>
                    <Input value={priceInput} onChange={(e) => setPriceInput(e.target.value)} />
                  </div>
                </div>
              </div>
            ) : null}

            {step === "Ingredient" ? (
              <div className="space-y-4 rounded-lg border p-4">
                <div className="flex gap-2">
                  <Button
                    variant={ingredientMode === "create" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setIngredientMode("create")}
                  >
                    Create new
                  </Button>
                  <Button
                    variant={ingredientMode === "link" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setIngredientMode("link")}
                  >
                    Link existing
                  </Button>
                </div>

                {ingredientMode === "create" ? (
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="space-y-2 md:col-span-2">
                      <Label>Ingredient name</Label>
                      <Input
                        value={ingredientName}
                        onChange={(e) => setIngredientName(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Category</Label>
                      <Select
                        value={ingredientCategory}
                        onValueChange={(v) => setIngredientCategory(v as IngredientCategory)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CATEGORIES.map((c) => (
                            <SelectItem key={c.value} value={c.value}>
                              {c.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Inventory unit</Label>
                      <Input
                        value={ingredientUnit}
                        onChange={(e) => setIngredientUnit(e.target.value)}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label>Existing ingredient</Label>
                    <Select
                      value={linkedIngredientId ?? ""}
                      onValueChange={(v) => setLinkedIngredientId(v || null)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Search ingredients…" />
                      </SelectTrigger>
                      <SelectContent>
                        {(ingredientsQuery.data ?? []).map((ing) => (
                          <SelectItem key={ing.id} value={ing.id}>
                            {ing.name} ({ing.unit})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="flex items-center justify-between rounded-md border p-3">
                  <div>
                    <p className="text-sm font-medium">Active supplier source</p>
                    <p className="text-muted-foreground text-xs">
                      Use this pack price for ingredient costing
                    </p>
                  </div>
                  <Switch checked={makeActiveSource} onCheckedChange={setMakeActiveSource} />
                </div>
              </div>
            ) : null}

            {step === "Confirm" ? (
              <div className="space-y-4 rounded-lg border p-4">
                <div className="rounded-md bg-muted/50 p-4">
                  <p className="text-muted-foreground text-xs font-medium uppercase">Cost preview</p>
                  <p className="text-2xl font-semibold tabular-nums">
                    {formatCostPerUnit(costPerBaseUnitCents, packUnit)}
                  </p>
                  <p className="text-muted-foreground mt-1 text-sm">
                    {productName} — {unitsPerPack} {packUnit} per {packLabel} at ${priceInput}
                  </p>
                </div>
                <div className="grid gap-2 text-sm">
                  <p>
                    <span className="text-muted-foreground">Ingredient: </span>
                    {ingredientMode === "link"
                      ? ingredientsQuery.data?.find((i) => i.id === linkedIngredientId)?.name ??
                        "—"
                      : ingredientName}
                  </p>
                  <p>
                    <span className="text-muted-foreground">Supplier: </span>
                    {item.supplierName}
                  </p>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
