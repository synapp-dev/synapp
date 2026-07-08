"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, Check, Loader2, Plus, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";

import { SearchCombobox } from "@/components/molecules/search-combobox";
import {
  WizardFrame,
  WizardFrameHeader,
  WizardViewport,
} from "@/components/molecules/wizard-frame";
import { buildScopedPath } from "@/lib/build-scoped-path";
import { ingredientsKeys } from "@/entities/ingredients/model/keys";
import { useIngredientsQuery } from "@/entities/ingredients/model/useIngredientsQuery";
import type { IngredientCategory } from "@/entities/ingredients/model/types";
import {
  stockWizardApi,
  type StockWizardSuggestRow,
} from "@/entities/stock-counts/api/stock-wizard-endpoints";
import { inventorySetupKeys } from "@/entities/inventory-setup/model/keys";

const CATEGORY_ORDER: IngredientCategory[] = [
  "proteins",
  "produce",
  "dairy",
  "dry-goods",
  "beverages",
  "oils-condiments",
  "other",
];

const CATEGORY_LABELS: Record<IngredientCategory, string> = {
  proteins: "Proteins",
  produce: "Produce",
  dairy: "Dairy",
  "dry-goods": "Dry Goods",
  beverages: "Beverages",
  "oils-condiments": "Oils & Condiments",
  other: "Other & Packaging",
};

const DEFAULT_LOCATIONS = ["Coolroom", "Freezer", "Dry Store", "Front Counter"];

