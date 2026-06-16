"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { format, parseISO } from "date-fns";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from "@workspace/ui/components/drawer";
import { Archive, Star } from "lucide-react";
import { cn } from "@workspace/ui/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@workspace/ui/components/tabs";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { Badge } from "@workspace/ui/components/badge";
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
  useArchiveExercise,
  useBodyWeights,
  useExerciseHistory,
  useExercises,
  useStandards,
  useToggleFavourite,
  useUpdateExercise,
} from "@/hooks/gym/use-gym";
import { useMeStore } from "@/entities/me/model/store";
import { ProgressChart } from "@/components/gym/progress-chart";
import { StrengthStandards } from "@/components/gym/strength-standards";
import { bestSetOneRepMax } from "@/lib/gym/recommend";
import {
  GROUP_SUBGROUPS,
  MUSCLE_GROUPS,
  MUSCLE_GROUP_LABELS,
  MUSCLE_SUBGROUP_LABELS,
  STATIONS,
  STATION_LABELS,
  type Exercise,
  type ExerciseStandards,
  type MuscleSubgroup,
  type Sex,
  type Station,
} from "@/entities/gym/model/types";

function prettySlug(s: string): string {
  return s.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function ExerciseDrawer({
  exercise,
  onClose,
}: {
  exercise: Exercise | null;
  onClose: () => void;
}) {
  return (
    <Drawer open={!!exercise} onOpenChange={(open) => !open && onClose()}>
      <DrawerContent className="max-h-[88vh]">
        {exercise ? <DrawerBody exercise={exercise} onClose={onClose} /> : null}
      </DrawerContent>
    </Drawer>
  );
}

function DrawerBody({ exercise, onClose }: { exercise: Exercise; onClose: () => void }) {
  const { data: standardsMap } = useStandards();
  const { data: bodyWeights } = useBodyWeights();
  const bodyweight = bodyWeights?.[0]?.weightKg ?? null;
  // Sex drives the strength-standard benchmarks; it comes from the user profile.
  const sex: Sex = useMeStore((s) => s.currentUser?.sex) ?? "male";

  // Local "mapping" so editing it in Details updates Benchmark live.
  const [slSlug, setSlSlug] = useState<string | null>(exercise.strengthLevelSlug);
  useEffect(() => setSlSlug(exercise.strengthLevelSlug), [exercise.id, exercise.strengthLevelSlug]);
  const standards: ExerciseStandards | undefined = slSlug ? standardsMap?.get(slSlug) : undefined;
  const toggleFav = useToggleFavourite();
  // Read the live favourite state from cache so the star reflects optimistic toggles.
  const { data: exerciseList } = useExercises();
  const isFavourite =
    exerciseList?.find((e) => e.id === exercise.id)?.isFavourite ?? exercise.isFavourite;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col overflow-hidden">
      <DrawerHeader className="pb-2 text-left">
        <div className="flex items-center justify-between gap-2">
          <DrawerTitle className="truncate">{exercise.name}</DrawerTitle>
          <Button
            size="icon"
            variant="ghost"
            className="h-9 w-9 shrink-0"
            aria-label={isFavourite ? "Unfavourite" : "Favourite"}
            aria-pressed={isFavourite}
            onClick={() => toggleFav.mutate({ id: exercise.id, favourite: !isFavourite })}
          >
            <Star
              className={cn(
                "h-5 w-5",
                isFavourite ? "fill-amber-400 text-amber-400" : "text-muted-foreground"
              )}
            />
          </Button>
        </div>
        <DrawerDescription className="flex flex-wrap items-center gap-1.5">
          <Badge variant="outline" className="text-[10px]">
            {MUSCLE_SUBGROUP_LABELS[exercise.subgroup]}
          </Badge>
          <Badge variant="secondary" className="text-[10px]">
            {STATION_LABELS[exercise.station]}
          </Badge>
        </DrawerDescription>
      </DrawerHeader>

      <Tabs defaultValue="stats" className="flex min-h-0 flex-1 flex-col">
        <TabsList className="mx-4 grid w-auto grid-cols-3">
          <TabsTrigger value="stats">Stats</TabsTrigger>
          <TabsTrigger value="benchmark">Benchmark</TabsTrigger>
          <TabsTrigger value="details">Details</TabsTrigger>
        </TabsList>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-6 pt-3">
          <TabsContent value="stats" className="mt-0">
            <StatsTab exercise={exercise} />
          </TabsContent>
          <TabsContent value="benchmark" className="mt-0 space-y-3">
            {standards ? (
              <StrengthStandards
                exerciseId={exercise.id}
                name={exercise.name}
                standards={standards}
                bodyweight={bodyweight}
                sex={sex}
              />
            ) : (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No benchmark mapped. Set one in the Details tab.
              </p>
            )}
          </TabsContent>
          <TabsContent value="details" className="mt-0">
            <DetailsTab
              exercise={exercise}
              slSlug={slSlug}
              onSlSlugChange={setSlSlug}
              standardsMap={standardsMap}
              onClose={onClose}
            />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}

function StatsTab({ exercise }: { exercise: Exercise }) {
  const { data: history } = useExerciseHistory(exercise.id);
  const sessions = useMemo(
    () => [...(history ?? [])].sort((a, b) => (a.performedOn < b.performedOn ? 1 : -1)),
    [history]
  );
  const totalSets = sessions.reduce((n, h) => n + h.sets.filter((s) => !s.isWarmup).length, 0);

  return (
    <div className="space-y-3">
      <ProgressChart exerciseId={exercise.id} name={exercise.name} />
      <div>
        <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {sessions.length} session{sessions.length === 1 ? "" : "s"} · {totalSets} working sets
        </p>
        {sessions.length === 0 ? (
          <p className="rounded-md border border-dashed py-6 text-center text-sm text-muted-foreground">
            No completed sets yet. Log this lift in a session.
          </p>
        ) : (
          <div className="rounded-md border">
            {sessions.map((h) => {
              const work = h.sets.filter((s) => !s.isWarmup && s.weight != null && s.reps != null);
              const e1rm = bestSetOneRepMax(h.sets);
              return (
                <div key={h.sessionId} className="border-b p-3 last:border-b-0">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">
                      {format(parseISO(h.performedOn), "EEE d MMM yyyy")}
                    </span>
                    {e1rm != null ? (
                      <span className="text-xs text-muted-foreground">
                        est. 1RM {Math.round(e1rm)} kg
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {work.map((s, i) => (
                      <span
                        key={i}
                        className="rounded-md bg-muted px-1.5 py-0.5 text-xs tabular-nums"
                      >
                        {s.weight}×{s.reps}
                        {s.rpe != null ? <span className="text-muted-foreground"> @{s.rpe}</span> : null}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function DetailsTab({
  exercise,
  slSlug,
  onSlSlugChange,
  standardsMap,
  onClose,
}: {
  exercise: Exercise;
  slSlug: string | null;
  onSlSlugChange: (slug: string | null) => void;
  standardsMap: Map<string, ExerciseStandards> | undefined;
  onClose: () => void;
}) {
  const update = useUpdateExercise();
  const archive = useArchiveExercise();
  const [name, setName] = useState(exercise.name);
  const [subgroup, setSubgroup] = useState<MuscleSubgroup>(exercise.subgroup);
  const [station, setStation] = useState<Station>(exercise.station);

  useEffect(() => {
    setName(exercise.name);
    setSubgroup(exercise.subgroup);
    setStation(exercise.station);
  }, [exercise.id, exercise.name, exercise.subgroup, exercise.station]);

  const slugOptions = useMemo(
    () => (standardsMap ? [...standardsMap.keys()].sort() : []),
    [standardsMap]
  );
  const mappedImage = slSlug ? standardsMap?.get(slSlug)?.imageUrl : null;

  const dirty =
    name.trim() !== exercise.name ||
    subgroup !== exercise.subgroup ||
    station !== exercise.station ||
    (slSlug ?? null) !== (exercise.strengthLevelSlug ?? null);

  function save() {
    if (!name.trim()) return;
    update.mutate({
      id: exercise.id,
      input: {
        name: name.trim(),
        subgroup,
        station,
        strengthLevelSlug: slSlug,
      },
    });
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="d-name">Name</Label>
        <Input id="d-name" value={name} onChange={(e) => setName(e.target.value)} className="h-9" />
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

      <div className="space-y-1.5">
        <Label>Benchmark mapping</Label>
        <p className="text-xs text-muted-foreground">
          The strengthlevel.com exercise this maps to — drives the standards table and image.
        </p>
        <div className="flex items-center gap-3">
          <Select
            value={slSlug ?? "none"}
            onValueChange={(v) => onSlSlugChange(v === "none" ? null : v)}
          >
            <SelectTrigger className="h-9 flex-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              {slugOptions.map((s) => (
                <SelectItem key={s} value={s}>
                  {prettySlug(s)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {mappedImage ? (
            <Image
              src={mappedImage}
              alt=""
              width={48}
              height={48}
              className="h-12 w-12 shrink-0 object-contain"
              unoptimized
            />
          ) : null}
        </div>
      </div>

      <Button onClick={save} disabled={!dirty || !name.trim() || update.isPending} className="w-full">
        Save changes
      </Button>

      <div className="border-t pt-4">
        <Button
          variant="ghost"
          className="w-full text-destructive hover:bg-destructive/10 hover:text-destructive"
          disabled={archive.isPending}
          onClick={() => archive.mutate(exercise.id, { onSuccess: onClose })}
        >
          <Archive className="mr-1 h-4 w-4" />
          Archive exercise
        </Button>
      </div>
    </div>
  );
}
