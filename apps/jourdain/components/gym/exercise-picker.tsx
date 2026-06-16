"use client";

import { useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@workspace/ui/components/dialog";
import { Input } from "@workspace/ui/components/input";
import { Badge } from "@workspace/ui/components/badge";
import {
  MUSCLE_GROUPS,
  MUSCLE_GROUP_LABELS,
  STATION_LABELS,
  type Exercise,
} from "@/entities/gym/model/types";

/** Dialog that lists library exercises grouped by muscle; picking one fires
 *  onPick and closes. Used for building programs and adding mid-session. */
export function ExercisePicker({
  exercises,
  onPick,
  trigger,
  excludeIds,
}: {
  exercises: Exercise[];
  onPick: (exercise: Exercise) => void;
  trigger: React.ReactNode;
  excludeIds?: string[];
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const exclude = useMemo(() => new Set(excludeIds ?? []), [excludeIds]);
  const grouped = useMemo(() => {
    const q = query.trim().toLowerCase();
    const visible = exercises.filter(
      (e) =>
        !e.archived &&
        !exclude.has(e.id) &&
        (q === "" || e.name.toLowerCase().includes(q))
    );
    return MUSCLE_GROUPS.map((mg) => ({
      muscle: mg,
      items: visible.filter((e) => e.group === mg),
    })).filter((g) => g.items.length > 0);
  }, [exercises, query, exclude]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[80vh] gap-3 overflow-hidden p-0 sm:max-w-md">
        <DialogHeader className="space-y-3 border-b p-4 pb-3">
          <DialogTitle>Add exercise</DialogTitle>
          <Input
            autoFocus
            placeholder="Search exercises…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-9"
          />
        </DialogHeader>
        <div className="max-h-[55vh] space-y-4 overflow-y-auto px-4 pb-4">
          {grouped.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No matching exercises.
            </p>
          ) : (
            grouped.map((group) => (
              <div key={group.muscle} className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {MUSCLE_GROUP_LABELS[group.muscle]}
                </p>
                {group.items.map((ex) => (
                  <button
                    key={ex.id}
                    type="button"
                    onClick={() => {
                      onPick(ex);
                      setOpen(false);
                      setQuery("");
                    }}
                    className="flex w-full items-center justify-between gap-2 rounded-md border px-3 py-2 text-left text-sm transition-colors hover:bg-accent"
                  >
                    <span className="min-w-0 truncate font-medium">{ex.name}</span>
                    <Badge variant="secondary" className="shrink-0 text-[10px]">
                      {STATION_LABELS[ex.station]}
                    </Badge>
                  </button>
                ))}
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