function formatCents(cents: number): string {
  return `$${(cents / 100).toLocaleString("en-AU", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

type EditableRow = StockWizardSuggestRow & { qty: string };

function parseQty(value: string): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

function rowsValueCents(rows: EditableRow[]): number {
  return Math.round(
    rows.reduce((sum, row) => sum + parseQty(row.qty) * row.costPerUnitCents, 0),
  );
}

/**
 * Guided opening-stock wizard for the Storage stage: one step per ingredient
 * category, AI-suggested on-hand quantities and storage locations, editable
 * before saving. Shares the WizardFrame shell with the other setup wizards —
 * pinned header/footer, scrolling body.
 */
export function StockLevelsWizardPage({
  organisation,
  venue,
}: {
  organisation: string;
  venue: string;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const scoped = { organisationSlug: organisation, venueSlug: venue };
  const storageHref = buildScopedPath(organisation, venue, "settings/inventory-setup/storage");

  const ingredientsQuery = useIngredientsQuery({
    ...scoped,
    status: "active",
    page: 1,
    pageSize: 1000,
  });

  const locationsQuery = useQuery({
    queryKey: ["stock-wizard", organisation, venue, "locations"],
    queryFn: async () => {
      const { data, error } = await stockWizardApi.get.storageLocations(scoped);
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });

  const steps = useMemo(() => {
    const counts = new Map<IngredientCategory, number>();
    for (const ingredient of ingredientsQuery.data?.ingredients ?? []) {
      counts.set(
        ingredient.category,
        (counts.get(ingredient.category) ?? 0) + 1,
      );
    }
    return CATEGORY_ORDER.filter((category) => (counts.get(category) ?? 0) > 0).map(
      (category) => ({ category, count: counts.get(category) ?? 0 }),
    );
  }, [ingredientsQuery.data?.ingredients]);

  const [stepIndex, setStepIndex] = useState(0);
  const [savedValueCents, setSavedValueCents] = useState(0);
  const [savedItems, setSavedItems] = useState(0);
  const [isBulkFilling, setIsBulkFilling] = useState(false);

  const isLoading =
    ingredientsQuery.isLoading || locationsQuery.isLoading || !locationsQuery.data;
  const locations = locationsQuery.data ?? [];
  const currentStep = steps[stepIndex] ?? null;
  const finished = !isLoading && steps.length > 0 && stepIndex >= steps.length;

  async function invalidateAfterApply() {
    await queryClient.invalidateQueries({ queryKey: ingredientsKeys.all() });
    await queryClient.invalidateQueries({
      queryKey: inventorySetupKeys.progress(organisation, venue),
    });
  }

  /** Applies the server's own suggestions for every remaining category. */
  async function smartFillRemaining() {
    if (isBulkFilling) return;
    setIsBulkFilling(true);
    try {
      let value = 0;
      let items = 0;
      for (let index = stepIndex; index < steps.length; index += 1) {
        const step = steps[index]!;
        const suggested = await stockWizardApi.post.suggest({
          ...scoped,
          category: step.category,
        });
        if (suggested.error) throw new Error(suggested.error.message);
        const rows = suggested.data.rows.filter((row) => row.suggestedQty > 0);
        if (rows.length === 0) continue;
        const applied = await stockWizardApi.post.apply({
          ...scoped,
          items: rows.map((row) => ({
            ingredientId: row.ingredientId,
            quantity: row.suggestedQty,
            locationId: row.locationId,
          })),
        });
        if (applied.error) throw new Error(applied.error.message);
        value += Math.round(
          rows.reduce((sum, row) => sum + row.suggestedQty * row.costPerUnitCents, 0),
        );
        items += applied.data.updated;
      }
      setSavedValueCents((v) => v + value);
      setSavedItems((n) => n + items);
      setStepIndex(steps.length);
      await invalidateAfterApply();
      toast.success(`Smart fill: ${items} ingredients counted`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Smart fill failed");
    } finally {
      setIsBulkFilling(false);
    }
  }

  const headerRight = (
    <>
      {!isLoading && !finished && locations.length > 0 ? (
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5"
          disabled={isBulkFilling}
          onClick={() => void smartFillRemaining()}
        >
          {isBulkFilling ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : (
            <Sparkles className="size-4" aria-hidden />
          )}
          Smart fill remaining
        </Button>
      ) : null}
      <Button variant="outline" size="sm" className="gap-1.5" onClick={() => router.push(storageHref)}>
        <ArrowLeft className="size-4" aria-hidden />
        Exit
      </Button>
    </>
  );

  return (
    <WizardViewport className="px-4 pb-4">
      {isLoading ? (
        <WizardFrame
          header={
            <WizardFrameHeader eyebrow="Storage" title="Opening stock" right={headerRight} />
          }
        >
          <div className="text-muted-foreground flex items-center gap-2 py-10 text-sm" aria-busy="true">
            <Loader2 className="size-4 animate-spin" aria-hidden />
            Loading your inventory…
          </div>
        </WizardFrame>
      ) : locations.length === 0 ? (
        <CreateLocationsFrame
          organisation={organisation}
          venue={venue}
          headerRight={headerRight}
          onCreated={async () => {
            await locationsQuery.refetch();
            await queryClient.invalidateQueries({
              queryKey: inventorySetupKeys.progress(organisation, venue),
            });
          }}
        />
      ) : finished || steps.length === 0 ? (
        <WizardFrame
          header={
            <WizardFrameHeader eyebrow="Storage" title="Opening stock" right={headerRight} />
          }
          footer={
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-medium tabular-nums">
                Stock on hand: {formatCents(savedValueCents)}
              </span>
              <Button onClick={() => router.push(storageHref)} className="gap-1.5">
                <Check className="size-4" aria-hidden />
                Done
              </Button>
            </div>
          }
        >
          <div className="space-y-3 py-6 text-sm">
            <p className="flex items-center gap-2 font-medium">
              <Check className="size-4 text-emerald-600" aria-hidden />
              Opening stock recorded
            </p>
            <p className="text-muted-foreground">
              {savedItems} ingredients counted across {steps.length} categories, worth{" "}
              {formatCents(savedValueCents)} at current supplier prices. Stock counts and
              variance now have a real baseline.
            </p>
          </div>
        </WizardFrame>
      ) : currentStep ? (
        <CategoryStepFrame
          key={currentStep.category}
          organisation={organisation}
          venue={venue}
          category={currentStep.category}
          stepNumber={stepIndex + 1}
          stepCount={steps.length}
          headerRight={headerRight}
          runningValueCents={savedValueCents}
          onSkip={() => setStepIndex((i) => i + 1)}
          onSaved={async (valueCents, items) => {
            setSavedValueCents((v) => v + valueCents);
            setSavedItems((n) => n + items);
            setStepIndex((i) => i + 1);
            await invalidateAfterApply();
          }}
        />
      ) : null}
    </WizardViewport>
  );
}

function CreateLocationsFrame({
  organisation,
  venue,
  headerRight,
  onCreated,
}: {
  organisation: string;
  venue: string;
  headerRight: React.ReactNode;
  onCreated: () => Promise<void>;
}) {
  const [names, setNames] = useState<string[]>(DEFAULT_LOCATIONS);
  const [isSaving, setIsSaving] = useState(false);

  async function create() {
    const cleaned = names.map((n) => n.trim()).filter(Boolean);
    if (cleaned.length === 0 || isSaving) return;
    setIsSaving(true);
    try {
      for (let index = 0; index < cleaned.length; index += 1) {
        const { error } = await stockWizardApi.post.createStorageLocation({
          organisationSlug: organisation,
          venueSlug: venue,
          name: cleaned[index]!,
          displayOrder: index,
        });
        if (error) throw new Error(error.message);
      }
      toast.success(`${cleaned.length} storage locations created`);
      await onCreated();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create locations");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <WizardFrame
      header={
        <WizardFrameHeader
          eyebrow="Storage"
          title="Where do you keep your stock?"
          right={headerRight}
        />
      }
      footer={
        <div className="flex items-center justify-end gap-2">
          <Button className="gap-1.5" disabled={isSaving} onClick={() => void create()}>
            {isSaving ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              <ArrowRight className="size-4" aria-hidden />
            )}
            Create locations & start counting
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <p className="text-muted-foreground text-sm">
          Set up the places stock lives — the wizard will suggest a home for every
          ingredient. Rename or remove any of these, or add your own.
        </p>
        <div className="space-y-2">
          {names.map((name, index) => (
            <div key={index} className="flex items-center gap-2">
              <Input
                value={name}
                onChange={(event) =>
                  setNames((current) =>
                    current.map((n, i) => (i === index ? event.target.value : n)),
                  )
                }
                placeholder="Location name"
              />
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Remove ${name || "location"}`}
                onClick={() => setNames((current) => current.filter((_, i) => i !== index))}
              >
                <Trash2 className="size-4" aria-hidden />
              </Button>
            </div>
          ))}
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => setNames((current) => [...current, ""])}
          >
            <Plus className="size-4" aria-hidden />
            Add location
          </Button>
        </div>
      </div>
    </WizardFrame>
  );
}

