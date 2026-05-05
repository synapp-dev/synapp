"use client";

import { usePathname } from "next/navigation";

import { Button } from "@workspace/ui/components/button";

import {
  type VetoSide,
  useMatchVetoMock,
} from "@/components/organisms/match-lobby/match-veto-mock-context";

type LobbyVetoColumnFooterProps = {
  side: VetoSide;
  /** When set, overrides pathname-based detection (e.g. sandbox lobby veto sub-step). */
  vetoPhaseOverride?: boolean;
};

export function LobbyVetoColumnFooter({
  side,
  vetoPhaseOverride,
}: LobbyVetoColumnFooterProps) {
  const pathname = usePathname();
  const onVetoRoute =
    vetoPhaseOverride ?? (pathname?.includes("/veto") ?? false);

  const { remainingMaps, currentBanTeam, isComplete, banMap } =
    useMatchVetoMock();

  if (!onVetoRoute) {
    return null;
  }

  const teamLabel = side === "north" ? "Team North" : "Team South";
  const isYourTurn = !isComplete && currentBanTeam === side;
  const waitingLabel =
    currentBanTeam === "north" ? "North" : "South";

  return (
    <div className="mt-3 rounded-xl border border-zinc-800/80 bg-zinc-950/60 p-3 ring-1 ring-zinc-800/40">
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
        Captain veto · {teamLabel} (simulated)
      </p>

      {isComplete ? (
        <p className="text-xs text-zinc-500">
          Veto finished — map pool and decider are shown in the center panel.
        </p>
      ) : isYourTurn ? (
        <div className="flex flex-col gap-2">
          <p className="text-xs text-zinc-400">Your turn — ban a map:</p>
          <div className="flex flex-wrap gap-1.5">
            {remainingMaps.map((m) => (
              <Button
                key={m.id}
                type="button"
                variant="outline"
                size="sm"
                className="h-8 border-zinc-700 bg-zinc-900/80 text-xs hover:border-red-900/50 hover:bg-red-950/35 hover:text-red-100"
                onClick={() => banMap(m.id, side)}
              >
                Ban {m.label}
              </Button>
            ))}
          </div>
        </div>
      ) : (
        <p className="text-xs text-zinc-500">
          Waiting for {waitingLabel} captain to ban…
        </p>
      )}
    </div>
  );
}
