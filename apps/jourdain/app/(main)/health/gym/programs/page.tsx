"use client";

import { Pencil, Plus, Sparkles, Trash2 } from "lucide-react";
import { Card, CardContent } from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";
import { Badge } from "@workspace/ui/components/badge";
import { useDeleteProgram, useExercises, usePrograms } from "@/hooks/gym/use-gym";
import { ProgramForm } from "@/components/gym/program-form";
import { StartSessionButton } from "@/components/gym/start-session-button";
import { MUSCLE_GROUP_LABELS } from "@/entities/gym/model/types";

export default function GymProgramsPage() {
  const { data: programs, isLoading } = usePrograms();
  const { data: exercises } = useExercises();
  const deleteProgram = useDeleteProgram();

  return (
    <div className="mx-auto w-full max-w-7xl space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium tracking-tight">Programs</h2>
        <ProgramForm
          exercises={exercises ?? []}
          trigger={
            <Button size="sm">
              <Plus className="mr-1 h-4 w-4" />
              New program
            </Button>
          }
        />
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (programs ?? []).length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center text-sm text-muted-foreground">
            No programs yet. Create a day template like “Chest &amp; Triceps”.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {(programs ?? []).map((program) => (
            <Card key={program.id}>
              <CardContent className="space-y-3 p-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="truncate font-medium">{program.name}</p>
                    {program.isSmart ? (
                      <Badge variant="secondary" className="shrink-0 gap-0.5 text-[10px]">
                        <Sparkles className="h-2.5 w-2.5" />
                        Smart
                      </Badge>
                    ) : null}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {program.isSmart
                      ? `Auto-picked · ${program.muscleGroups.length} group${program.muscleGroups.length === 1 ? "" : "s"}`
                      : `${program.exercises.length} exercise${program.exercises.length === 1 ? "" : "s"}`}
                  </p>
                </div>

                {program.muscleGroups.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {program.muscleGroups.map((m) => (
                      <Badge key={m} variant="secondary" className="text-[10px]">
                        {MUSCLE_GROUP_LABELS[m]}
                      </Badge>
                    ))}
                  </div>
                ) : null}

                {program.exercises.length > 0 ? (
                  <ul className="space-y-0.5 text-xs text-muted-foreground">
                    {program.exercises.slice(0, 6).map((e) => (
                      <li key={e.id} className="flex justify-between gap-2">
                        <span className="truncate">{e.name}</span>
                        <span className="shrink-0 tabular-nums">
                          {e.targetSets}×{e.targetRepMin}–{e.targetRepMax}
                        </span>
                      </li>
                    ))}
                    {program.exercises.length > 6 ? (
                      <li>+{program.exercises.length - 6} more</li>
                    ) : null}
                  </ul>
                ) : null}

                <div className="flex gap-2">
                  <StartSessionButton programId={program.id} className="flex-1" />
                  <ProgramForm
                    exercises={exercises ?? []}
                    program={program}
                    trigger={
                      <Button size="icon" variant="outline" aria-label="Edit">
                        <Pencil className="h-4 w-4" />
                      </Button>
                    }
                  />
                  <Button
                    size="icon"
                    variant="outline"
                    className="text-muted-foreground"
                    aria-label="Delete"
                    onClick={() => deleteProgram.mutate(program.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
