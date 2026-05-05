"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { Ban, CheckCircle2, CircleDot, Map, RotateCcw } from "lucide-react";

import { Button } from "@workspace/ui/components/button";

import {
  VETO_MAP_POOL,
  type VetoSide,
  useMatchVetoMock,
} from "@/components/organisms/match-lobby/match-veto-mock-context";

function mapRowStatus(
  mapId: string,
  bannedWithLabels: { mapId: string; by: VetoSide }[],
  deciderId: string | null,
):
  | { kind: "available" }
  | { kind: "banned"; by: VetoSide; banIndex: number }
  | { kind: "decider" } {
  if (deciderId === mapId) {
    return { kind: "decider" };
  }
  const idx = bannedWithLabels.findIndex((b) => b.mapId === mapId);
  const bannedEntry = idx >= 0 ? bannedWithLabels[idx] : undefined;
  if (bannedEntry) {
    return { kind: "banned", by: bannedEntry.by, banIndex: idx + 1 };
  }
  return { kind: "available" };
}

export function VetoPhasePanel() {
  const router = useRouter();
  const params = useParams();
  const matchId =
    typeof params.id === "string"
      ? params.id
      : Array.isArray(params.id)
        ? params.id[0] ?? ""
        : "";

  const {
    bannedWithLabels,
    currentBanTeam,
    isComplete,
    decider,
    resetVeto,
  } = useMatchVetoMock();

  React.useEffect(() => {
    if (matchId && isComplete && decider) {
      router.replace(`/match/${matchId}/server`);
    }
  }, [decider, isComplete, matchId, router]);

  const deciderId = decider?.id ?? null;

  return (
    <div className="flex flex-col gap-5 py-2">
      <div className="flex items-center justify-center gap-2 text-lg font-semibold text-zinc-100">
        <Map className="size-5 text-[#7289DA]" aria-hidden />
        Map veto
      </div>

      {!isComplete ? (
        <p className="text-center text-xs font-medium text-[#7289DA]">
          Next ban: {currentBanTeam === "north" ? "North" : "South"} captain — use
          team panels below rosters.
        </p>
      ) : (
        <p className="text-center text-sm font-medium text-emerald-400">
          Veto complete — decider{" "}
          <span className="font-semibold text-zinc-100">
            {decider?.label ?? "—"}
          </span>
        </p>
      )}

      <div className="mx-auto w-full max-w-md space-y-2">
        <h3 className="text-center text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
          Map pool (live)
        </h3>
        <ul className="grid gap-1.5" aria-live="polite" aria-relevant="additions text">
          {VETO_MAP_POOL.map((m) => {
            const status = mapRowStatus(
              m.id,
              bannedWithLabels,
              deciderId,
            );
            return (
              <li
                key={m.id}
                className="flex items-center justify-between gap-3 rounded-lg bg-zinc-900/85 px-3 py-2.5 text-sm ring-1 ring-zinc-800/90"
              >
                <span className="min-w-0 font-medium tracking-tight text-zinc-100">
                  {m.label}
                </span>
                {status.kind === "banned" ? (
                  <span className="flex shrink-0 items-center gap-1.5 text-xs text-red-400/95">
                    <Ban className="size-3.5 shrink-0" aria-hidden />
                    <span className="tabular-nums text-zinc-500">
                      #{status.banIndex}
                    </span>
                    <span>
                      Banned (
                      {status.by === "north" ? "North" : "South"})
                    </span>
                  </span>
                ) : status.kind === "decider" ? (
                  <span className="flex shrink-0 items-center gap-1.5 text-xs font-medium text-emerald-400">
                    <CheckCircle2 className="size-3.5 shrink-0" aria-hidden />
                    Decider
                  </span>
                ) : (
                  <span className="flex shrink-0 items-center gap-1.5 text-xs text-zinc-500">
                    <CircleDot className="size-3.5 shrink-0 text-zinc-600" aria-hidden />
                    In pool
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      </div>

      {bannedWithLabels.length > 0 ? (
        <div className="mx-auto w-full max-w-md">
          <h3 className="mb-2 text-center text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
            Ban order
          </h3>
          <ol className="flex flex-wrap justify-center gap-2 text-xs text-zinc-400">
            {bannedWithLabels.map((b, i) => (
              <li
                key={`${b.mapId}-${i}`}
                className="rounded-md bg-zinc-900/70 px-2 py-1 ring-1 ring-zinc-800"
              >
                <span className="font-mono text-zinc-500">{i + 1}.</span>{" "}
                <span className="text-zinc-200">{b.label}</span>{" "}
                <span className="text-red-400/90">
                  ({b.by === "north" ? "N" : "S"})
                </span>
              </li>
            ))}
          </ol>
        </div>
      ) : null}

      <div className="flex justify-center pt-1">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="gap-2 text-zinc-500 hover:text-zinc-300"
          onClick={resetVeto}
        >
          <RotateCcw className="size-3.5" aria-hidden />
          Reset veto
        </Button>
      </div>
    </div>
  );
}
