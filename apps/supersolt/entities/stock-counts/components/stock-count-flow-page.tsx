"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { ArrowLeft, Camera, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { buildScopedPath } from "@/lib/build-scoped-path";
import { MixedUnitEntry } from "@/entities/stock-counts/components/mixed-unit-entry";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { Input } from "@workspace/ui/components/input";
import { Progress } from "@workspace/ui/components/progress";
import {
  useStockCountActionMutation,
  useStockCountDetailQuery,
  useStockCountEntryMutation,
  useStockCountPhotoMutation,
} from "@/entities/stock-counts/model/use-stock-counts-query";

type StockCountFlowPageProps = {
  organisation: string;
  venue: string;
  countId: string;
};

export function StockCountFlowPage({
  organisation,
  venue,
  countId,
}: StockCountFlowPageProps) {
  const { data, isLoading, error } = useStockCountDetailQuery({
    organisation,
    venue,
    countId,
  });
  const entryMutation = useStockCountEntryMutation({ organisation, venue, countId });
  const photoMutation = useStockCountPhotoMutation({ organisation, venue, countId });
  const actionMutation = useStockCountActionMutation({ organisation, venue, countId });
  const [draftQty, setDraftQty] = useState<Record<string, string>>({});
  const [mixedDraft, setMixedDraft] = useState<
    Record<string, { cartons: string; looseUnits: string; partialBaseUnits: string }>
  >({});
  const [activeIngredientId, setActiveIngredientId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [photoEntryId, setPhotoEntryId] = useState<string | null>(null);

  const progress = useMemo(() => {
    if (!data?.entries.length) return 0;
    return Math.round((data.completedItemCount / data.itemCount) * 100);
  }, [data]);

  async function saveEntry(ingredientId: string) {
    const entry = data?.entries.find((e) => e.ingredientId === ingredientId);
    const usesMixed =
      entry?.unitsPerPack !== null &&
      entry?.unitsPerPack !== undefined &&
      entry.unitsPerPack > 1;

    try {
      if (usesMixed && entry) {
        const mixed = mixedDraft[ingredientId] ?? {
          cartons: "",
          looseUnits: "",
          partialBaseUnits: "",
        };
        await entryMutation.mutateAsync({
          ingredientId,
          mixedUnitBreakdown: {
            cartons: Number(mixed.cartons) || 0,
            looseUnits: Number(mixed.looseUnits) || 0,
            partialBaseUnits: Number(mixed.partialBaseUnits) || 0,
            unitsPerCarton: entry.unitsPerPack ?? 1,
          },
        });
      } else {
        const raw = draftQty[ingredientId];
        const qty = Number(raw);
        if (!Number.isFinite(qty) || qty < 0) {
          toast.error("Enter a valid quantity");
          return;
        }
        await entryMutation.mutateAsync({ ingredientId, countedQty: qty });
      }
      toast.success("Saved");
      setActiveIngredientId(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    }
  }

  async function handlePhotoSelected(file: File | undefined, entryId: string) {
    if (!file) return;
    try {
      await photoMutation.mutateAsync({ entryId, file });
      toast.success("Photo uploaded");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Photo upload failed");
    }
  }

  async function submitCount() {
    try {
      await actionMutation.mutateAsync({ action: "submit" });
      toast.success("Count submitted for approval");
      window.location.href = buildScopedPath(
        organisation,
        venue,
        `stock-management/stock-counts/${countId}`,
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Submit failed");
    }
  }

  if (isLoading) {
    return <p className="text-muted-foreground text-sm">Loading count…</p>;
  }
  if (error || !data) {
    return <p className="text-destructive text-sm">{error?.message ?? "Count not found"}</p>;
  }

  return (
    <section className="mx-auto flex w-full max-w-lg flex-col gap-4 pb-24">
      <div className="flex items-center gap-2">
        <Button asChild variant="ghost" size="icon">
          <Link
            href={buildScopedPath(
              organisation,
              venue,
              "stock-management/stock-counts",
            )}
          >
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-lg font-semibold">{data.name}</h1>
          <p className="text-muted-foreground text-xs">
            {data.completedItemCount} of {data.itemCount} counted
          </p>
        </div>
      </div>

      <Progress value={progress} />

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const entryId = photoEntryId;
          const file = e.target.files?.[0];
          if (entryId) void handlePhotoSelected(file, entryId);
          e.target.value = "";
          setPhotoEntryId(null);
        }}
      />

      <div className="space-y-2">
        {data.entries.map((entry) => {
          const isActive = activeIngredientId === entry.ingredientId;
          const displayQty =
            entry.countedQty ?? draftQty[entry.ingredientId] ?? "";
          const usesMixed =
            entry.unitsPerPack !== null &&
            entry.unitsPerPack !== undefined &&
            entry.unitsPerPack > 1;
          const mixed =
            mixedDraft[entry.ingredientId] ?? {
              cartons: "",
              looseUnits: "",
              partialBaseUnits: "",
            };
          return (
            <Card key={entry.id}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base">{entry.ingredientName}</CardTitle>
                  {entry.isRowComplete ? (
                    <Badge variant="secondary" className="gap-1">
                      <CheckCircle2 className="size-3" />
                      Done
                    </Badge>
                  ) : null}
                </div>
                {entry.previousCountQty !== null ? (
                  <p className="text-muted-foreground text-xs">
                    Previous: {entry.previousCountQty} {entry.ingredientUnit}
                  </p>
                ) : null}
              </CardHeader>
              <CardContent className="space-y-2">
                {isActive ? (
                  <>
                    {usesMixed ? (
                      <MixedUnitEntry
                        unitsPerPack={entry.unitsPerPack ?? 1}
                        packLabel={entry.packLabel ?? "Carton"}
                        baseUnit={entry.ingredientUnit}
                        cartons={mixed.cartons}
                        looseUnits={mixed.looseUnits}
                        partialBaseUnits={mixed.partialBaseUnits}
                        onCartonsChange={(value) =>
                          setMixedDraft((prev) => ({
                            ...prev,
                            [entry.ingredientId]: { ...mixed, cartons: value },
                          }))
                        }
                        onLooseUnitsChange={(value) =>
                          setMixedDraft((prev) => ({
                            ...prev,
                            [entry.ingredientId]: { ...mixed, looseUnits: value },
                          }))
                        }
                        onPartialBaseUnitsChange={(value) =>
                          setMixedDraft((prev) => ({
                            ...prev,
                            [entry.ingredientId]: {
                              ...mixed,
                              partialBaseUnits: value,
                            },
                          }))
                        }
                      />
                    ) : (
                      <Input
                        inputMode="decimal"
                        placeholder={`Qty (${entry.ingredientUnit})`}
                        value={draftQty[entry.ingredientId] ?? ""}
                        onChange={(e) =>
                          setDraftQty((prev) => ({
                            ...prev,
                            [entry.ingredientId]: e.target.value,
                          }))
                        }
                      />
                    )}
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => saveEntry(entry.ingredientId)}
                        disabled={entryMutation.isPending}
                      >
                        Save
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setPhotoEntryId(entry.id);
                          fileInputRef.current?.click();
                        }}
                        disabled={photoMutation.isPending}
                      >
                        <Camera className="mr-1 size-4" />
                        Photo
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setActiveIngredientId(null)}
                      >
                        Cancel
                      </Button>
                    </div>
                    {entry.photoUrls.length > 0 ? (
                      <p className="text-muted-foreground text-xs">
                        {entry.photoUrls.length} photo(s) attached
                      </p>
                    ) : null}
                  </>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-between"
                    onClick={() => setActiveIngredientId(entry.ingredientId)}
                  >
                    <span>
                      {displayQty !== ""
                        ? `${displayQty} ${entry.ingredientUnit}`
                        : "Tap to count"}
                    </span>
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="bg-background fixed inset-x-0 bottom-0 border-t p-4">
        <div className="mx-auto flex max-w-lg gap-2">
          <Button
            className="flex-1"
            onClick={submitCount}
            disabled={
              actionMutation.isPending ||
              data.completedItemCount < data.itemCount
            }
          >
            Submit count
          </Button>
        </div>
      </div>
    </section>
  );
}
