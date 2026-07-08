"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowRight,
  Bot,
  Check,
  Loader2,
  Plus,
  RefreshCw,
  Trash2,
  TriangleAlert,
} from "lucide-react";
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
import { posCatalogImportApi } from "@/entities/pos-catalog-import/api/endpoints";
import { posCatalogImportKeys } from "@/entities/pos-catalog-import/model/keys";
import { buildRecipePrefillFromPosLine } from "@/entities/pos-catalog-import/model/recipe-prefill";
import type {
  PosCatalogImportRow,
  RecipeWizardSuggestion,
} from "@/entities/pos-catalog-import/model/types";
import { usePosCatalogImportQuery } from "@/entities/pos-catalog-import/model/usePosCatalogImportQuery";
import { useIngredientSelectorQuery } from "@/entities/ingredients/model/useIngredientsQuery";
import type { IngredientSelectorOption } from "@/entities/ingredients/model/types";
import { recipesApi } from "@/entities/recipes/api/endpoints";
import { useRecipeMutations } from "@/entities/recipes/model/useRecipeMutations";

function formatCents(cents: number): string {
  return `$${(cents / 100).toLocaleString("en-AU", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

type EditableLine = {
  key: number;
  ingredientId: string | null;
  name: string;
  /** Kept as the raw input string so partial edits ("0.", "") don't fight the user. */
  quantity: string;
  unit: string;
  unitCostCents: number;
};

let lineKeyCounter = 0;
function nextLineKey(): number {
  lineKeyCounter += 1;
  return lineKeyCounter;
}

function linesFromSuggestion(suggestion: RecipeWizardSuggestion): EditableLine[] {
  return suggestion.lines.map((line) => ({
    key: nextLineKey(),
    ingredientId: line.ingredientId,
    name: line.name,
    quantity: line.quantity != null ? String(line.quantity) : "",
    unit: line.unit,
    unitCostCents: line.unitCostCents,
  }));
}

function parseQuantity(value: string): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function computeCostCents(lines: EditableLine[], serves: number): number {
  const safeServes = Math.max(1, Math.floor(serves || 1));
  const total = lines.reduce(
    (sum, line) => sum + parseQuantity(line.quantity) * line.unitCostCents,
    0,
  );
  return Math.round(total / safeServes);
}

function gpPercent(priceCents: number, costCents: number): number | null {
  if (priceCents <= 0) return null;
  return Math.round(((priceCents - costCents) / priceCents) * 100);
}

/**
 * Guided recipe builder for imported POS items: one in-use unmapped item at a
 * time, an LLM drafts quantified recipe lines from the Square description
 * against the venue's real ingredient catalog, the user adjusts and accepts.
 * Accept creates the recipe (published) and maps it to the POS line via the
 * same endpoints the manual drawer uses. Rendered in the shared WizardFrame —
 * pinned header/footer, scrolling body.
 */
export function ProductsRecipeWizardPage({
  organisation,
  venue,
}: {
  organisation: string;
  venue: string;
}) {
  const router = useRouter();
  const listQuery = usePosCatalogImportQuery({
    organisationSlug: organisation,
    venueSlug: venue,
  });

  // Frozen at first load so completed items don't reshuffle the deck mid-run.
  // With nothing left to build, re-entering the wizard becomes a REVIEW pass
  // over the already-mapped items — same walk, seeded from the saved recipes.
  const [queueIds, setQueueIds] = useState<string[] | null>(null);
  const [mode, setMode] = useState<"build" | "review">("build");
  const [index, setIndex] = useState(0);
  const [completedCount, setCompletedCount] = useState(0);

  const rows = useMemo(() => listQuery.data?.rows ?? [], [listQuery.data?.rows]);
  if (queueIds === null && listQuery.isSuccess) {
    const bySection = (a: PosCatalogImportRow, b: PosCatalogImportRow) =>
      a.sectionName.localeCompare(b.sectionName) || a.name.localeCompare(b.name);
    const unmapped = rows
      .filter((row) => row.showOnMenu && !row.recipeId && !row.missingFromSquare)
      .sort(bySection);
    if (unmapped.length > 0) {
      setQueueIds(unmapped.map((row) => row.menuItemId));
      setMode("build");
    } else {
      const mapped = rows
        .filter((row) => row.showOnMenu && row.recipeId && !row.missingFromSquare)
        .sort(bySection);
      setQueueIds(mapped.map((row) => row.menuItemId));
      setMode("review");
    }
  }

  const productsHref = buildScopedPath(organisation, venue, "settings/inventory-setup/products");
  const exitButton = (
    <Button variant="outline" size="sm" className="gap-1.5" onClick={() => router.push(productsHref)}>
      <ArrowLeft className="size-4" aria-hidden />
      Exit
    </Button>
  );

  const currentId = queueIds?.[index] ?? null;
  const currentRow = currentId
    ? (rows.find((row) => row.menuItemId === currentId) ?? null)
    : null;

  if (listQuery.isLoading || queueIds === null) {
    return (
      <WizardViewport className="px-4 pb-4">
        <WizardFrame
          header={<WizardFrameHeader eyebrow="Products" title="Recipe wizard" right={exitButton} />}
        >
          <div className="text-muted-foreground flex items-center gap-2 py-10 text-sm" aria-busy="true">
            <Loader2 className="size-4 animate-spin" aria-hidden />
            Loading POS items…
          </div>
        </WizardFrame>
      </WizardViewport>
    );
  }

  if (queueIds.length === 0 || index >= queueIds.length) {
    const finishedRun = queueIds.length > 0;
    const finishedMessage =
      mode === "review"
        ? `Reviewed ${queueIds.length} recipes${completedCount > 0 ? ` — ${completedCount} updated.` : " — no changes needed."}`
        : `${completedCount} of ${queueIds.length} items got a recipe this run${
            completedCount < queueIds.length
              ? " — skipped items stay in the POS list to finish later."
              : "."
          }`;
    return (
      <WizardViewport className="px-4 pb-4">
        <WizardFrame
          header={<WizardFrameHeader eyebrow="Products" title="Recipe wizard" right={exitButton} />}
          footer={
            <div className="flex items-center justify-end">
              <Button className="gap-1.5" onClick={() => router.push(productsHref)}>
                <Check className="size-4" aria-hidden />
                Back to Products
              </Button>
            </div>
          }
        >
          <div className="space-y-3 py-6 text-sm">
            <p className="flex items-center gap-2 font-medium">
              <Check className="size-4 text-emerald-600" aria-hidden />
              {finishedRun
                ? mode === "review"
                  ? "Review complete"
                  : "Recipe run complete"
                : "Nothing to build"}
            </p>
            <p className="text-muted-foreground">
              {finishedRun
                ? finishedMessage
                : "Every in-use POS item already has a recipe, or none are marked in use yet."}
            </p>
          </div>
        </WizardFrame>
      </WizardViewport>
    );
  }

  return (
    <WizardViewport className="px-4 pb-4">
      {currentRow && mode === "review" ? (
        <ReviewItemFrame
          key={currentRow.menuItemId}
          organisation={organisation}
          venue={venue}
          row={currentRow}
          position={`Item ${index + 1} of ${queueIds.length}`}
          exitButton={exitButton}
          onBack={index > 0 ? () => setIndex((i) => i - 1) : undefined}
          onDone={(updated) => {
            if (updated) setCompletedCount((count) => count + 1);
            setIndex((i) => i + 1);
          }}
        />
      ) : currentRow ? (
        <WizardItemFrame
          key={currentRow.menuItemId}
          organisation={organisation}
          venue={venue}
          row={currentRow}
          position={`Item ${index + 1} of ${queueIds.length}`}
          exitButton={exitButton}
          onDone={(created) => {
            if (created) setCompletedCount((count) => count + 1);
            setIndex((i) => i + 1);
          }}
        />
      ) : (
        <WizardFrame
          header={<WizardFrameHeader eyebrow="Products" title="Recipe wizard" right={exitButton} />}
          footer={
            <div className="flex items-center justify-end">
              <Button size="sm" onClick={() => setIndex((i) => i + 1)}>
                Next
              </Button>
            </div>
          }
        >
          <p className="text-muted-foreground py-8 text-sm">
            This item is no longer awaiting a recipe.
          </p>
        </WizardFrame>
      )}
    </WizardViewport>
  );
}

function WizardItemFrame({
  organisation,
  venue,
  row,
  position,
  exitButton,
  onDone,
}: {
  organisation: string;
  venue: string;
  row: PosCatalogImportRow;
  position: string;
  exitButton: React.ReactNode;
  onDone: (created: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const { createRecipe } = useRecipeMutations({
    organisationSlug: organisation,
    venueSlug: venue,
  });
  const ingredientOptionsQuery = useIngredientSelectorQuery({
    organisationSlug: organisation,
    venueSlug: venue,
  });
  const ingredientOptions = ingredientOptionsQuery.data ?? [];

  const [regenNonce, setRegenNonce] = useState(0);
  const suggestionQuery = useQuery({
    queryKey: [
      "pos-catalog-import",
      organisation,
      venue,
      "recipe-wizard-suggest",
      row.menuItemId,
      regenNonce,
    ],
    staleTime: Number.POSITIVE_INFINITY,
    retry: 1,
    queryFn: async () => {
      const { data, error } = await posCatalogImportApi.post.recipeWizardSuggest({
        organisationSlug: organisation,
        venueSlug: venue,
        menuItemId: row.menuItemId,
        regenerate: regenNonce > 0,
      });
      if (error) throw new Error(error.message);
      return data;
    },
  });

  const [lines, setLines] = useState<EditableLine[] | null>(null);
  const [serves, setServes] = useState<number>(1);
  const [isSaving, setIsSaving] = useState(false);

  // Seed editable state once per suggestion arrival (frame remounts per item,
  // regenerate resets below).
  if (lines === null && suggestionQuery.data) {
    setLines(linesFromSuggestion(suggestionQuery.data));
    setServes(suggestionQuery.data.serves);
  }

  const suggestion = suggestionQuery.data ?? null;
  const editableLines = lines ?? [];
  const costCents = computeCostCents(editableLines, serves);
  const gp = gpPercent(row.priceCents, costCents);
  const unmatchedCount = editableLines.filter(
    (line) => line.ingredientId === null && line.name.trim().length > 0,
  ).length;
  const readyLines = editableLines.filter(
    (line) => line.name.trim().length > 0 && parseQuantity(line.quantity) > 0,
  );
  const missingQuantityCount = editableLines.filter(
    (line) => line.name.trim().length > 0 && parseQuantity(line.quantity) <= 0,
  ).length;
  const canAccept = !isSaving && readyLines.length > 0 && missingQuantityCount === 0;

  function updateLine(key: number, patch: Partial<EditableLine>) {
    setLines((current) =>
      (current ?? []).map((line) => (line.key === key ? { ...line, ...patch } : line)),
    );
  }

  function selectIngredient(key: number, option: IngredientSelectorOption) {
    updateLine(key, {
      ingredientId: option.id,
      name: option.name,
      unit: option.unit,
      unitCostCents: option.costPerUnitCents,
    });
  }

  async function accept() {
    if (!canAccept) return;
    setIsSaving(true);
    try {
      const prefill = buildRecipePrefillFromPosLine(row);
      const created = await createRecipe.mutateAsync({
        organisationSlug: organisation,
        venueSlug: venue,
        payload: {
          name: row.name,
          description: row.description ?? null,
          category: prefill.category,
          serves: Math.max(1, Math.floor(serves || 1)),
          wastagePercent: 0,
          gpTargetPercent: 65,
          costPerServe: costCents,
          suggestedPrice: row.priceCents,
          status: "published",
          instructions: "",
          ingredients: readyLines.map((line) => ({
            ingredientId: line.ingredientId,
            name: line.name.trim(),
            quantity: parseQuantity(line.quantity),
            unit: line.unit.trim() || "each",
            unitCostCents: line.unitCostCents,
            isSubRecipe: false,
          })),
          steps: [],
          allergens: [],
        },
      });

      const { error } = await posCatalogImportApi.put.recipe({
        organisationSlug: organisation,
        venueSlug: venue,
        menuItemId: row.menuItemId,
        recipeId: created.id,
      });
      if (error) throw new Error(error.message);

      await queryClient.invalidateQueries({
        queryKey: posCatalogImportKeys.list(organisation, venue),
      });
      toast.success(
        gp != null ? `${row.name}: recipe saved · GP ${gp}%` : `${row.name}: recipe saved`,
      );
      onDone(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save recipe");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <WizardFrame
      header={
        <WizardFrameHeader
          eyebrow={`Products · Recipe wizard · ${position}`}
          title={row.name}
          titleExtra={
            <>
              <Badge variant="secondary">{row.sectionName || "No section"}</Badge>
              <Badge variant="outline">{formatCents(row.priceCents)}</Badge>
            </>
          }
          right={exitButton}
        />
      }
      footer={
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5"
              disabled={suggestionQuery.isFetching || isSaving}
              onClick={() => {
                setLines(null);
                setRegenNonce((nonce) => nonce + 1);
              }}
            >
              <RefreshCw
                className={suggestionQuery.isFetching ? "size-4 animate-spin" : "size-4"}
                aria-hidden
              />
              Regenerate
            </Button>
            <div className="text-sm tabular-nums">
              <span className="font-medium">{formatCents(costCents)} / serve</span>
              <span className="text-muted-foreground">
                {" "}
                {gp != null ? `· GP ${gp}% at ${formatCents(row.priceCents)}` : "· no sell price"}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" disabled={isSaving} onClick={() => onDone(false)}>
              Skip
            </Button>
            <Button className="gap-1.5" disabled={!canAccept} onClick={() => void accept()}>
              {isSaving ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : (
                <ArrowRight className="size-4" aria-hidden />
              )}
              Accept & next
            </Button>
          </div>
        </div>
      }
    >
      {row.description ? (
        <p className="text-muted-foreground text-sm">{row.description}</p>
      ) : (
        <p className="text-muted-foreground text-sm italic">
          No POS description — the draft below is inferred from the item name.
        </p>
      )}

      {suggestionQuery.isLoading ? (
        <div className="text-muted-foreground flex items-center gap-2 py-10 text-sm" aria-busy="true">
          <Loader2 className="size-4 animate-spin" aria-hidden />
          Drafting recipe from your ingredient list…
        </div>
      ) : suggestionQuery.isError ? (
        <div className="space-y-3 py-6 text-sm">
          <p className="text-destructive">
            Couldn't draft a suggestion: {suggestionQuery.error.message}
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setLines(null);
              setRegenNonce((nonce) => nonce + 1);
            }}
          >
            Try again
          </Button>
        </div>
      ) : (
        <div className="mt-3 space-y-3">
          {suggestion?.fallbackUsed ? (
            <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-sm">
              <TriangleAlert className="mt-0.5 size-4 shrink-0 text-amber-600" aria-hidden />
              <span>
                AI drafting was unavailable, so these lines were matched from the
                description only — add the amounts yourself.
              </span>
            </div>
          ) : suggestion?.notes ? (
            <div className="text-muted-foreground flex items-start gap-2 text-sm">
              <Bot className="mt-0.5 size-4 shrink-0" aria-hidden />
              <span>{suggestion.notes}</span>
            </div>
          ) : null}

          <div className="space-y-2">
            {editableLines.map((line) => (
              <div
                key={line.key}
                className="grid grid-cols-[minmax(0,1fr)_5.5rem_3.5rem_5rem_2rem] items-center gap-2"
              >
                <div className="min-w-0">
                  <SearchCombobox
                    value={line.ingredientId ?? "unmatched"}
                    ariaLabel={`Ingredient for ${line.name}`}
                    placeholder="Pick ingredient"
                    searchPlaceholder="Search ingredients…"
                    emptyLabel="No ingredient matches."
                    triggerClassName={
                      line.ingredientId === null ? "border-amber-500/60" : undefined
                    }
                    options={[
                      {
                        value: "unmatched",
                        label:
                          line.ingredientId === null
                            ? `No match: "${line.name}"`
                            : "Detach ingredient",
                      },
                      ...ingredientOptions.map((option) => ({
                        value: option.id,
                        label: option.name,
                        hint: option.unit,
                      })),
                    ]}
                    onValueChange={(value) => {
                      if (value === "unmatched") {
                        updateLine(line.key, { ingredientId: null, unitCostCents: 0 });
                        return;
                      }
                      const option = ingredientOptions.find((o) => o.id === value);
                      if (option) selectIngredient(line.key, option);
                    }}
                  />
                </div>
                <Input
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="any"
                  value={line.quantity}
                  placeholder="Qty"
                  aria-label={`Quantity for ${line.name}`}
                  className={
                    parseQuantity(line.quantity) <= 0 ? "border-amber-500/60" : undefined
                  }
                  onChange={(event) => updateLine(line.key, { quantity: event.target.value })}
                />
                <span className="text-muted-foreground truncate text-sm">{line.unit}</span>
                <span className="text-right text-sm tabular-nums">
                  {line.unitCostCents > 0
                    ? formatCents(Math.round(parseQuantity(line.quantity) * line.unitCostCents))
                    : "—"}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Remove ${line.name}`}
                  onClick={() =>
                    setLines((current) => (current ?? []).filter((l) => l.key !== line.key))
                  }
                >
                  <Trash2 className="size-4" aria-hidden />
                </Button>
              </div>
            ))}

            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() =>
                setLines((current) => [
                  ...(current ?? []),
                  {
                    key: nextLineKey(),
                    ingredientId: null,
                    name: "",
                    quantity: "",
                    unit: "each",
                    unitCostCents: 0,
                  },
                ])
              }
            >
              <Plus className="size-4" aria-hidden />
              Add ingredient
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <label className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Serves</span>
              <Input
                type="number"
                min="1"
                step="1"
                className="w-16"
                value={String(serves)}
                onChange={(event) =>
                  setServes(Math.max(1, Math.floor(Number(event.target.value) || 1)))
                }
              />
            </label>
            {unmatchedCount > 0 ? (
              <Badge variant="outline" className="border-amber-500/60 text-amber-700">
                {unmatchedCount} line{unmatchedCount === 1 ? "" : "s"} without an ingredient
              </Badge>
            ) : null}
          </div>
        </div>
      )}
    </WizardFrame>
  );
}

