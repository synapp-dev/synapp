"use client";

import * as React from "react";
import { Check, Loader2 } from "lucide-react";

import { useMatchRoom } from "@/entities/match-queue/hooks/use-match-room";
import type { MatchRosterPlayer, MatchView } from "@/entities/match-queue/hooks/use-match";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@workspace/ui/components/avatar";
import { Button } from "@workspace/ui/components/button";
import { cn } from "@workspace/ui/lib/utils";

import { DiscordIcon } from "./discord-icon";
import { MatchLobbyConcentricRings } from "./match-lobby-concentric-rings";

const DISCORD_BLURPLE = "#7289DA";
const STAGING_WINDOW_SECONDS = 120;

function PlayerRow({
  p,
  side,
  serverPhase,
}: {
  p: MatchRosterPlayer;
  side: "north" | "south";
  serverPhase: boolean;
}) {
  const initials = p.name.slice(0, 2).toUpperCase();
  const lit = serverPhase ? p.connected : p.discordJoined;
  return (
    <div
      className={cn(
        "flex items-stretch gap-2 rounded-lg bg-zinc-900/90 py-2 pl-2 pr-2 ring-1 transition-colors sm:gap-3 sm:py-2.5",
        lit ? "ring-[#7289DA]/40" : "ring-zinc-800",
        side === "south" && "flex-row-reverse",
        p.isYou && "ring-sidebar-primary/60",
      )}
    >
      <Avatar className="size-11 self-center rounded-full ring-1 ring-zinc-700 sm:size-12">
        {p.avatarUrl ? (
          <AvatarImage src={p.avatarUrl} alt="" className="object-cover" />
        ) : null}
        <AvatarFallback className="bg-zinc-800 text-xs font-bold text-white/70">
          {initials}
        </AvatarFallback>
      </Avatar>
      <div
        className={cn(
          "min-w-0 flex-1 self-center",
          side === "south" && "text-right",
        )}
      >
        <div
          className={cn(
            "flex items-center gap-1.5",
            side === "south" && "justify-end",
          )}
        >
          <span className="truncate font-semibold text-zinc-100">{p.name}</span>
          {p.isYou ? (
            <span className="text-[10px] font-bold uppercase text-sidebar-primary">
              you
            </span>
          ) : null}
        </div>
        <p className="truncate text-xs text-zinc-500">
          {p.realName ?? `${p.rating ?? "—"} ELO`}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2 self-center">
        {p.discordLinked ? null : (
          <span className="text-[9px] uppercase text-zinc-600">no&nbsp;link</span>
        )}
        <DiscordIcon joined={p.discordJoined} className="size-[1.9rem]" />
      </div>
    </div>
  );
}

function TeamColumn({
  name,
  players,
  side,
  serverPhase,
}: {
  name: string;
  players: MatchRosterPlayer[];
  side: "north" | "south";
  serverPhase: boolean;
}) {
  return (
    <div className="flex min-h-0 min-w-0 w-full flex-col gap-3">
      <h2
        className={cn(
          "text-xl font-bold tracking-tight text-zinc-100 sm:text-2xl",
          side === "south" && "text-right",
        )}
      >
        {name}
      </h2>
      <div className="flex flex-col gap-2">
        {players.map((p) => (
          <PlayerRow key={p.steamid64} p={p} side={side} serverPhase={serverPhase} />
        ))}
      </div>
    </div>
  );
}

