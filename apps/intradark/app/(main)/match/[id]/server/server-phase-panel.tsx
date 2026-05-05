"use client";

import * as React from "react";
import { Check, Copy, Server } from "lucide-react";

import { Button } from "@workspace/ui/components/button";

import { MatchLobbyConcentricRings } from "@/components/organisms/match-lobby/match-lobby-concentric-rings";
import { useMatchLobbyMock } from "@/components/organisms/match-lobby/match-lobby-mock-context";

const INITIAL_SECONDS = 120;
const ACCENT = "#7289DA";

const MOCK_CONNECT = "connect play.intradark.mock:27015; password mock123";

export function ServerPhasePanel() {
  const {
    serverAssigned,
    serverTotal,
    northOnServer,
    northTotal,
    southOnServer,
    southTotal,
  } = useMatchLobbyMock();

  const [remaining, setRemaining] = React.useState(INITIAL_SECONDS);
  const [copied, setCopied] = React.useState(false);

  React.useEffect(() => {
    const t = window.setInterval(() => {
      setRemaining((s) => (s <= 0 ? 0 : s - 1));
    }, 1000);
    return () => window.clearInterval(t);
  }, []);

  const copy = React.useCallback(async () => {
    try {
      await navigator.clipboard.writeText(MOCK_CONNECT);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }, []);

  const countdownProgress = remaining / INITIAL_SECONDS;
  const serverProgress =
    serverTotal > 0 ? serverAssigned / serverTotal : 0;

  const mm = Math.floor(remaining / 60);
  const ss = remaining % 60;
  const timeLabel = `${mm}:${ss.toString().padStart(2, "0")}`;
  const serverFractionLabel = `${serverAssigned} / ${serverTotal}`;
  const northFooterLabel = `${northOnServer}/${northTotal}`;
  const southFooterLabel = `${southOnServer}/${southTotal}`;

  const combinedAria = `Time remaining ${timeLabel}. ${serverAssigned} of ${serverTotal} players on server. North ${northOnServer} of ${northTotal}, South ${southOnServer} of ${southTotal}.`;

  return (
    <div className="flex flex-col items-center gap-6 py-2">
      <div className="flex items-center gap-2 text-lg font-semibold text-zinc-100">
        <Server className="size-6 text-[#7289DA]" aria-hidden />
        Join server
      </div>

      <p className="text-center text-sm text-zinc-400">
        Join before time runs out. Simulate joins by clicking the Counter-Strike
        figure beside each player (mock).
      </p>

      <div className="mx-auto aspect-square w-full max-w-full shrink-0">
        <MatchLobbyConcentricRings
          outerProgress={serverProgress}
          timerProgress={countdownProgress}
          outerStrokeColor={ACCENT}
          ariaLabel={combinedAria}
        >
          <div className="flex flex-col items-center leading-tight">
            <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">
              Remaining
            </span>
            <span className="text-3xl font-bold tabular-nums text-zinc-100">
              {timeLabel}
            </span>
          </div>
          <div className="flex flex-col items-center leading-tight">
            <span className="text-[9px] font-medium uppercase tracking-wider text-zinc-500">
              On server
            </span>
            <span className="text-xl font-bold tabular-nums text-zinc-100">
              {serverFractionLabel}
            </span>
          </div>
        </MatchLobbyConcentricRings>
      </div>

      <div className="w-full max-w-md rounded-lg bg-zinc-950 px-4 py-3 font-mono text-xs text-zinc-300 ring-1 ring-zinc-800 sm:text-sm">
        {MOCK_CONNECT}
      </div>

      <div className="flex w-full max-w-xs flex-col gap-3">
        <Button
          type="button"
          onClick={() => void copy()}
          variant="outline"
          className="gap-2 border-zinc-700 bg-zinc-900 text-zinc-100 hover:bg-zinc-800"
        >
          {copied ? (
            <>
              <Check className="size-4 text-emerald-400" />
              Copied
            </>
          ) : (
            <>
              <Copy className="size-4" />
              Copy connect string
            </>
          )}
        </Button>
      </div>

      <div
        className="flex w-full max-w-xs items-center justify-between rounded-lg bg-zinc-900/90 px-4 py-2 text-sm ring-1 ring-zinc-800"
        role="group"
        aria-label={`Team North ${northOnServer} of ${northTotal} on server, Team South ${southOnServer} of ${southTotal} on server (mock)`}
      >
        <span className="tabular-nums text-[#7289DA]" title="Team North on server">
          {northFooterLabel}
        </span>
        <span className="text-center text-[11px] font-medium uppercase tracking-wide text-zinc-500">
          North · South
        </span>
        <span className="tabular-nums text-[#7289DA]" title="Team South on server">
          {southFooterLabel}
        </span>
      </div>
    </div>
  );
}
