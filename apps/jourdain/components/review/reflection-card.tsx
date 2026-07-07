"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Loader2, NotebookPen } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { Textarea } from "@workspace/ui/components/textarea";
import { useReview, useUpsertReview } from "@/hooks/reviews/use-reviews";

const PROMPTS = [
  {
    key: "wins",
    label: "What went well",
    placeholder: "Wins, progress, moments worth repeating",
  },
  {
    key: "challenges",
    label: "What got in the way",
    placeholder: "Friction, misses, energy drains",
  },
  {
    key: "focus",
    label: "Focus for next week",
    placeholder: "The one or two things that matter most",
  },
] as const;

type DraftKey = (typeof PROMPTS)[number]["key"];
type Draft = Record<DraftKey, string>;

const EMPTY_DRAFT: Draft = { wins: "", challenges: "", focus: "" };

function normalise(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/** Guided three-prompt reflection for the week; autosaves on blur. */
export function ReflectionCard({ weekStart }: { weekStart: string }) {
  const { data: review, isLoading } = useReview(weekStart);
  const upsert = useUpsertReview();
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);

  // Sync the draft once per week load; later refetches must not clobber typing.
  const reviewRef = useRef(review);
  reviewRef.current = review;
  const loadedWeek = isLoading ? null : weekStart;
  useEffect(() => {
    if (loadedWeek === null) return;
    const saved = reviewRef.current;
    setDraft({
      wins: saved?.wins ?? "",
      challenges: saved?.challenges ?? "",
      focus: saved?.focus ?? "",
    });
  }, [loadedWeek]);

  const savedMatchesDraft =
    !isLoading &&
    PROMPTS.every(
      ({ key }) => normalise(draft[key]) === (review?.[key] ?? null)
    );

  function handleBlur() {
    if (isLoading || savedMatchesDraft) return;
    upsert.mutate({
      weekStart,
      wins: normalise(draft.wins),
      challenges: normalise(draft.challenges),
      focus: normalise(draft.focus),
    });
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <NotebookPen className="h-4 w-4 text-muted-foreground" />
          Weekly reflection
        </CardTitle>
        {upsert.isPending ? (
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" />
            Saving
          </span>
        ) : review && savedMatchesDraft ? (
          <span className="flex items-center gap-1 text-xs text-emerald-500">
            <Check className="h-3 w-3" />
            Saved
          </span>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : (
          PROMPTS.map(({ key, label, placeholder }) => (
            <div key={key} className="space-y-1.5">
              <label
                htmlFor={`reflection-${key}`}
                className="text-xs font-medium uppercase tracking-wider text-muted-foreground"
              >
                {label}
              </label>
              <Textarea
                id={`reflection-${key}`}
                value={draft[key]}
                placeholder={placeholder}
                onChange={(event) =>
                  setDraft((prev) => ({ ...prev, [key]: event.target.value }))
                }
                onBlur={handleBlur}
                className="min-h-20 resize-y"
              />
            </div>
          ))
        )}
        <p className="text-xs text-muted-foreground">
          Autosaves when you click away. Come back and edit any week later.
        </p>
      </CardContent>
    </Card>
  );
}
