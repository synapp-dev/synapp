"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Camera,
  Check,
  CheckCircle2,
  ClipboardList,
  MapPin,
  Plus,
  Search,
  SkipForward,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { buildScopedPath } from "@/lib/build-scoped-path";
import { MixedUnitEntry } from "@/entities/stock-counts/components/mixed-unit-entry";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent } from "@workspace/ui/components/card";
import { Input } from "@workspace/ui/components/input";
import { cn } from "@workspace/ui/lib/utils";
import {
  useStockCountActionMutation,
  useStockCountDetailQuery,
  useStockCountEntryMutation,
  useStockCountPhotoMutation,
} from "@/entities/stock-counts/model/use-stock-counts-query";
import type {
  StockCountDetailDto,
  StockCountEntryDto,
} from "@/server/stock-counts/stock-counts.types";

type StockCountFlowPageProps = {
  organisation: string;
  venue: string;
  countId: string;
};

type WizardStep =
  | { kind: "overview" }
  | { kind: "location"; locationId: string; name: string }
  | { kind: "unassigned"; name: string }
  | { kind: "review" };

const UNASSIGNED_KEY = "__unassigned__";

function isEntryDone(entry: StockCountEntryDto): boolean {
  return entry.isRowComplete || entry.isSkipped || entry.countedQty !== null;
}

function entriesForStep(
  step: WizardStep,
  data: StockCountDetailDto,
): StockCountEntryDto[] {
  if (step.kind === "location") {
    return data.entries.filter((e) => e.locationId === step.locationId);
  }
  if (step.kind === "unassigned") {
    const knownIds = new Set(data.locations.map((l) => l.id));
    return data.entries.filter(
      (e) => e.locationId === null || !knownIds.has(e.locationId),
    );
  }
  return [];
}

function buildSteps(data: StockCountDetailDto): WizardStep[] {
  const steps: WizardStep[] = [{ kind: "overview" }];
  const knownIds = new Set(data.locations.map((l) => l.id));
  const unassignedCount = data.entries.filter(
    (e) => e.locationId === null || !knownIds.has(e.locationId),
  ).length;

  for (const location of data.locations) {
    steps.push({ kind: "location", locationId: location.id, name: location.name });
  }
  if (unassignedCount > 0 || data.locations.length === 0) {
    steps.push({
      kind: "unassigned",
      name: data.locations.length === 0 ? "All items" : "Everything else",
    });
  }
  steps.push({ kind: "review" });
  return steps;
}