/** Stable fingerprint of the editable state, for dirty-checking in review. */
function snapshotOf(lines: EditableLine[], serves: number): string {
  return JSON.stringify({
    serves,
    lines: lines.map((line) => ({
      ingredientId: line.ingredientId,
      name: line.name.trim(),
      quantity: parseQuantity(line.quantity),
      unit: line.unit,
    })),
  });
}

function ReviewItemFrame({
  organisation,
  venue,
  row,
  position,
  exitButton,
  onBack,
  onDone,
}: {
  organisation: string;
  venue: string;
  row: PosCatalogImportRow;
  position: string;
  exitButton: React.ReactNode;
  onBack?: () => void;
  onDone: (updated: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const ingredientOptionsQuery = useIngredientSelectorQuery({
    organisationSlug: organisation,
    venueSlug: venue,
  });
  const ingredientOptions = ingredientOptionsQuery.data ?? [];

  const detailQuery = useQuery({
    queryKey: ["recipe-review-detail", organisation, venue, row.recipeId],
    enabled: row.recipeId !== null,
    staleTime: Number.POSITIVE_INFINITY,
    queryFn: async () => {
      const { data, error } = await recipesApi.get.detail({
        organisationSlug: organisation,
        venueSlug: venue,
        recipeId: row.recipeId!,
      });
      if (error) throw new Error(error.message);
      return data;
    },
  });

  const [lines, setLines] = useState<EditableLine[] | null>(null);
  const [serves, setServes] = useState<number>(1);
  const [baseline, setBaseline] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);

  // Seed from the SAVED recipe — this is a review pass, nothing regenerates.
  if (lines === null && detailQuery.data) {
    const seeded = detailQuery.data.ingredients.map((ingredient) => ({
      key: nextLineKey(),
      ingredientId: ingredient.ingredientId ?? null,
      name: ingredient.name,
      quantity: String(ingredient.quantity),
      unit: ingredient.unit,
      unitCostCents: ingredient.unitCostCents,
    }));
    setLines(seeded);
    setServes(detailQuery.data.serves);
    setBaseline(snapshotOf(seeded, detailQuery.data.serves));
  }

  const editableLines = lines ?? [];
  const costCents = computeCostCents(editableLines, serves);
  const gp = gpPercent(row.priceCents, costCents);
  const readyLines = editableLines.filter(
    (line) => line.name.trim().length > 0 && parseQuantity(line.quantity) > 0,
  );
  const isDirty = baseline !== "" && snapshotOf(editableLines, serves) !== baseline;
  const canSave = !isSaving && isDirty && readyLines.length > 0;

  function updateLine(key: number, patch: Partial<EditableLine>) {
    setLines((current) =>
      (current ?? []).map((line) => (line.key === key ? { ...line, ...patch } : line)),
    );
  }

  async function saveChanges() {
    const detail = detailQuery.data;
    if (!detail || !row.recipeId || !canSave) return;
    setIsSaving(true);
    try {
      const { error } = await recipesApi.patch.update({
        organisationSlug: organisation,
        venueSlug: venue,
        recipeId: row.recipeId,
        payload: {
          name: detail.name,
          description: detail.description || null,
          category: detail.category,
          serves: Math.max(1, Math.floor(serves || 1)),
          wastagePercent: detail.wastagePercent,
          gpTargetPercent: detail.gpPercent,
          costPerServe: costCents,
          suggestedPrice: detail.suggestedPrice,
          status: detail.status,
          instructions: detail.instructions,
          ingredients: readyLines.map((line) => ({
            ingredientId: line.ingredientId,
            name: line.name.trim(),
            quantity: parseQuantity(line.quantity),
            unit: line.unit.trim() || "each",
            unitCostCents: line.unitCostCents,
            isSubRecipe: false,
          })),
          steps: detail.steps,
          allergens: detail.allergens,
        },
      });
      if (error) throw new Error(error.message);

      // Re-map with the same recipe to recompute the POS line's cost/GP.
      const mapped = await posCatalogImportApi.put.recipe({
        organisationSlug: organisation,
        venueSlug: venue,
        menuItemId: row.menuItemId,
        recipeId: row.recipeId,
      });
      if (mapped.error) throw new Error(mapped.error.message);

      await queryClient.invalidateQueries({
        queryKey: posCatalogImportKeys.list(organisation, venue),
      });
      toast.success(
        gp != null ? `${row.name}: recipe updated · GP ${gp}%` : `${row.name}: recipe updated`,
      );
      onDone(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update recipe");
      setIsSaving(false);
    }
  }

  return (
    <WizardFrame
      header={
        <WizardFrameHeader
          eyebrow={`Products · Review · ${position}`}
          title={row.name}
          titleExtra={
            <>
              <Badge variant="secondary">{row.sectionName || "No section"}</Badge>
              <Badge variant="outline">{formatCents(row.priceCents)}</Badge>
              <Badge variant="outline" className="border-emerald-500/50 text-emerald-700">
                Saved recipe
              </Badge>
            </>
          }
          right={exitButton}
        />
      }
      footer={
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            {onBack ? (
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5"
                disabled={isSaving}
                onClick={onBack}
              >
                <ArrowLeft className="size-4" aria-hidden />
                Back
              </Button>
            ) : null}
            <div className="text-sm tabular-nums">
              <span className="font-medium">{formatCents(costCents)} / serve</span>
              <span className="text-muted-foreground">
                {" "}
                {gp != null ? `· GP ${gp}% at ${formatCents(row.priceCents)}` : "· no sell price"}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" disabled={isSaving} onClick={() => onDone(false)}>
              {isDirty ? "Discard & next" : "Looks good, next"}
            </Button>
            <Button className="gap-1.5" disabled={!canSave} onClick={() => void saveChanges()}>
              {isSaving ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : (
                <Check className="size-4" aria-hidden />
              )}
              Save changes & next
            </Button>
          </div>
        </div>
      }
    >
      {row.description ? (
        <p className="text-muted-foreground text-sm">{row.description}</p>
      ) : null}

      {detailQuery.isLoading ? (
        <div className="text-muted-foreground flex items-center gap-2 py-10 text-sm" aria-busy="true">
          <Loader2 className="size-4 animate-spin" aria-hidden />
          Loading saved recipe…
        </div>
      ) : detailQuery.isError ? (
        <div className="space-y-3 py-6 text-sm">
          <p className="text-destructive">
            Couldn&apos;t load the recipe: {detailQuery.error.message}
          </p>
          <Button variant="outline" size="sm" onClick={() => void detailQuery.refetch()}>
            Try again
          </Button>
        </div>
      ) : (
        <div className="mt-3 space-y-3">
          <div className="space-y-2">
            {editableLines.map((line) => (
              <div
                key={line.key}
                className="grid grid-cols-[minmax(0,1fr)_5.5rem_3.5rem_5rem_2rem] items-center gap-2"
              >
                <div className="min-w-0">
                  <SearchCombobox
                    value={line.ingredientId ?? "unmatched"}
                    ariaLabel={`Ingredient for ${line.name}`}
                    placeholder="Pick ingredient"
                    searchPlaceholder="Search ingredients…"
                    emptyLabel="No ingredient matches."
                    triggerClassName={
                      line.ingredientId === null ? "border-amber-500/60" : undefined
                    }
                    options={[
                      {
                        value: "unmatched",
                        label:
                          line.ingredientId === null
                            ? `No match: "${line.name}"`
                            : "Detach ingredient",
                      },
                      ...ingredientOptions.map((option) => ({
                        value: option.id,
                        label: option.name,
                        hint: option.unit,
                      })),
                    ]}
                    onValueChange={(value) => {
                      if (value === "unmatched") {
                        updateLine(line.key, { ingredientId: null, unitCostCents: 0 });
                        return;
                      }
                      const option = ingredientOptions.find((o) => o.id === value);
                      if (option) {
                        updateLine(line.key, {
                          ingredientId: option.id,
                          name: option.name,
                          unit: option.unit,
                          unitCostCents: option.costPerUnitCents,
                        });
                      }
                    }}
                  />
                </div>
                <Input
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="any"
                  value={line.quantity}
                  placeholder="Qty"
                  aria-label={`Quantity for ${line.name}`}
                  onChange={(event) => updateLine(line.key, { quantity: event.target.value })}
                />
                <span className="text-muted-foreground truncate text-sm">{line.unit}</span>
                <span className="text-right text-sm tabular-nums">
                  {line.unitCostCents > 0
                    ? formatCents(Math.round(parseQuantity(line.quantity) * line.unitCostCents))
                    : "—"}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Remove ${line.name}`}
                  onClick={() =>
                    setLines((current) => (current ?? []).filter((l) => l.key !== line.key))
                  }
                >
                  <Trash2 className="size-4" aria-hidden />
                </Button>
              </div>
            ))}

            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() =>
                setLines((current) => [
                  ...(current ?? []),
                  {
                    key: nextLineKey(),
                    ingredientId: null,
                    name: "",
                    quantity: "",
                    unit: "each",
                    unitCostCents: 0,
                  },
                ])
              }
            >
              <Plus className="size-4" aria-hidden />
              Add ingredient
            </Button>
          </div>

          <label className="flex items-center gap-2 pt-1 text-sm">
            <span className="text-muted-foreground">Serves</span>
            <Input
              type="number"
              min="1"
              step="1"
              className="w-16"
              value={String(serves)}
              onChange={(event) =>
                setServes(Math.max(1, Math.floor(Number(event.target.value) || 1)))
              }
            />
          </label>
        </div>
      )}
    </WizardFrame>
  );
}
