"use client";

import { Check, X } from "lucide-react";

import { usePugPlayout } from "../pug-playout-context";
import { Button } from "@workspace/ui/components/button";

const ROSTER: { name: string; team: "North" | "South" }[] = [
  { name: "donk", team: "North" },
  { name: "TeSeS", team: "South" },
  { name: "s1mple", team: "North" },
  { name: "m0NESY", team: "South" },
  { name: "m0NESY", team: "North" },
  { name: "donk", team: "South" },
  { name: "ZywOo", team: "North" },
  { name: "ZywOo", team: "South" },
  { name: "NiKo", team: "North" },
  { name: "NiKo", team: "South" },
];

const DECLINE_INDEX = 3;

export function AcceptPhaseStep({ onBackToPlay }: { onBackToPlay: () => void }) {
  const { acceptOneDeclines } = usePugPlayout();

  return (
    <div className="mx-auto flex max-w-md flex-col gap-4 py-2">
      <h2 className="text-center text-lg font-semibold">Accept match</h2>
      <p className="text-center text-xs text-muted-foreground">
        ~30s timer (mock). Everyone must accept to continue.
      </p>
      <ul className="space-y-2">
        {ROSTER.map((p, i) => {
          const declined = acceptOneDeclines && i === DECLINE_INDEX;
          return (
            <li
              key={`${p.name}-${i}`}
              className="flex items-center justify-between gap-3 rounded-md border border-border/80 bg-muted/30 px-3 py-2 text-sm"
            >
              <span className="min-w-0 truncate">
                <span className="text-muted-foreground">{p.team}</span> ·{" "}
                {p.name}
              </span>
              {declined ? (
                <span className="flex shrink-0 items-center gap-1 text-xs font-medium text-red-400">
                  <X className="size-4" aria-hidden />
                  Declined
                </span>
              ) : (
                <span className="flex shrink-0 items-center gap-1 text-xs font-medium text-emerald-400">
                  <Check className="size-4" aria-hidden />
                  Accepted
                </span>
              )}
            </li>
          );
        })}
      </ul>
      {acceptOneDeclines ? (
        <div className="space-y-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm">
          <p className="font-medium text-red-200">Match cancelled — dodge</p>
          <p className="text-xs text-red-200/80">
            Non-accepting players would receive queue penalties (product policy).
          </p>
          <Button type="button" variant="secondary" onClick={onBackToPlay}>
            Back to play hub
          </Button>
        </div>
      ) : null}
    </div>
  );
}