export function StockCountFlowPage({
  organisation,
  venue,
  countId,
}: StockCountFlowPageProps) {
  const router = useRouter();
  const { data, isLoading, error } = useStockCountDetailQuery({
    organisation,
    venue,
    countId,
  });
  const entryMutation = useStockCountEntryMutation({ organisation, venue, countId });
  const photoMutation = useStockCountPhotoMutation({ organisation, venue, countId });
  const actionMutation = useStockCountActionMutation({ organisation, venue, countId });

  const [stepIndex, setStepIndex] = useState(0);
  const [direction, setDirection] = useState<"forward" | "back">("forward");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [draftQty, setDraftQty] = useState<Record<string, string>>({});
  const [draftNote, setDraftNote] = useState<Record<string, string>>({});
  const [mixedDraft, setMixedDraft] = useState<
    Record<string, { cartons: string; looseUnits: string; partialBaseUnits: string }>
  >({});
  const [entryMode, setEntryMode] = useState<Record<string, "mixed" | "total">>({});
  const [justSavedId, setJustSavedId] = useState<string | null>(null);
  const [addSearch, setAddSearch] = useState("");
  const [confirmZero, setConfirmZero] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [photoEntryId, setPhotoEntryId] = useState<string | null>(null);

  const steps = useMemo(() => (data ? buildSteps(data) : []), [data]);
  const step = steps[Math.min(stepIndex, Math.max(steps.length - 1, 0))];

  // Reset transient per-step UI whenever the operator changes step.
  useEffect(() => {
    setExpandedId(null);
    setAddSearch("");
    setConfirmZero(false);
  }, [stepIndex]);

  useEffect(() => {
    if (!justSavedId) return;
    const timer = setTimeout(() => setJustSavedId(null), 900);
    return () => clearTimeout(timer);
  }, [justSavedId]);

  const overallProgress = useMemo(() => {
    if (!data?.itemCount) return 0;
    return Math.round((data.completedItemCount / data.itemCount) * 100);
  }, [data]);

  const stepEntries = useMemo(
    () => (data && step ? entriesForStep(step, data) : []),
    [data, step],
  );
  const stepDone = stepEntries.filter(isEntryDone).length;
  const stepProgress = stepEntries.length
    ? Math.round((stepDone / stepEntries.length) * 100)
    : 0;

  const uncountedElsewhere = useMemo(() => {
    if (!data || step?.kind !== "location") return [];
    return data.entries.filter(
      (e) => e.locationId !== step.locationId && !isEntryDone(e),
    );
  }, [data, step]);

  const addMatches = useMemo(() => {
    const q = addSearch.trim().toLowerCase();
    if (!q) return [];
    return uncountedElsewhere
      .filter((e) => e.ingredientName.toLowerCase().includes(q))
      .slice(0, 6);
  }, [addSearch, uncountedElsewhere]);

  function goTo(index: number) {
    setDirection(index >= stepIndex ? "forward" : "back");
    setStepIndex(Math.max(0, Math.min(index, steps.length - 1)));
  }

  async function saveEntry(entry: StockCountEntryDto) {
    const usesMixed =
      (entryMode[entry.ingredientId] ?? "mixed") === "mixed" &&
      entry.unitsPerPack !== null &&
      entry.unitsPerPack > 1;
    const note = draftNote[entry.ingredientId]?.trim();

    try {
      if (usesMixed) {
        const mixed = mixedDraft[entry.ingredientId] ?? {
          cartons: "",
          looseUnits: "",
          partialBaseUnits: "",
        };
        await entryMutation.mutateAsync({
          ingredientId: entry.ingredientId,
          mixedUnitBreakdown: {
            cartons: Number(mixed.cartons) || 0,
            looseUnits: Number(mixed.looseUnits) || 0,
            partialBaseUnits: Number(mixed.partialBaseUnits) || 0,
            unitsPerCarton: entry.unitsPerPack ?? 1,
          },
          notes: note || undefined,
        });
      } else {
        const raw = draftQty[entry.ingredientId];
        const qty = Number(raw);
        if (!Number.isFinite(qty) || qty < 0) {
          toast.error("Enter a valid quantity");
          return;
        }
        await entryMutation.mutateAsync({
          ingredientId: entry.ingredientId,
          countedQty: qty,
          notes: note || undefined,
        });
      }
      setJustSavedId(entry.ingredientId);
      setExpandedId(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    }
  }

  async function skipEntry(entry: StockCountEntryDto) {
    try {
      await entryMutation.mutateAsync({
        ingredientId: entry.ingredientId,
        isSkipped: true,
        isRowComplete: false,
      });
      setExpandedId(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Skip failed");
    }
  }

  async function addToLocation(entry: StockCountEntryDto, locationId: string) {
    try {
      await entryMutation.mutateAsync({
        ingredientId: entry.ingredientId,
        locationId,
        isRowComplete: false,
      });
      setAddSearch("");
      toast.success(`${entry.ingredientName} added to this area`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not move item");
    }
  }

  async function handlePhotoSelected(file: File | undefined, entryId: string) {
    if (!file) return;
    try {
      await photoMutation.mutateAsync({ entryId, file });
      toast.success("Photo attached");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Photo upload failed");
    }
  }

  async function setRemainingToZero() {
    if (!confirmZero) {
      setConfirmZero(true);
      return;
    }
    try {
      await actionMutation.mutateAsync({
        action: "set-remaining-zero",
        body: { confirmBulkZero: true },
      });
      setConfirmZero(false);
      toast.success("Remaining items set to zero");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Action failed");
    }
  }

  async function submitCount() {
    try {
      await actionMutation.mutateAsync({ action: "submit" });
      setSubmitted(true);
      setTimeout(() => {
        router.push(
          buildScopedPath(
            organisation,
            venue,
            `stock-management/stock-counts/${countId}`,
          ),
        );
      }, 1100);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Submit failed");
    }
  }

  if (isLoading) {
    return (
      <div className="mx-auto flex w-full max-w-lg flex-col gap-3 pt-6">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="bg-muted h-16 animate-pulse rounded-xl"
            style={{ animationDelay: `${i * 150}ms` }}
          />
        ))}
      </div>
    );
  }
  if (error || !data || !step) {
    return <p className="text-destructive text-sm">{error?.message ?? "Count not found"}</p>;
  }

  if (data.status !== "in_progress") {
    return (
      <Card className="mx-auto mt-6 w-full max-w-lg">
        <CardContent className="flex flex-col items-start gap-3 pt-6">
          <Badge variant="secondary">{data.status.replace("_", " ")}</Badge>
          <p className="text-muted-foreground text-sm">
            This count is no longer being edited.
          </p>
          <Button asChild variant="outline" size="sm">
            <Link
              href={buildScopedPath(
                organisation,
                venue,
                `stock-management/stock-counts/${countId}`,
              )}
            >
              View count details
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (submitted) {
    return (
      <div className="mx-auto flex w-full max-w-lg flex-col items-center gap-4 pt-24 duration-500 animate-in fade-in zoom-in-95">
        <span className="bg-primary/10 text-primary flex size-20 items-center justify-center rounded-full duration-700 animate-in zoom-in">
          <CheckCircle2 className="size-10" />
        </span>
        <h1 className="text-xl font-semibold">Count submitted</h1>
        <p className="text-muted-foreground text-sm">
          Calculating variance and sending for approval…
        </p>
      </div>
    );
  }

  const stepAnimation =
    direction === "forward"
      ? "animate-in fade-in slide-in-from-right-8 duration-300"
      : "animate-in fade-in slide-in-from-left-8 duration-300";

  const countableSteps = steps.filter(
    (s) => s.kind === "location" || s.kind === "unassigned",
  );

  return (
    <section className="mx-auto flex w-full max-w-lg flex-col gap-4 pb-28">
      {/* Header + overall progress */}
      <div className="flex items-center gap-2">
        <Button asChild variant="ghost" size="icon">
          <Link
            href={buildScopedPath(organisation, venue, "stock-management/stock-counts")}
          >
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg font-semibold">{data.name}</h1>
          <p className="text-muted-foreground text-xs">
            <span
              key={data.completedItemCount}
              className="inline-block duration-300 animate-in zoom-in-75"
            >
              {data.completedItemCount}
            </span>{" "}
            of {data.itemCount} items counted
          </p>
        </div>
        <span className="text-muted-foreground text-xs font-medium tabular-nums">
          {overallProgress}%
        </span>
      </div>

      <div className="bg-muted h-2 overflow-hidden rounded-full">
        <div
          className="bg-primary h-full rounded-full transition-all duration-700 ease-out"
          style={{ width: `${overallProgress}%` }}
        />
      </div>

      {/* Step dots */}
      <div className="flex items-center justify-center gap-1.5">
        {steps.map((s, i) => {
          const done =
            s.kind === "review"
              ? false
              : s.kind === "overview"
                ? i < stepIndex
                : entriesForStep(s, data).every(isEntryDone) &&
                  entriesForStep(s, data).length > 0;
          return (
            <button
              key={i}
              type="button"
              aria-label={`Step ${i + 1}`}
              onClick={() => goTo(i)}
              className={cn(
                "h-1.5 rounded-full transition-all duration-300",
                i === stepIndex
                  ? "bg-primary w-6"
                  : done
                    ? "bg-primary/60 w-1.5"
                    : "bg-muted-foreground/25 w-1.5",
              )}
            />
          );
        })}
      </div>

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

      {/* Step content */}
      <div key={stepIndex} className={stepAnimation}>
        {step.kind === "overview" ? (
          <div className="flex flex-col gap-3">
            <div className="space-y-1 pt-2">
              <h2 className="text-xl font-semibold tracking-tight">
                Walk the venue, one area at a time
              </h2>
              <p className="text-muted-foreground text-sm">
                Count each storage area as you stand in front of it. Everything saves
                as you go.
              </p>
            </div>

            {data.locations.length === 0 ? (
              <Card className="border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30">
                <CardContent className="space-y-2 pt-5 text-sm">
                  <p className="font-medium">No storage areas defined yet</p>
                  <p className="text-muted-foreground">
                    You can still count everything in one list, but defining areas
                    (cold room, dry store, freezer…) makes counts much faster.
                  </p>
                  <Button asChild variant="outline" size="sm">
                    <Link
                      href={buildScopedPath(
                        organisation,
                        venue,
                        "settings/inventory-setup/storage",
                      )}
                    >
                      Set up storage areas
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ) : null}

            <div className="flex flex-col gap-2">
              {countableSteps.map((s, i) => {
                const entries = entriesForStep(s, data);
                const done = entries.filter(isEntryDone).length;
                const pct = entries.length
                  ? Math.round((done / entries.length) * 100)
                  : 0;
                const name = s.kind === "location" ? s.name : s.name;
                const targetIndex = steps.indexOf(s);
                return (
                  <button
                    key={s.kind === "location" ? s.locationId : UNASSIGNED_KEY}
                    type="button"
                    onClick={() => goTo(targetIndex)}
                    className={cn(
                      "bg-card hover:border-primary/50 group flex items-center gap-3 rounded-xl border p-4 text-left transition-colors",
                      "fill-mode-both animate-in fade-in slide-in-from-bottom-2 duration-500",
                    )}
                    style={{ animationDelay: `${i * 70}ms` }}
                  >
                    <span
                      className={cn(
                        "flex size-9 shrink-0 items-center justify-center rounded-full transition-colors duration-300",
                        pct === 100 && entries.length > 0
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground",
                      )}
                    >
                      {pct === 100 && entries.length > 0 ? (
                        <Check className="size-4" />
                      ) : (
                        <MapPin className="size-4" />
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{name}</span>
                      <span className="text-muted-foreground block text-xs">
                        {done} of {entries.length} counted
                      </span>
                      <span className="bg-muted mt-1.5 block h-1 overflow-hidden rounded-full">
                        <span
                          className="bg-primary block h-full rounded-full transition-all duration-700 ease-out"
                          style={{ width: `${pct}%` }}
                        />
                      </span>
                    </span>
                    <ArrowRight className="text-muted-foreground size-4 shrink-0 transition-transform duration-200 group-hover:translate-x-0.5" />
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

        {step.kind === "location" || step.kind === "unassigned" ? (
          <div className="flex flex-col gap-3">
            <div className="flex items-end justify-between gap-2">
              <div>
                <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
                  Area {countableSteps.indexOf(step) + 1} of {countableSteps.length}
                </p>
                <h2 className="text-xl font-semibold tracking-tight">
                  {step.kind === "location" ? step.name : step.name}
                </h2>
              </div>
              <span className="text-muted-foreground text-xs tabular-nums">
                {stepDone}/{stepEntries.length}
              </span>
            </div>

            <div className="bg-muted h-1.5 overflow-hidden rounded-full">
              <div
                className="bg-primary h-full rounded-full transition-all duration-500 ease-out"
                style={{ width: `${stepProgress}%` }}
              />
            </div>

            {stepEntries.length > 0 && stepDone === stepEntries.length ? (
              <div className="border-primary/30 bg-primary/5 text-primary flex items-center gap-2 rounded-lg border px-3 py-2 text-sm duration-300 animate-in fade-in slide-in-from-bottom-1">
                <Sparkles className="size-4" />
                All counted here — keep moving!
              </div>
            ) : null}

            {stepEntries.length === 0 ? (
              <Card>
                <CardContent className="text-muted-foreground pt-5 text-sm">
                  Nothing assigned to this area yet. Use “Add item” below as you find
                  stock here — it’ll remember for next time.
                </CardContent>
              </Card>
            ) : null}

            <div className="flex flex-col gap-2">
              {stepEntries.map((entry) => {
                const done = isEntryDone(entry);
                const isExpanded = expandedId === entry.ingredientId;
                const justSaved = justSavedId === entry.ingredientId;
                const canMixed =
                  entry.unitsPerPack !== null && entry.unitsPerPack > 1;
                const mode = canMixed
                  ? (entryMode[entry.ingredientId] ?? "mixed")
                  : "total";
                const mixed =
                  mixedDraft[entry.ingredientId] ?? {
                    cartons: "",
                    looseUnits: "",
                    partialBaseUnits: "",
                  };
                return (
                  <div
                    key={entry.id}
                    className={cn(
                      "bg-card rounded-xl border transition-all duration-300",
                      isExpanded && "border-primary/50 shadow-sm",
                      justSaved && "border-primary",
                    )}
                  >
                    <button
                      type="button"
                      className="flex w-full items-center gap-3 p-3.5 text-left"
                      onClick={() =>
                        setExpandedId(isExpanded ? null : entry.ingredientId)
                      }
                    >
                      <span
                        className={cn(
                          "flex size-7 shrink-0 items-center justify-center rounded-full border transition-all duration-300",
                          done
                            ? "bg-primary border-primary text-primary-foreground"
                            : "border-muted-foreground/30 text-transparent",
                          justSaved && "animate-in zoom-in duration-500",
                        )}
                      >
                        <Check className="size-3.5" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">
                          {entry.ingredientName}
                        </span>
                        <span className="text-muted-foreground block text-xs">
                          {entry.countedQty !== null
                            ? `Counted: ${entry.countedQty} ${entry.ingredientUnit}`
                            : entry.isSkipped
                              ? "Skipped"
                              : entry.previousCountQty !== null
                                ? `Previous: ${entry.previousCountQty} ${entry.ingredientUnit}`
                                : "Not counted yet"}
                        </span>
                      </span>
                      {entry.isRecountRequired ? (
                        <Badge
                          variant="outline"
                          className="border-amber-400 text-amber-600 dark:text-amber-400"
                        >
                          Recount
                        </Badge>
                      ) : null}
                    </button>

                    <div
                      className={cn(
                        "grid transition-all duration-300 ease-out",
                        isExpanded
                          ? "grid-rows-[1fr] opacity-100"
                          : "grid-rows-[0fr] opacity-0",
                      )}
                    >
                      <div
                        className={cn(
                          "overflow-hidden transition-[visibility] duration-300",
                          isExpanded ? "visible" : "invisible",
                        )}
                        aria-hidden={!isExpanded}
                      >
                        <div className="space-y-3 border-t px-3.5 py-3">
                          {canMixed ? (
                            <div className="bg-muted flex w-fit gap-0.5 rounded-lg p-0.5">
                              {(["mixed", "total"] as const).map((m) => (
                                <button
                                  key={m}
                                  type="button"
                                  onClick={() =>
                                    setEntryMode((prev) => ({
                                      ...prev,
                                      [entry.ingredientId]: m,
                                    }))
                                  }
                                  className={cn(
                                    "rounded-md px-2.5 py-1 text-xs font-medium transition-all duration-200",
                                    mode === m
                                      ? "bg-background shadow-sm"
                                      : "text-muted-foreground",
                                  )}
                                >
                                  {m === "mixed" ? "By pack" : "Total"}
                                </button>
                              ))}
                            </div>
                          ) : null}

                          {mode === "mixed" && canMixed ? (
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
                                  [entry.ingredientId]: {
                                    ...mixed,
                                    looseUnits: value,
                                  },
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
                              autoFocus
                              placeholder={`Qty (${entry.ingredientUnit})`}
                              value={draftQty[entry.ingredientId] ?? ""}
                              onChange={(e) =>
                                setDraftQty((prev) => ({
                                  ...prev,
                                  [entry.ingredientId]: e.target.value,
                                }))
                              }
                              onKeyDown={(e) => {
                                if (e.key === "Enter") void saveEntry(entry);
                              }}
                            />
                          )}

                          <Input
                            placeholder="Note (optional)"
                            value={draftNote[entry.ingredientId] ?? ""}
                            onChange={(e) =>
                              setDraftNote((prev) => ({
                                ...prev,
                                [entry.ingredientId]: e.target.value,
                              }))
                            }
                          />

                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              onClick={() => void saveEntry(entry)}
                              disabled={entryMutation.isPending}
                            >
                              <Check className="mr-1 size-4" />
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
                              {entry.photoUrls.length > 0
                                ? `Photo (${entry.photoUrls.length})`
                                : "Photo"}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-muted-foreground ml-auto"
                              onClick={() => void skipEntry(entry)}
                              disabled={entryMutation.isPending}
                            >
                              <SkipForward className="mr-1 size-4" />
                              Skip
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {step.kind === "location" ? (
              <div className="space-y-2 pt-1">
                <div className="relative">
                  <Search className="text-muted-foreground absolute left-3 top-1/2 size-4 -translate-y-1/2" />
                  <Input
                    className="pl-9"
                    placeholder="Add item to this area…"
                    value={addSearch}
                    onChange={(e) => setAddSearch(e.target.value)}
                  />
                </div>
                {addMatches.length > 0 ? (
                  <div className="bg-card overflow-hidden rounded-xl border duration-200 animate-in fade-in slide-in-from-top-1">
                    {addMatches.map((match) => (
                      <button
                        key={match.id}
                        type="button"
                        className="hover:bg-muted/60 flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm transition-colors"
                        onClick={() => void addToLocation(match, step.locationId)}
                        disabled={entryMutation.isPending}
                      >
                        <Plus className="text-muted-foreground size-4 shrink-0" />
                        <span className="min-w-0 flex-1 truncate">
                          {match.ingredientName}
                        </span>
                        <span className="text-muted-foreground text-xs">
                          {match.ingredientUnit}
                        </span>
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}

        {step.kind === "review" ? (
          <div className="flex flex-col gap-3">
            <div className="space-y-1 pt-2">
              <h2 className="text-xl font-semibold tracking-tight">Review & submit</h2>
              <p className="text-muted-foreground text-sm">
                Variance is calculated when you submit, then goes to a manager for
                approval.
              </p>
            </div>

            <Card>
              <CardContent className="flex items-center gap-4 pt-5">
                <span className="bg-primary/10 text-primary flex size-12 items-center justify-center rounded-full">
                  <ClipboardList className="size-6" />
                </span>
                <div>
                  <p className="text-2xl font-semibold tabular-nums">
                    {data.completedItemCount}
                    <span className="text-muted-foreground text-base font-normal">
                      {" "}
                      / {data.itemCount}
                    </span>
                  </p>
                  <p className="text-muted-foreground text-xs">items counted</p>
                </div>
              </CardContent>
            </Card>

            <div className="flex flex-col gap-2">
              {countableSteps.map((s, i) => {
                const entries = entriesForStep(s, data);
                if (entries.length === 0) return null;
                const done = entries.filter(isEntryDone).length;
                const complete = done === entries.length;
                const name = s.kind === "location" ? s.name : s.name;
                return (
                  <button
                    key={s.kind === "location" ? s.locationId : UNASSIGNED_KEY}
                    type="button"
                    onClick={() => goTo(steps.indexOf(s))}
                    className="bg-card hover:border-primary/50 fill-mode-both flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors animate-in fade-in slide-in-from-bottom-2 duration-500"
                    style={{ animationDelay: `${i * 60}ms` }}
                  >
                    <span
                      className={cn(
                        "flex size-7 shrink-0 items-center justify-center rounded-full",
                        complete
                          ? "bg-primary text-primary-foreground"
                          : "bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-400",
                      )}
                    >
                      {complete ? <Check className="size-4" /> : done}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{name}</span>
                      <span className="text-muted-foreground block text-xs">
                        {done} of {entries.length} counted
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>

            {data.completedItemCount < data.itemCount ? (
              <Card className="border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30">
                <CardContent className="space-y-2 pt-5 text-sm">
                  <p className="font-medium">
                    {data.itemCount - data.completedItemCount} items still uncounted
                  </p>
                  <p className="text-muted-foreground">
                    Go back and count them, or set the rest to zero if the shelves are
                    genuinely empty.
                  </p>
                  <Button
                    variant={confirmZero ? "destructive" : "outline"}
                    size="sm"
                    onClick={() => void setRemainingToZero()}
                    disabled={actionMutation.isPending}
                  >
                    {confirmZero ? "Tap again to confirm zero" : "Set remaining to zero"}
                  </Button>
                </CardContent>
              </Card>
            ) : null}
          </div>
        ) : null}
      </div>

      {/* Bottom nav */}
      <div className="bg-background/95 fixed inset-x-0 bottom-0 border-t p-4 backdrop-blur">
        <div className="mx-auto flex max-w-lg gap-2">
          {stepIndex > 0 ? (
            <Button variant="outline" onClick={() => goTo(stepIndex - 1)}>
              <ArrowLeft className="mr-1 size-4" />
              Back
            </Button>
          ) : null}
          {step.kind === "overview" ? (
            <Button className="flex-1" onClick={() => goTo(1)}>
              Start counting
              <ArrowRight className="ml-1 size-4" />
            </Button>
          ) : step.kind === "review" ? (
            <Button
              className="flex-1"
              onClick={() => void submitCount()}
              disabled={
                actionMutation.isPending ||
                data.completedItemCount < data.itemCount
              }
            >
              Submit count
              <Check className="ml-1 size-4" />
            </Button>
          ) : (
            <Button className="flex-1" onClick={() => goTo(stepIndex + 1)}>
              {stepIndex === steps.length - 2 ? "Review" : "Next area"}
              <ArrowRight className="ml-1 size-4" />
            </Button>
          )}
        </div>
      </div>
    </section>
  );
}
