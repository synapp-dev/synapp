"use client";

import * as React from "react";
import { Ban, CheckCircle2, CircleDot, Map, RotateCcw, Users } from "lucide-react";

import { ServerPhasePanel } from "@/app/(main)/match/[id]/server/server-phase-panel";
import { DiscordIcon } from "@/components/organisms/match-lobby/discord-icon";
import { LobbyTeamColumn } from "@/components/organisms/match-lobby/lobby-team-column";
import { LobbyVetoColumnFooter } from "@/components/organisms/match-lobby/lobby-veto-column-footer";
import { MatchLobbyConcentricRings } from "@/components/organisms/match-lobby/match-lobby-concentric-rings";
import { useMatchLobbyMock } from "@/components/organisms/match-lobby/match-lobby-mock-context";
import {
  VETO_MAP_POOL,
  type VetoSide,
  useMatchVetoMock,
} from "@/components/organisms/match-lobby/match-veto-mock-context";
import {
  MOCK_TEAM_NORTH,
  MOCK_TEAM_SOUTH,
} from "@/lib/match-lobby-mock-data";
import { Button } from "@workspace/ui/components/button";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/tabs";
import { cn } from "@workspace/ui/lib/utils";

const DISCORD_BLURPLE = "#7289DA";
const INITIAL_DISCORD_SECONDS = 120;

type LobbySubTab = "draft" | "discord" | "veto" | "server";

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

