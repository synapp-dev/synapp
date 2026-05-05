"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";

import { Button } from "@workspace/ui/components/button";

import { DiscordIcon } from "@/components/organisms/match-lobby/discord-icon";
import { MatchLobbyConcentricRings } from "@/components/organisms/match-lobby/match-lobby-concentric-rings";
import { useMatchLobbyMock } from "@/components/organisms/match-lobby/match-lobby-mock-context";

const INITIAL_SECONDS = 120;

/** Matches CONNECT button (`bg-[#7289DA]`). */
const DISCORD_BLURPLE = "#7289DA";

export function DiscordPhasePanel() {
  const router = useRouter();
  const params = useParams();
  const matchId =
    typeof params.id === "string"
      ? params.id
      : Array.isArray(params.id)
        ? params.id[0] ?? ""
        : "";

  const {
    assignmentAssigned,
    assignmentTotal,
    northConnected,
    northTotal,
    southConnected,
    southTotal,
  } = useMatchLobbyMock();
  const [remaining, setRemaining] = React.useState(INITIAL_SECONDS);

  React.useEffect(() => {
    const t = window.setInterval(() => {
      setRemaining((s) => (s <= 0 ? 0 : s - 1));
    }, 1000);
    return () => window.clearInterval(t);
  }, []);

  React.useEffect(() => {
    if (
      matchId &&
      assignmentTotal > 0 &&
      assignmentAssigned >= assignmentTotal
    ) {
      router.replace(`/match/${matchId}/veto`);
    }
  }, [assignmentAssigned, assignmentTotal, matchId, router]);

  const countdownProgress = remaining / INITIAL_SECONDS;

  const mm = Math.floor(remaining / 60);
  const ss = remaining % 60;
  const timeLabel = `${mm}:${ss.toString().padStart(2, "0")}`;

  const assignmentProgress =
    assignmentTotal > 0 ? assignmentAssigned / assignmentTotal : 0;
  const assignmentFractionLabel = `${assignmentAssigned} / ${assignmentTotal}`;

  const northFooterLabel = `${northConnected}/${northTotal}`;
  const southFooterLabel = `${southConnected}/${southTotal}`;

  const combinedAria = `Time remaining ${timeLabel}. ${assignmentAssigned} of ${assignmentTotal} players in team voice channels. North ${northConnected} of ${northTotal}, South ${southConnected} of ${southTotal}.`;

  return (
    <div className="flex flex-col items-center gap-6 py-2">
      <div className="flex items-center gap-2 text-lg font-semibold text-zinc-100">
        <DiscordIcon joined className="size-6" />
        Discord phase
      </div>

      <div className="mx-auto aspect-square w-full max-w-full shrink-0">
        <MatchLobbyConcentricRings
          outerProgress={assignmentProgress}
          timerProgress={countdownProgress}
          outerStrokeColor={DISCORD_BLURPLE}
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
            Assigned
          </span>
          <span className="text-xl font-bold tabular-nums text-zinc-100">
            {assignmentFractionLabel}
          </span>
        </div>
        </MatchLobbyConcentricRings>
      </div>

      <Button
        type="button"
        className="w-full max-w-xs gap-2 bg-[#7289DA] text-white hover:bg-[#5b6eae]"
      >
        <DiscordIcon joined className="size-5 text-white" />
        CONNECT
      </Button>

      <div
        className="flex w-full max-w-xs items-center justify-between rounded-lg bg-zinc-900/90 px-4 py-2 text-sm ring-1 ring-zinc-800"
        role="group"
        aria-label={`Team North ${northConnected} of ${northTotal} in voice, Team South ${southConnected} of ${southTotal} in voice (mock)`}
      >
        <span className="tabular-nums text-[#7289DA]" title="Team North in VC">
          {northFooterLabel}
        </span>
        <span className="text-center text-[11px] font-medium uppercase tracking-wide text-zinc-500">
          North · South
        </span>
        <span className="tabular-nums text-[#7289DA]" title="Team South in VC">
          {southFooterLabel}
        </span>
      </div>
    </div>
  );
}
