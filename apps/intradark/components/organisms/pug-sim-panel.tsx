"use client";

import * as React from "react";
import { FlaskConical, Minus, Plus, RotateCcw } from "lucide-react";

import {
  useSimController,
  type BotScenario,
} from "@/entities/match-queue/hooks/use-sim";
import type { QueueLeague } from "@/entities/match-queue/lib/leagues";
import { Button } from "@workspace/ui/components/button";
import { Label } from "@workspace/ui/components/label";
import { RadioGroup, RadioGroupItem } from "@workspace/ui/components/radio-group";
import { cn } from "@workspace/ui/lib/utils";

const SCENARIOS: {
  id: BotScenario;
  title: string;
  hint: string;
}[] = [
  {
    id: "all_accept",
    title: "Bots all accept",
    hint: "Then you Accept → match ready. Or Decline / ignore → you get a cooldown.",
  },
  {
    id: "n_decline",
    title: "Some bots decline",
    hint: "You Accept but others bail → match cancelled, you're returned to queue (no penalty).",
  },
  {
    id: "all_decline",
    title: "Bots all decline",
    hint: "The whole lobby dodges → match cancelled regardless of you.",
  },
  {
    id: "random",
    title: "Random (≈20% decline)",
    hint: "Each bot independently accepts or declines.",
  },
];

export function PugSimPanel({
  league,
  controller,
}: {
  league: QueueLeague;
  controller: ReturnType<typeof useSimController>;
}) {
  const [scenario, setScenario] = React.useState<BotScenario>("all_accept");
  const [declineCount, setDeclineCount] = React.useState(2);

  const { phase, log, start, reset } = controller;
  const running = phase === "filling" || phase === "ready";

  return (
    <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.03] p-4">
      <div className="mb-3 flex items-center gap-2">
        <FlaskConical className="size-4 text-amber-400" />
        <h3 className="text-sm font-semibold text-amber-100">
          PUG Loop Simulator
        </h3>
        <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-300">
          dev
        </span>
        <span className="ml-auto text-[11px] text-white/40">
          9 HLTV pros · {league} queue
        </span>
      </div>

      <RadioGroup
        value={scenario}
        onValueChange={(v) => setScenario(v as BotScenario)}
        className="gap-2"
        disabled={running}
      >
        {SCENARIOS.map((s) => (
          <div key={s.id}>
            <label
              className={cn(
                "flex cursor-pointer items-start gap-2.5 rounded-lg border px-3 py-2 transition-colors",
                scenario === s.id
                  ? "border-amber-500/40 bg-amber-500/10"
                  : "border-white/10 hover:bg-white/[0.03]",
              )}
            >
              <RadioGroupItem value={s.id} className="mt-0.5" />
              <span className="min-w-0">
                <span className="flex items-center gap-2 text-sm font-medium text-white">
                  {s.title}
                  {s.id === "n_decline" && scenario === "n_decline" ? (
                    <span className="flex items-center gap-1.5">
                      <button
                        type="button"
                        className="flex size-5 items-center justify-center rounded bg-white/10 hover:bg-white/20"
                        onClick={(e) => {
                          e.preventDefault();
                          setDeclineCount((n) => Math.max(1, n - 1));
                        }}
                      >
                        <Minus className="size-3" />
                      </button>
                      <span className="w-4 text-center tabular-nums">
                        {declineCount}
                      </span>
                      <button
                        type="button"
                        className="flex size-5 items-center justify-center rounded bg-white/10 hover:bg-white/20"
                        onClick={(e) => {
                          e.preventDefault();
                          setDeclineCount((n) => Math.min(9, n + 1));
                        }}
                      >
                        <Plus className="size-3" />
                      </button>
                    </span>
                  ) : null}
                </span>
                <span className="mt-0.5 block text-[11px] leading-snug text-white/45">
                  {s.hint}
                </span>
              </span>
            </label>
          </div>
        ))}
      </RadioGroup>

      <div className="mt-3 flex items-center gap-2">
        <Button
          className="h-9 flex-1 bg-amber-600 font-semibold text-white hover:bg-amber-500"
          disabled={running}
          onClick={() => start({ league, scenario, declineCount })}
        >
          {running ? "Simulation running…" : "Run simulation"}
        </Button>
        <Button
          variant="secondary"
          size="sm"
          className="h-9"
          onClick={() => reset()}
        >
          <RotateCcw className="size-3.5" />
          Reset
        </Button>
      </div>

      {log.length > 0 ? (
        <div className="mt-3 max-h-28 overflow-y-auto rounded-lg border border-white/10 bg-black/40 px-3 py-2 font-mono text-[11px] leading-relaxed text-white/55">
          {log.map((line, i) => (
            <div key={i}>{line}</div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
