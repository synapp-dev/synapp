"use client";

import { useMemo, useState } from "react";
import { GripVertical, Plus, Sparkles, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@workspace/ui/components/dialog";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { Switch } from "@workspace/ui/components/switch";
import { cn } from "@workspace/ui/lib/utils";
import { ExercisePicker } from "@/components/gym/exercise-picker";
import { RecommendationBadge } from "@/components/gym/recommendation-badge";
import { useCreateProgram, useUpdateProgram } from "@/hooks/gym/use-gym";
import { recommendSetCount } from "@/lib/gym/recommend";
import {
  GROUP_SUBGROUPS,
  MUSCLE_GROUPS,
  MUSCLE_GROUP_LABELS,
  MUSCLE_SUBGROUP_LABELS,
  type Exercise,
  type MuscleGroup,
  type MuscleSubgroup,
  type Program,
  type Station,
} from "@/entities/gym/model/types";

type Row = {
  exerciseId: string;
  name: string;
  subgroup: MuscleSubgroup;
  group: MuscleGroup;
  station: Station;
  targetSets: number;
  targetRepMin: number;
  targetRepMax: number;
};

/**
 * Default program name from the chosen subgroups: a fully-selected group rolls
 * up to its name, a partial one lists its subgroups — e.g. all chest + triceps
 * → "Chest · Triceps".
 */
function autoName(subgroups: MuscleSubgroup[]): string {
  const set = new Set(subgroups);
  const parts: string[] = [];
  for (const g of MUSCLE_GROUPS) {
    const subs = GROUP_SUBGROUPS[g];
    const selected = subs.filter((s) => set.has(s));
    if (selected.length === 0) continue;
    if (selected.length === subs.length) parts.push(MUSCLE_GROUP_LABELS[g]);
    else parts.push(...selected.map((s) => MUSCLE_SUBGROUP_LABELS[s]));
  }
  return parts.join(" · ");
}

export function ProgramForm({
  exercises,
  program,
  trigger,
}: {
  exercises: Exercise[];
  program?: Program;
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [subgroups, setSubgroups] = useState<MuscleSubgroup[]>(program?.muscleSubgroups ?? []);
  const [name, setName] = useState(program?.name ?? "");
  // Once the user edits the name we stop syncing it to the chosen muscles.
  const [nameTouched, setNameTouched] = useState(Boolean(program?.name));
  const [isSmart, setIsSmart] = useState(program?.isSmart ?? false);
  const [rows, setRows] = useState<Row[]>(
    program?.exercises.map((e) => ({
      exerciseId: e.exerciseId,
      name: e.name,
      subgroup: e.subgroup,
      group: e.group,
      station: e.station,
      targetSets: e.targetSets,
      targetRepMin: e.targetRepMin,
      targetRepMax: e.targetRepMax,
    })) ?? []
  );

  const createProgram = useCreateProgram();
  const updateProgram = useUpdateProgram();
  const pending = createProgram.isPending || updateProgram.isPending;

  const selected = useMemo(() => new Set(subgroups), [subgroups]);
  const displayName = nameTouched ? name : autoName(subgroups);

  const subgroupCounts = useMemo(() => {
    const counts = new Map<MuscleSubgroup, number>();
    for (const r of rows) counts.set(r.subgroup, (counts.get(r.subgroup) ?? 0) + 1);
    return counts;
  }, [rows]);

  const toggleSub = (s: MuscleSubgroup) =>
    setSubgroups((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));

  const toggleGroup = (g: MuscleGroup) => {
    const subs = GROUP_SUBGROUPS[g];
    const allOn = subs.every((s) => selected.has(s));
    setSubgroups((prev) =>
      allOn
        ? prev.filter((s) => !subs.includes(s))
        : [...prev.filter((s) => !subs.includes(s)), ...subs]
    );
  };

  const addExercise = (ex: Exercise) => {
    const recommended = recommendSetCount({
      subgroup: ex.subgroup,
      exercisesForSubgroup: (subgroupCounts.get(ex.subgroup) ?? 0) + 1,
      sessionsPerWeekForSubgroup: 1,
    });
    setRows((prev) => [
      ...prev,
      {
        exerciseId: ex.id,
        name: ex.name,
        subgroup: ex.subgroup,
        group: ex.group,
        station: ex.station,
        targetSets: recommended.sets,
        targetRepMin: 8,
        targetRepMax: 12,
      },
    ]);
    // Keep the chosen muscles in step with what's actually been added.
    setSubgroups((prev) => (prev.includes(ex.subgroup) ? prev : [...prev, ex.subgroup]));
  };

  const patchRow = (i: number, patch: Partial<Row>) =>
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  const removeRow = (i: number) => setRows((prev) => prev.filter((_, idx) => idx !== i));

  const effectiveName = (nameTouched ? name : autoName(subgroups)).trim();
  const canSave = effectiveName.length > 0 && subgroups.length > 0 && (isSmart || rows.length > 0);

  const save = async () => {
    if (!canSave) return;
    const payload = {
      name: effectiveName,
      muscleSubgroups: subgroups,
      isSmart,
      exercises: isSmart
        ? []
        : rows.map((r) => ({
            exerciseId: r.exerciseId,
            targetSets: r.targetSets,
            targetRepMin: r.targetRepMin,
            targetRepMax: r.targetRepMax,
          })),
    };
    if (program) {
      await updateProgram.mutateAsync({ id: program.id, input: payload });
    } else {
      await createProgram.mutateAsync(payload);
    }
    setOpen(false);
    if (!program) {
      setSubgroups([]);
      setName("");
      setNameTouched(false);
      setIsSmart(false);
      setRows([]);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[92vh] gap-0 overflow-hidden p-0 sm:max-w-lg">
        <DialogHeader className="border-b p-4">
          <DialogTitle>{program ? "Edit program" : "New program"}</DialogTitle>
        </DialogHeader>

        <div className="max-h-[70vh] space-y-5 overflow-y-auto p-4">
          {/* Muscles — chosen at subgroup level; tap a group header for all of it. */}
          <div className="space-y-3">
            <Label>Muscles</Label>
            {MUSCLE_GROUPS.map((g) => {
              const subs = GROUP_SUBGROUPS[g];
              const allOn = subs.every((s) => selected.has(s));
              const someOn = subs.some((s) => selected.has(s));
              return (
                <div key={g} className="space-y-1.5">
                  <button
                    type="button"
                    onClick={() => toggleGroup(g)}
                    aria-pressed={allOn}
                    className={cn(
                      "text-xs font-semibold uppercase tracking-wide transition-colors",
                      someOn ? "text-foreground" : "text-muted-foreground"
                    )}
                  >
                    {MUSCLE_GROUP_LABELS[g]}
                    {allOn ? " · all" : someOn ? " · some" : ""}
                  </button>
                  <div className="flex flex-wrap gap-1.5">
                    {subs.map((s) => {
                      const on = selected.has(s);
                      return (
                        <button
                          type="button"
                          key={s}
                          onClick={() => toggleSub(s)}
                          aria-pressed={on}
                          className={cn(
                            "rounded-full border px-3 py-1.5 text-sm transition-colors",
                            on
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-input bg-background text-foreground hover:bg-accent"
                          )}
                        >
                          {MUSCLE_SUBGROUP_LABELS[s]}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Name — auto from the muscles, editable. */}
          <div className="space-y-1.5">
            <Label htmlFor="program-name">Name</Label>
            <Input
              id="program-name"
              placeholder="Chest · Triceps"
              value={displayName}
              onChange={(e) => {
                setName(e.target.value);
                setNameTouched(true);
              }}
              className="h-10"
            />
          </div>

          {/* Smart toggle. */}
          <div className="flex items-center justify-between gap-3 rounded-md border p-3">
            <div className="flex items-start gap-2">
              <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <div>
                <p className="text-sm font-medium">Smart program</p>
                <p className="text-xs text-muted-foreground">
                  Auto-pick exercises each session from the muscles you&apos;re behind on.
                </p>
              </div>
            </div>
            <Switch checked={isSmart} onCheckedChange={setIsSmart} aria-label="Smart program" />
          </div>

          {/* Exercises — manual builder, or the smart explainer. */}
          {isSmart ? (
            <div className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">
              Exercises are generated when you start — prioritising the lagging muscles you chose,
              rotating week to week. No fixed list to maintain.
            </div>
          ) : (
            <div className="space-y-2">
              <Label>Exercises</Label>
              {rows.length === 0 ? (
                <p className="rounded-md border border-dashed py-6 text-center text-xs text-muted-foreground">
                  Add exercises to pull into this workout.
                </p>
              ) : (
                <div className="space-y-2">
                  {rows.map((row, i) => (
                    <div key={row.exerciseId} className="rounded-md border p-2.5">
                      <div className="flex items-center gap-2">
                        <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{row.name}</p>
                          <p className="text-[11px] text-muted-foreground">
                            {MUSCLE_SUBGROUP_LABELS[row.subgroup]}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 shrink-0 text-muted-foreground"
                          onClick={() => removeRow(i)}
                          aria-label="Remove"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="mt-2 flex items-center gap-2 pl-6">
                        <div className="flex items-center gap-1">
                          <Input
                            inputMode="numeric"
                            value={row.targetSets}
                            onChange={(e) =>
                              patchRow(i, { targetSets: Number(e.target.value) || 1 })
                            }
                            className="h-9 w-12 text-center tabular-nums"
                          />
                          <span className="text-xs text-muted-foreground">sets</span>
                        </div>
                        <span className="text-xs text-muted-foreground">×</span>
                        <div className="flex items-center gap-1">
                          <Input
                            inputMode="numeric"
                            value={row.targetRepMin}
                            onChange={(e) =>
                              patchRow(i, { targetRepMin: Number(e.target.value) || 1 })
                            }
                            className="h-9 w-12 text-center tabular-nums"
                          />
                          <span className="text-xs text-muted-foreground">–</span>
                          <Input
                            inputMode="numeric"
                            value={row.targetRepMax}
                            onChange={(e) =>
                              patchRow(i, { targetRepMax: Number(e.target.value) || 1 })
                            }
                            className="h-9 w-12 text-center tabular-nums"
                          />
                          <span className="text-xs text-muted-foreground">reps</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <ExercisePicker
                exercises={exercises}
                onPick={addExercise}
                excludeIds={rows.map((r) => r.exerciseId)}
                trigger={
                  <Button variant="outline" size="sm" className="h-10 w-full">
                    <Plus className="mr-1 h-4 w-4" />
                    Add exercise
                  </Button>
                }
              />
              {rows.length > 0 ? (
                <RecommendationBadge label="Set counts suggested from weekly volume targets" />
              ) : null}
            </div>
          )}
        </div>

        <DialogFooter className="border-t p-4">
          <Button onClick={save} disabled={pending || !canSave} className="h-10 w-full sm:w-auto">
            {program ? "Save changes" : "Create program"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
