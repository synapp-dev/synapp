"use client";

import { useState } from "react";
import { format, parseISO } from "date-fns";
import { Input } from "@workspace/ui/components/input";
import { useBodyWeights, useLogBodyWeight } from "@/hooks/gym/use-gym";

/**
 * Overlay for the body-map card: the latest bodyweight (which the strength
 * standards are positioned against) sits top-left with its date as subtext —
 * click it to log today's weight. Designed to be dropped into a `relative`
 * container.
 */
export function BodyWeightOverlay() {
  const { data: log } = useBodyWeights();
  const logWeight = useLogBodyWeight();
  const latest = log?.[0] ?? null;
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState("");

  function submit() {
    const w = parseFloat(value);
    if (!(w > 0)) {
      setEditing(false);
      return;
    }
    logWeight.mutate(
      { weightKg: Math.round(w * 10) / 10 },
      {
        onSuccess: () => {
          setValue("");
          setEditing(false);
        },
      },
    );
  }

  return (
    <>
      {/* Current bodyweight — top-left */}
      <div className="absolute left-4 top-4 z-10">
        {editing ? (
          <Input
            autoFocus
            type="number"
            inputMode="decimal"
            step="0.1"
            placeholder="kg"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") submit();
              if (e.key === "Escape") setEditing(false);
            }}
            onBlur={submit}
            className="h-8 w-20"
            aria-label="Bodyweight in kg"
          />
        ) : (
          <button
            type="button"
            onClick={() => {
              setValue(latest ? String(latest.weightKg) : "");
              setEditing(true);
            }}
            className="text-left"
            title="Log today's weight"
          >
            {latest ? (
              <>
                <p className="text-lg font-semibold leading-none tabular-nums">
                  {latest.weightKg} kg
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {format(parseISO(latest.measuredAt), "d MMM")}
                </p>
              </>
            ) : (
              <p className="text-xs text-muted-foreground">Log weight</p>
            )}
          </button>
        )}
      </div>
    </>
  );
}