function DiscordPhase({
  match,
  joinSelf,
}: {
  match: MatchView;
  joinSelf: () => void;
}) {
  const [now, setNow] = React.useState(() => Date.now());
  React.useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(t);
  }, []);

  const secondsLeft = match.stagingDeadline
    ? Math.min(
        STAGING_WINDOW_SECONDS,
        Math.max(0, Math.ceil((new Date(match.stagingDeadline).getTime() - now) / 1000)),
      )
    : STAGING_WINDOW_SECONDS;
  const mm = Math.floor(secondsLeft / 60);
  const ss = secondsLeft % 60;
  const timeLabel = `${mm}:${ss.toString().padStart(2, "0")}`;

  const joined = match.counts.discordJoined;
  const total = match.counts.total;
  const youJoined = match.roster.find((r) => r.isYou)?.discordJoined ?? false;
  const channelsReady = Boolean(match.discordTeam1ChannelId);

  return (
    <div className="flex flex-col items-center gap-5 py-2">
      <div className="flex items-center gap-2 text-lg font-semibold text-zinc-100">
        <DiscordIcon joined className="size-6" />
        Join Discord
      </div>
      <p className="-mt-3 text-center text-xs text-zinc-500">
        {channelsReady
          ? "Team voice channels are live — join the lobby and you'll be moved automatically."
          : "Creating team voice channels…"}
      </p>

      <div className="mx-auto aspect-square w-full max-w-[260px]">
        <MatchLobbyConcentricRings
          outerProgress={total > 0 ? joined / total : 0}
          timerProgress={secondsLeft / STAGING_WINDOW_SECONDS}
          outerStrokeColor={DISCORD_BLURPLE}
          ariaLabel={`${joined} of ${total} players in Discord. ${timeLabel} remaining.`}
        >
          <div className="flex flex-col items-center leading-tight">
            <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">
              In voice
            </span>
            <span className="text-3xl font-bold tabular-nums text-zinc-100">
              {joined}/{total}
            </span>
            <span className="mt-1 text-xs tabular-nums text-zinc-500">{timeLabel}</span>
          </div>
        </MatchLobbyConcentricRings>
      </div>

      <Button
        type="button"
        disabled={youJoined}
        className="w-full max-w-xs gap-2 bg-[#7289DA] text-white hover:bg-[#5b6eae] disabled:opacity-60"
        onClick={joinSelf}
      >
        <DiscordIcon joined className="size-5 text-white" />
        {youJoined ? "You're in voice" : "Join Discord lobby"}
      </Button>
    </div>
  );
}

function CenteredNotice({
  spinner,
  title,
  subtitle,
}: {
  spinner?: boolean;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="flex flex-col items-center gap-3 py-10 text-center">
      {spinner ? (
        <Loader2 className="size-6 animate-spin text-zinc-500" />
      ) : (
        <Check className="size-6 text-emerald-400" />
      )}
      <p className="text-base font-semibold text-zinc-100">{title}</p>
      {subtitle ? <p className="text-sm text-zinc-500">{subtitle}</p> : null}
    </div>
  );
}

function PhaseCenter({
  match,
  joinSelf,
}: {
  match: MatchView;
  joinSelf: () => void;
}) {
  switch (match.status) {
    case "accepted":
      return <CenteredNotice spinner title="Setting up the match…" subtitle="Allocating teams and spinning up Discord." />;
    case "staging":
      return <DiscordPhase match={match} joinSelf={joinSelf} />;
    case "configuring":
      return <CenteredNotice title="Everyone's in voice" subtitle="Map veto is the next phase (coming next)." />;
    case "awaiting_connect":
      return <CenteredNotice title="Map locked in" subtitle="Connect to the server (coming next)." />;
    case "live":
      return <CenteredNotice title="Match is live" />;
    case "completed":
      return <CenteredNotice title="Match complete" />;
    case "cancelled":
      return <CenteredNotice title="Match cancelled" subtitle={match.cancelReason ?? undefined} />;
    default:
      return <CenteredNotice spinner title="Loading…" />;
  }
}

export function MatchRoom({ matchId }: { matchId: string }) {
  const { match, isLoading, joinSelf } = useMatchRoom(matchId);

  if (isLoading || !match) {
    return (
      <div className="flex items-center justify-center py-20 text-zinc-500">
        <Loader2 className="size-6 animate-spin" />
      </div>
    );
  }

  const serverPhase = match.status === "awaiting_connect" || match.status === "live";
  const team1 = match.roster.filter((r) => r.team === 1);
  const team2 = match.roster.filter((r) => r.team === 2);
  const team1Name = match.team1Name ?? "Team A";
  const team2Name = match.team2Name ?? "Team B";

  return (
    <div className="space-y-4 text-zinc-100">
      <p className="text-center text-[11px] font-medium uppercase tracking-[0.2em] text-zinc-500">
        Match #{match.seq} · {match.league}
      </p>

      <div className="grid min-h-[480px] grid-cols-1 gap-8 lg:grid-cols-3 lg:items-start lg:gap-12">
        <TeamColumn name={team1Name} players={team1} side="north" serverPhase={serverPhase} />

        <div className="flex min-h-0 min-w-0 w-full flex-col rounded-xl bg-zinc-950/40 p-4">
          <PhaseCenter match={match} joinSelf={joinSelf} />
        </div>

        <TeamColumn name={team2Name} players={team2} side="south" serverPhase={serverPhase} />
      </div>
    </div>
  );
}