function CategoryStepFrame({
  organisation,
  venue,
  category,
  stepNumber,
  stepCount,
  headerRight,
  runningValueCents,
  onSkip,
  onSaved,
}: {
  organisation: string;
  venue: string;
  category: IngredientCategory;
  stepNumber: number;
  stepCount: number;
  headerRight: React.ReactNode;
  runningValueCents: number;
  onSkip: () => void;
  onSaved: (valueCents: number, items: number) => Promise<void>;
}) {
  const scoped = { organisationSlug: organisation, venueSlug: venue };
  const [isSaving, setIsSaving] = useState(false);
  const [rows, setRows] = useState<EditableRow[] | null>(null);

  const suggestQuery = useQuery({
    queryKey: ["stock-wizard", organisation, venue, "suggest", category],
    staleTime: Number.POSITIVE_INFINITY,
    retry: 1,
    queryFn: async () => {
      const { data, error } = await stockWizardApi.post.suggest({ ...scoped, category });
      if (error) throw new Error(error.message);
      return data;
    },
  });

  if (rows === null && suggestQuery.data) {
    setRows(
      suggestQuery.data.rows.map((row) => ({
        ...row,
        qty: row.suggestedQty > 0 ? String(row.suggestedQty) : "",
      })),
    );
  }

  const locations = suggestQuery.data?.locations ?? [];
  const editableRows = rows ?? [];
  const stepValueCents = rowsValueCents(editableRows);
  const countedRows = editableRows.filter((row) => parseQty(row.qty) > 0);

  async function save() {
    if (isSaving) return;
    setIsSaving(true);
    try {
      const items = countedRows.map((row) => ({
        ingredientId: row.ingredientId,
        quantity: parseQty(row.qty),
        locationId: row.locationId,
      }));
      if (items.length > 0) {
        const { error } = await stockWizardApi.post.apply({ ...scoped, items });
        if (error) throw new Error(error.message);
      }
      toast.success(
        `${CATEGORY_LABELS[category]}: ${items.length} counted · ${formatCents(stepValueCents)}`,
      );
      await onSaved(stepValueCents, items.length);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save counts");
      setIsSaving(false);
    }
  }

  return (
    <WizardFrame
      header={
        <WizardFrameHeader
          eyebrow={`Storage · Opening stock · Step ${stepNumber} of ${stepCount}`}
          title={CATEGORY_LABELS[category]}
          titleExtra={
            <Badge variant="secondary">{editableRows.length} ingredients</Badge>
          }
          right={headerRight}
        />
      }
      footer={
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-sm tabular-nums">
            <span className="font-medium">{formatCents(stepValueCents)}</span>
            <span className="text-muted-foreground">
              {" "}
              this category · {formatCents(runningValueCents + stepValueCents)} total
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" disabled={isSaving} onClick={onSkip}>
              Skip
            </Button>
            <Button className="gap-1.5" disabled={isSaving || suggestQuery.isLoading} onClick={() => void save()}>
              {isSaving ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : (
                <ArrowRight className="size-4" aria-hidden />
              )}
              {stepNumber === stepCount ? "Save & finish" : "Save & continue"}
            </Button>
          </div>
        </div>
      }
    >
      {suggestQuery.isLoading ? (
        <div className="text-muted-foreground flex items-center gap-2 py-10 text-sm" aria-busy="true">
          <Loader2 className="size-4 animate-spin" aria-hidden />
          Suggesting counts and locations for {CATEGORY_LABELS[category].toLowerCase()}…
        </div>
      ) : suggestQuery.isError ? (
        <div className="space-y-3 py-6 text-sm">
          <p className="text-destructive">{suggestQuery.error.message}</p>
          <Button variant="outline" size="sm" onClick={() => void suggestQuery.refetch()}>
            Try again
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="text-muted-foreground grid grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_6rem_3rem_5rem] gap-2 px-1 text-xs font-medium">
            <span>Ingredient</span>
            <span>Location</span>
            <span>On hand</span>
            <span />
            <span className="text-right">Value</span>
          </div>
          {editableRows.map((row) => (
            <div
              key={row.ingredientId}
              className="grid grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_6rem_3rem_5rem] items-center gap-2"
            >
              <span className="flex min-w-0 items-center gap-1.5 text-sm">
                <span className="truncate" title={row.name}>
                  {row.name}
                </span>
                {row.saved ? (
                  <Badge variant="outline" className="shrink-0 border-emerald-500/50 px-1.5 py-0 text-[10px] text-emerald-700">
                    Saved
                  </Badge>
                ) : null}
              </span>
              <SearchCombobox
                value={row.locationId}
                ariaLabel={`Location for ${row.name}`}
                placeholder="Location"
                searchPlaceholder="Search locations…"
                options={locations.map((l) => ({ value: l.id, label: l.name }))}
                onValueChange={(value) =>
                  setRows((current) =>
                    (current ?? []).map((r) =>
                      r.ingredientId === row.ingredientId ? { ...r, locationId: value } : r,
                    ),
                  )
                }
              />
              <Input
                type="number"
                inputMode="decimal"
                min="0"
                step="any"
                value={row.qty}
                placeholder="0"
                aria-label={`On hand for ${row.name}`}
                onChange={(event) =>
                  setRows((current) =>
                    (current ?? []).map((r) =>
                      r.ingredientId === row.ingredientId
                        ? { ...r, qty: event.target.value }
                        : r,
                    ),
                  )
                }
              />
              <span className="text-muted-foreground truncate text-sm">{row.unit}</span>
              <span className="text-right text-sm tabular-nums">
                {row.costPerUnitCents > 0
                  ? formatCents(Math.round(parseQty(row.qty) * row.costPerUnitCents))
                  : "—"}
              </span>
            </div>
          ))}
        </div>
      )}
    </WizardFrame>
  );
}
