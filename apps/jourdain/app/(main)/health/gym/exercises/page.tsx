"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { Download, Dumbbell, LayoutGrid, List, Plus, Star } from "lucide-react";
import { cn } from "@workspace/ui/lib/utils";
import { Card, CardContent } from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Badge } from "@workspace/ui/components/badge";
import { Label } from "@workspace/ui/components/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@workspace/ui/components/dialog";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import {
  useCreateExercise,
  useExercises,
  useSeedExercises,
  useStandards,
  useToggleFavourite,
} from "@/hooks/gym/use-gym";
import { ExerciseDrawer } from "@/components/gym/exercise-drawer";
import { StaggeredAnimation } from "@/components/atoms/staggered-animation";
import { useStreamingText } from "@/hooks/use-streaming-text";
import {
  GROUP_SUBGROUPS,
  MUSCLE_GROUPS,
  MUSCLE_GROUP_LABELS,
  MUSCLE_SUBGROUP_LABELS,
  STATIONS,
  STATION_LABELS,
  type Exercise,
  type MuscleGroup,
  type MuscleSubgroup,
  type Station,
} from "@/entities/gym/model/types";

function AddExerciseDialog() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [subgroup, setSubgroup] = useState<MuscleSubgroup>("chest_middle");
  const [station, setStation] = useState<Station>("cable");
  const createExercise = useCreateExercise();

  const save = async () => {
    if (!name.trim()) return;
    await createExercise.mutateAsync({ name: name.trim(), subgroup, station });
    setName("");
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Plus className="mr-1 h-4 w-4" />
          Add custom
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Custom exercise</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="ex-name">Name</Label>
            <Input
              id="ex-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Cable Pec Fly"
              className="h-9"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Muscle</Label>
              <Select value={subgroup} onValueChange={(v) => setSubgroup(v as MuscleSubgroup)}>
                <SelectTrigger className="h-9 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MUSCLE_GROUPS.map((g) => (
                    <SelectGroup key={g}>
                      <SelectLabel>{MUSCLE_GROUP_LABELS[g]}</SelectLabel>
                      {GROUP_SUBGROUPS[g].map((sub) => (
                        <SelectItem key={sub} value={sub}>
                          {MUSCLE_SUBGROUP_LABELS[sub]}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Station</Label>
              <Select value={station} onValueChange={(v) => setStation(v as Station)}>
                <SelectTrigger className="h-9 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATIONS.map((s) => (
                    <SelectItem key={s} value={s}>
                      {STATION_LABELS[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={save} disabled={!name.trim() || createExercise.isPending}>
            Add exercise
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Entrance stagger: each card/row appears slightly after the previous one.
const STAGGER_BASE = 0; // seconds
const STAGGER_STEP = 0.04; // seconds per card
const STAGGER_CAP = 0.7; // don't let large libraries drag the cascade out forever

const staggerDelay = (index: number) =>
  Math.min(STAGGER_BASE + index * STAGGER_STEP, STAGGER_CAP);

/** Exercise name that types itself in once its card has slid into place. */
function ExerciseName({
  name,
  delayMs,
  className,
}: {
  name: string;
  delayMs: number;
  className?: string;
}) {
  const len = useStreamingText(name, true, delayMs);
  const done = len >= name.length;
  return (
    <span className={className} title={name} aria-label={name}>
      {name.slice(0, len)}
      {!done ? (
        <span
          aria-hidden
          className="ml-0.5 inline-block h-[0.85em] w-[2px] translate-y-[1px] animate-pulse rounded-full bg-foreground/60 align-middle"
        />
      ) : null}
    </span>
  );
}

export default function GymExercisesPage() {
  const { data: exercises, isLoading } = useExercises();
  const { data: standards } = useStandards();
  const seed = useSeedExercises();
  const toggleFav = useToggleFavourite();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<MuscleGroup | "all">("all");
  const [view, setView] = useState<"list" | "grid">("list");
  const [drawerExercise, setDrawerExercise] = useState<Exercise | null>(null);

  // Remember the view choice across visits.
  useEffect(() => {
    const v = localStorage.getItem("gym-ex-view");
    if (v === "grid" || v === "list") setView(v);
  }, []);
  const chooseView = (v: "list" | "grid") => {
    setView(v);
    localStorage.setItem("gym-ex-view", v);
  };

  const imgFor = (ex: { strengthLevelSlug: string | null }) =>
    ex.strengthLevelSlug ? standards?.get(ex.strengthLevelSlug)?.imageUrl ?? null : null;

  const grouped = useMemo(() => {
    const q = query.trim().toLowerCase();
    const visible = (exercises ?? []).filter(
      (e) =>
        (filter === "all" || e.group === filter) &&
        (q === "" || e.name.toLowerCase().includes(q))
    );
    return MUSCLE_GROUPS.map((mg) => ({
      muscle: mg,
      items: visible.filter((e) => e.group === mg),
    })).filter((g) => g.items.length > 0);
  }, [exercises, query, filter]);

  // Continuous index across every visible item so the entrance staggers as one
  // cascade rather than restarting per muscle group.
  const flatIndex = useMemo(() => {
    const m = new Map<string, number>();
    let i = 0;
    for (const g of grouped) for (const ex of g.items) m.set(ex.id, i++);
    return m;
  }, [grouped]);

  const isEmpty = exercises != null && exercises.length === 0;

  return (
    <div className="mx-auto w-full max-w-7xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-medium tracking-tight">Exercise library</h2>
        <div className="flex gap-2">
          {isEmpty ? (
            <Button size="sm" onClick={() => seed.mutate()} disabled={seed.isPending}>
              <Download className="mr-1 h-4 w-4" />
              Load G20 starter library
            </Button>
          ) : null}
          <AddExerciseDialog />
        </div>
      </div>

      {isEmpty ? (
        <Card>
          <CardContent className="p-6 text-center text-sm text-muted-foreground">
            Your library is empty. Load the Force USA G20 starter set, or add your own.
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="flex gap-2">
            <Input
              placeholder="Search…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="h-9"
            />
            <Select value={filter} onValueChange={(v) => setFilter(v as MuscleGroup | "all")}>
              <SelectTrigger className="h-9 w-40 shrink-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All muscles</SelectItem>
                {MUSCLE_GROUPS.map((m) => (
                  <SelectItem key={m} value={m}>
                    {MUSCLE_GROUP_LABELS[m]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex h-9 shrink-0 overflow-hidden rounded-md border">
              {([
                ["list", List],
                ["grid", LayoutGrid],
              ] as const).map(([v, Icon]) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => chooseView(v)}
                  aria-label={`${v} view`}
                  aria-pressed={view === v}
                  className={`flex w-9 items-center justify-center transition-colors ${
                    view === v
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                </button>
              ))}
            </div>
          </div>

          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : (
            <div className="space-y-5">
              {grouped.map((group) => (
                <div key={group.muscle} className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {MUSCLE_GROUP_LABELS[group.muscle]}
                  </p>
                  {view === "list" ? (
                    <Card>
                      <CardContent className="px-4 py-1">
                        {group.items.map((ex) => {
                          const img = imgFor(ex);
                          const idx = flatIndex.get(ex.id) ?? 0;
                          return (
                            <StaggeredAnimation
                              key={ex.id}
                              index={idx}
                              baseDelay={STAGGER_BASE}
                              incrementDelay={STAGGER_STEP}
                              fadeDirection="up"
                              className="-mx-4 border-b last:border-b-0"
                            >
                            <div
                              role="button"
                              tabIndex={0}
                              onClick={() => setDrawerExercise(ex)}
                              onKeyDown={(e) => e.key === "Enter" && setDrawerExercise(ex)}
                              className="flex cursor-pointer items-center justify-between gap-3 px-4 py-2.5 transition-colors hover:bg-muted/40"
                            >
                              <div className="flex min-w-0 items-center gap-2.5">
                                {img ? (
                                  <Image
                                    src={img}
                                    alt=""
                                    width={40}
                                    height={40}
                                    className="h-10 w-10 shrink-0 object-contain"
                                    unoptimized
                                  />
                                ) : (
                                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                                    <Dumbbell className="h-4 w-4" />
                                  </div>
                                )}
                                <ExerciseName
                                  name={ex.name}
                                  delayMs={staggerDelay(idx) * 1000 + 120}
                                  className="truncate text-sm font-medium"
                                />
                                {ex.isUnilateral ? (
                                  <Badge variant="outline" className="shrink-0 text-[10px]">
                                    unilateral
                                  </Badge>
                                ) : null}
                              </div>
                              <div className="flex shrink-0 items-center gap-2">
                                <Badge variant="outline" className="text-[10px]">
                                  {MUSCLE_SUBGROUP_LABELS[ex.subgroup]}
                                </Badge>
                                <Badge variant="secondary" className="text-[10px]">
                                  {STATION_LABELS[ex.station]}
                                </Badge>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-7 w-7"
                                  aria-label={ex.isFavourite ? "Unfavourite" : "Favourite"}
                                  aria-pressed={ex.isFavourite}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleFav.mutate({ id: ex.id, favourite: !ex.isFavourite });
                                  }}
                                >
                                  <Star
                                    className={cn(
                                      "h-4 w-4",
                                      ex.isFavourite
                                        ? "fill-amber-400 text-amber-400"
                                        : "text-muted-foreground"
                                    )}
                                  />
                                </Button>
                              </div>
                            </div>
                            </StaggeredAnimation>
                          );
                        })}
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
                      {group.items.map((ex) => {
                        const img = imgFor(ex);
                        const idx = flatIndex.get(ex.id) ?? 0;
                        return (
                          <StaggeredAnimation
                            key={ex.id}
                            index={idx}
                            baseDelay={STAGGER_BASE}
                            incrementDelay={STAGGER_STEP}
                            fadeDirection="up"
                          >
                          <Card
                            role="button"
                            tabIndex={0}
                            onClick={() => setDrawerExercise(ex)}
                            onKeyDown={(e) => e.key === "Enter" && setDrawerExercise(ex)}
                            className="group relative cursor-pointer gap-0 overflow-hidden p-0 transition-colors hover:bg-muted/40"
                          >
                            <Button
                              size="icon"
                              variant="ghost"
                              className="absolute right-1 top-1 z-10 h-7 w-7 bg-background/70 backdrop-blur hover:bg-background"
                              aria-label={ex.isFavourite ? "Unfavourite" : "Favourite"}
                              aria-pressed={ex.isFavourite}
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleFav.mutate({ id: ex.id, favourite: !ex.isFavourite });
                              }}
                            >
                              <Star
                                className={cn(
                                  "h-4 w-4",
                                  ex.isFavourite
                                    ? "fill-amber-400 text-amber-400"
                                    : "text-muted-foreground"
                                )}
                              />
                            </Button>
                            <div className="flex items-center gap-3 p-3">
                              <div
                                className={`flex h-20 w-20 shrink-0 items-center justify-center rounded-md ${img ? "" : "bg-muted"}`}
                              >
                                {img ? (
                                  <Image
                                    src={img}
                                    alt={ex.name}
                                    width={160}
                                    height={160}
                                    className="h-full w-full object-contain"
                                    unoptimized
                                  />
                                ) : (
                                  <Dumbbell className="h-7 w-7 text-muted-foreground" />
                                )}
                              </div>
                              <div className="min-w-0 flex-1 space-y-2 pr-7">
                                <ExerciseName
                                  name={ex.name}
                                  delayMs={staggerDelay(idx) * 1000 + 120}
                                  className="block truncate text-sm font-medium"
                                />
                                <div className="flex flex-wrap gap-1">
                                  <Badge variant="outline" className="text-[10px]">
                                    {MUSCLE_SUBGROUP_LABELS[ex.subgroup]}
                                  </Badge>
                                  <Badge variant="secondary" className="text-[10px]">
                                    {STATION_LABELS[ex.station]}
                                  </Badge>
                                  {ex.isUnilateral ? (
                                    <Badge variant="outline" className="text-[10px]">
                                      unilateral
                                    </Badge>
                                  ) : null}
                                </div>
                              </div>
                            </div>
                          </Card>
                          </StaggeredAnimation>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      <ExerciseDrawer exercise={drawerExercise} onClose={() => setDrawerExercise(null)} />
    </div>
  );
}
