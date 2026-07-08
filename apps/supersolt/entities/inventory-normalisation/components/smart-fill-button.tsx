"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@workspace/ui/components/button";
import { inventoryNormalisationApi } from "@/entities/inventory-normalisation/api/endpoints";
import { inventoryNormalisationKeys } from "@/entities/inventory-normalisation/model/keys";
import { inventorySetupKeys } from "@/entities/inventory-setup/model/keys";
import { ingredientsKeys } from "@/entities/ingredients/model/keys";
import { groupQueueItemVariants } from "@/entities/inventory-normalisation/lib/group-queue-item-variants";
import type { NormalisationQueueItem } from "@/entities/inventory-normalisation/model/types";

const CONCURRENCY = 4;

type RunProgress = {
  total: number;
  done: number;
};

/**
 * Dev/test bulk fill: runs the exact suggest → commit flow the wizard walks
 * through one item at a time, across every pending product group in one click,
 * so a test venue can jump straight to the Products step. One AI suggestion
 * per product group; unit-size variants fold in via alsoRawItemIds. Groups the
 * AI flags as non-inventory are left pending for human review, never
 * force-created. Items are snapshotted at click time, so mid-run refetches
 * don't change the work list.
 */
export function SmartFillButton({
  organisation,
  venue,
  items,
}: {
  organisation: string;
  venue: string;
  items: NormalisationQueueItem[];
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

  const groupCount = useMemo(() => groupQueueItemVariants(items).length, [items]);

  async function run() {
    const groups = groupQueueItemVariants(items);
    if (groups.length === 0 || progress) return;

    setProgress({ total: groups.length, done: 0 });
    const scoped = { organisationSlug: organisation, venueSlug: venue };
    const tally = { created: 0, leftForReview: 0, failed: 0 };
    let firstError: string | null = null;

    let cursor = 0;
    const worker = async () => {
      while (!cancelledRef.current) {
        const group = groups[cursor++];
        if (!group) return;
        const rep = group.representative;

        try {
          const suggested = await inventoryNormalisationApi.post.suggest({
            ...scoped,
            rawItemId: rep.id,
          });
          if (suggested.error) throw new Error(suggested.error.message);
          const s = suggested.data;

          if (s.likelyNonInventory) {
            tally.leftForReview += 1;
          } else {
            const committed = await inventoryNormalisationApi.post.commit({
              ...scoped,
              payload: {
                rawItemId: rep.id,
                mode: "create",
                ingredient: {
                  name: s.ingredientName,
                  category: s.ingredientCategory,
                  unit: s.ingredientUnit,
                },
                supplierProduct: {
                  name: s.productName,
                  packLabel: s.packLabel,
                  unitsPerPack: s.unitsPerPack,
                  packUnit: s.packUnit,
                  unitPriceCents: s.unitPriceCents ?? rep.lastUnitPriceCents ?? 0,
                },
                alsoRawItemIds: group.variants
                  .filter((v) => v.id !== rep.id)
                  .map((v) => v.id),
              },
            });
            if (committed.error) throw new Error(committed.error.message);
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

    await queryClient.invalidateQueries({ queryKey: inventoryNormalisationKeys.all });
    await queryClient.invalidateQueries({
      queryKey: inventorySetupKeys.progress(organisation, venue),
    });
    await queryClient.invalidateQueries({ queryKey: ingredientsKeys.all() });

    setProgress(null);
    const summary =
      `Smart fill: ${tally.created} ingredient${tally.created === 1 ? "" : "s"} created` +
      (tally.leftForReview > 0 ? ` · ${tally.leftForReview} left for review` : "") +
      (tally.failed > 0 ? ` · ${tally.failed} failed` : "");
    if (tally.failed > 0) {
      toast.error(firstError ? `${summary} — ${firstError}` : summary);
    } else {
      toast.success(summary);
    }
  }

  if (groupCount === 0 && !progress) return null;

  return (
    <Button
      variant="outline"
      className="gap-1.5"
      disabled={progress != null}
      onClick={run}
    >
      {progress ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          Smart filling… {progress.done}/{progress.total}
        </>
      ) : (
        <>
          <Sparkles className="h-4 w-4" aria-hidden />
          Smart fill {groupCount} product{groupCount === 1 ? "" : "s"}
        </>
      )}
    </Button>
  );
}
