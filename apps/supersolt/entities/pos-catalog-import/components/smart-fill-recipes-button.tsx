"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@workspace/ui/components/button";

import { posCatalogImportApi } from "@/entities/pos-catalog-import/api/endpoints";
import { posCatalogImportKeys } from "@/entities/pos-catalog-import/model/keys";
import { buildRecipePrefillFromPosLine } from "@/entities/pos-catalog-import/model/recipe-prefill";
import type { PosCatalogImportRow } from "@/entities/pos-catalog-import/model/types";
import { recipesApi } from "@/entities/recipes/api/endpoints";
import { recipesKeys } from "@/entities/recipes/model/keys";

const CONCURRENCY = 3;

type RunProgress = { total: number; done: number };

/**
 * Dev/test bulk fill for the Products stage: runs the recipe wizard's
 * suggest → create → map flow across every in-use unmapped POS item in one
 * click, so stock/consumption setup has full recipe coverage. Items whose
 * suggestion has no usable quantities (AI fallback) are left unmapped for the
 * wizard/manual flow — a recipe is never force-created from guesswork.
 * Unmatched-but-quantified lines are kept as zero-cost manual entries, same
 * as accepting them in the wizard (the POS table flags those recipes as
 * cost-incomplete).
 */
export function SmartFillRecipesButton({
  organisation,
  venue,
  rows,
}: {
  organisation: string;
  venue: string;
  rows: PosCatalogImportRow[];
}) {
  const queryClient = useQueryClient();
  const [progress, setProgress] = useState<RunProgress | null>(null);
  const cancelledRef = useRef(false);

  useEffect(() => {
    cancelledRef.current = false;
    return () => {
      cancelledRef.current = true;
    };
  }, []);

  const pending = useMemo(
    () => rows.filter((row) => row.showOnMenu && !row.recipeId && !row.missingFromSquare),
    [rows],
  );

  async function run() {
    if (pending.length === 0 || progress) return;
    // Snapshot at click time so completions don't reshuffle the work list.
    const queue = [...pending];
    setProgress({ total: queue.length, done: 0 });
    const scoped = { organisationSlug: organisation, venueSlug: venue };
    const tally = { created: 0, leftForReview: 0, failed: 0 };
    let firstError: string | null = null;

    let cursor = 0;
    const worker = async () => {
      while (!cancelledRef.current) {
        const row = queue[cursor++];
        if (!row) return;

        try {
          const suggested = await posCatalogImportApi.post.recipeWizardSuggest({
            ...scoped,
            menuItemId: row.menuItemId,
          });
          if (suggested.error) throw new Error(suggested.error.message);
          const s = suggested.data;

          const readyLines = s.lines.filter(
            (line) => line.quantity != null && line.quantity > 0 && line.name.trim().length > 0,
          );

          if (s.fallbackUsed || readyLines.length === 0) {
            tally.leftForReview += 1;
          } else {
            const serves = Math.max(1, Math.floor(s.serves || 1));
            const costCents = Math.round(
              readyLines.reduce((sum, line) => sum + (line.quantity ?? 0) * line.unitCostCents, 0) /
                serves,
            );
            const prefill = buildRecipePrefillFromPosLine(row);

            const created = await recipesApi.post.create(organisation, venue, {
              name: row.name,
              description: row.description ?? null,
              category: prefill.category,
              serves,
              wastagePercent: 0,
              gpTargetPercent: 65,
              costPerServe: costCents,
              suggestedPrice: row.priceCents,
              status: "published",
              instructions: "",
              ingredients: readyLines.map((line) => ({
                ingredientId: line.ingredientId,
                name: line.name.trim(),
                quantity: line.quantity ?? 0,
                unit: line.unit.trim() || "each",
                unitCostCents: line.unitCostCents,
                isSubRecipe: false,
              })),
              steps: [],
              allergens: [],
            });
            if (created.error) throw new Error(created.error.message);

            const mapped = await posCatalogImportApi.put.recipe({
              ...scoped,
              menuItemId: row.menuItemId,
              recipeId: created.data.id,
            });
            if (mapped.error) throw new Error(mapped.error.message);
            tally.created += 1;
          }
        } catch (error) {
          tally.failed += 1;
          firstError ??= error instanceof Error ? error.message : String(error);
        }

        setProgress((p) => (p ? { ...p, done: p.done + 1 } : p));
      }
    };

    await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));

    if (cancelledRef.current) return;

    await queryClient.invalidateQueries({
      queryKey: posCatalogImportKeys.list(organisation, venue),
    });
    await queryClient.invalidateQueries({ queryKey: recipesKeys.all() });

    setProgress(null);
    const summary =
      `Smart fill: ${tally.created} recipe${tally.created === 1 ? "" : "s"} created` +
      (tally.leftForReview > 0 ? ` · ${tally.leftForReview} left for review` : "") +
      (tally.failed > 0 ? ` · ${tally.failed} failed` : "");
    if (tally.failed > 0) {
      toast.error(firstError ? `${summary} — ${firstError}` : summary);
    } else {
      toast.success(summary);
    }
  }

  if (pending.length === 0 && !progress) return null;

  return (
    <Button
      type="button"
      variant="outline"
      className="gap-1.5"
      disabled={progress != null}
      onClick={() => void run()}
    >
      {progress ? (
        <>
          <Loader2 className="size-4 animate-spin" aria-hidden />
          Smart filling… {progress.done}/{progress.total}
        </>
      ) : (
        <>
          <Sparkles className="size-4" aria-hidden />
          Smart fill {pending.length} recipe{pending.length === 1 ? "" : "s"}
        </>
      )}
    </Button>
  );
}