function SandboxVetoCenter() {
  const {
    bannedWithLabels,
    currentBanTeam,
    isComplete,
    decider,
    resetVeto,
  } = useMatchVetoMock();

  const deciderId = decider?.id ?? null;

  return (
    <div className="flex flex-col gap-4 py-2">
      <div className="flex items-center justify-center gap-2 text-lg font-semibold text-zinc-100">
        <Map className="size-5 text-[#7289DA]" aria-hidden />
        Map veto
      </div>

      {!isComplete ? (
        <p className="text-center text-xs font-medium text-[#7289DA]">
          Next ban: {currentBanTeam === "north" ? "North" : "South"} captain — use
          team footers below rosters.
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
          Map pool (mock)
        </h3>
        <ul className="grid gap-1.5" aria-live="polite">
          {VETO_MAP_POOL.map((m) => {
            const status = mapRowStatus(m.id, bannedWithLabels, deciderId);
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
                      Banned ({status.by === "north" ? "North" : "South"})
                    </span>
                  </span>
                ) : status.kind === "decider" ? (
                  <span className="flex shrink-0 items-center gap-1.5 text-xs font-medium text-emerald-400">
                    <CheckCircle2 className="size-3.5 shrink-0" aria-hidden />
                    Decider
                  </span>
                ) : (
                  <span className="flex shrink-0 items-center gap-1.5 text-xs text-zinc-500">
                    <CircleDot
                      className="size-3.5 shrink-0 text-zinc-600"
                      aria-hidden
                    />
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

function DiscordSandboxPanel() {
  const {
    assignmentAssigned,
    assignmentTotal,
    northConnected,
    northTotal,
    southConnected,
    southTotal,
  } = useMatchLobbyMock();
  const [remaining, setRemaining] = React.useState(INITIAL_DISCORD_SECONDS);

  React.useEffect(() => {
    const t = window.setInterval(() => {
      setRemaining((s) => (s <= 0 ? 0 : s - 1));
    }, 1000);
    return () => window.clearInterval(t);
  }, []);

  const countdownProgress = remaining / INITIAL_DISCORD_SECONDS;
  const assignmentProgress =
    assignmentTotal > 0 ? assignmentAssigned / assignmentTotal : 0;
  const mm = Math.floor(remaining / 60);
  const ss = remaining % 60;
  const timeLabel = `${mm}:${ss.toString().padStart(2, "0")}`;
  const assignmentFractionLabel = `${assignmentAssigned} / ${assignmentTotal}`;
  const northFooterLabel = `${northConnected}/${northTotal}`;
  const southFooterLabel = `${southConnected}/${southTotal}`;
  const combinedAria = `Time remaining ${timeLabel}. ${assignmentAssigned} of ${assignmentTotal} players in team voice channels.`;

  const allAssigned =
    assignmentTotal > 0 && assignmentAssigned >= assignmentTotal;

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
        aria-label={`Team North ${northConnected} of ${northTotal}, Team South ${southConnected} of ${southTotal} (mock)`}
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

      {allAssigned ? (
        <p className="max-w-sm text-center text-xs font-medium text-emerald-400">
          All players assigned to team voice (mock). Open the{" "}
          <strong>Veto</strong> tab when ready.
        </p>
      ) : (
        <p className="max-w-sm text-center text-xs text-zinc-500">
          Toggle Discord voice on player rows in the team columns (mock).
        </p>
      )}
    </div>
  );
}

export function LobbyStep() {
  const [tab, setTab] = React.useState<LobbySubTab>("draft");

  const serverPhase = tab === "server";

  return (
    <div className="space-y-3 text-zinc-100">
      <p className="text-center text-[11px] font-medium uppercase tracking-[0.2em] text-zinc-500">
        CSGO Lobby #sandbox-1
      </p>

      <Tabs
        value={tab}
        onValueChange={(v) => setTab(v as LobbySubTab)}
        className="w-full"
      >
        <TabsList className="mx-auto flex w-full max-w-xl flex-wrap justify-center gap-1 bg-zinc-900/80 p-1">
          {(
            [
              ["draft", "Draft"],
              ["discord", "Discord"],
              ["veto", "Veto"],
              ["server", "Server"],
            ] as const
          ).map(([id, label]) => (
            <TabsTrigger
              key={id}
              value={id}
              className="text-xs data-[state=active]:bg-zinc-800"
            >
              {label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="draft" className="mt-4">
          <div className="grid min-h-[420px] grid-cols-1 gap-10 lg:grid-cols-3 lg:items-start">
            <LobbyTeamColumn team={MOCK_TEAM_NORTH} side="north" />
            <div className="flex min-w-0 flex-col items-center gap-4 rounded-xl bg-zinc-950/40 p-4">
              <div className="flex items-center gap-2 text-lg font-semibold text-zinc-100">
                <Users className="size-5 text-[#7289DA]" aria-hidden />
                Draft phase
              </div>
              <p className="max-w-sm text-center text-sm text-zinc-400">
                Captains alternate picks until both teams have five players. Mock
                order below — no live draft yet.
              </p>
              <ol className="w-full max-w-xs space-y-2 text-sm text-zinc-300">
                <li className="rounded-md bg-zinc-900/80 px-3 py-2 ring-1 ring-zinc-800">
                  1. Team North — NiKo
                </li>
                <li className="rounded-md bg-zinc-900/80 px-3 py-2 ring-1 ring-zinc-800">
                  2. Team South — TeSeS
                </li>
                <li className="rounded-md bg-zinc-900/80 px-3 py-2 ring-1 ring-zinc-800">
                  3. Team South — ZywOo
                </li>
                <li className="rounded-md bg-zinc-900/40 px-3 py-2 text-zinc-500 ring-1 ring-dashed ring-zinc-700">
                  …
                </li>
              </ol>
              <Button
                type="button"
                variant="secondary"
                className="pointer-events-none bg-zinc-800 text-zinc-400"
                disabled
              >
                Waiting for captain…
              </Button>
            </div>
            <LobbyTeamColumn team={MOCK_TEAM_SOUTH} side="south" />
          </div>
        </TabsContent>

        <TabsContent value="discord" className="mt-4">
          <div className="grid min-h-[420px] grid-cols-1 gap-10 lg:grid-cols-3 lg:items-start">
            <LobbyTeamColumn team={MOCK_TEAM_NORTH} side="north" />
            <div className="flex min-w-0 flex-col rounded-xl bg-zinc-950/40 p-4">
              <DiscordSandboxPanel />
            </div>
            <LobbyTeamColumn team={MOCK_TEAM_SOUTH} side="south" />
          </div>
        </TabsContent>

        <TabsContent value="veto" className="mt-4">
          <div className="grid min-h-[420px] grid-cols-1 gap-10 lg:grid-cols-3 lg:items-start">
            <div className="flex min-h-0 min-w-0 flex-col">
              <LobbyTeamColumn team={MOCK_TEAM_NORTH} side="north" />
              <LobbyVetoColumnFooter side="north" vetoPhaseOverride />
            </div>
            <div className="flex min-w-0 flex-col rounded-xl bg-zinc-950/40 p-4">
              <SandboxVetoCenter />
            </div>
            <div className="flex min-h-0 min-w-0 flex-col">
              <LobbyTeamColumn team={MOCK_TEAM_SOUTH} side="south" />
              <LobbyVetoColumnFooter side="south" vetoPhaseOverride />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="server" className="mt-4">
          <div
            className={cn(
              "grid min-h-[420px] grid-cols-1 gap-10 lg:grid-cols-3 lg:items-start",
              "lg:items-stretch",
            )}
          >
            <LobbyTeamColumn
              team={MOCK_TEAM_NORTH}
              side="north"
              serverPhaseOverride={serverPhase}
            />
            <div className="flex min-w-0 flex-col rounded-xl bg-zinc-950/40 p-4">
              <ServerPhasePanel />
            </div>
            <LobbyTeamColumn
              team={MOCK_TEAM_SOUTH}
              side="south"
              serverPhaseOverride={serverPhase}
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
