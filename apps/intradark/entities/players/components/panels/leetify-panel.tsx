"use client";

import { Crosshair } from "lucide-react";

import { useGetLeetifyProfile } from "@/entities/players/hooks/queries";
import { PanelCard, Stat } from "@/entities/players/components/panel-card";

function num(n: number | null | undefined, digits = 2): string {
  return typeof n === "number" && !Number.isNaN(n) ? n.toFixed(digits) : "—";
}

function pct(n: number | null | undefined): string {
  return typeof n === "number" && !Number.isNaN(n) ? `${n.toFixed(2)}%` : "—";
}

function ms(n: number | null | undefined): string {
  return typeof n === "number" && !Number.isNaN(n) ? `${Math.round(n)} ms` : "—";
}

export function LeetifyPanel({ steamid64 }: { steamid64: string }) {
  const { data, isLoading, isError } = useGetLeetifyProfile(steamid64);
  const hasData =
    !!data &&
    (data.rating != null ||
      data.aim != null ||
      data.matches != null);

  return (
    <PanelCard
      title="Leetify"
      icon={<Crosshair className="size-4 text-muted-foreground" aria-hidden />}
      loading={isLoading}
      unavailable={isError || !hasData ? "Leetify data unavailable" : null}
    >
      {hasData && data ? (
        <div>
          <Stat label="Leetify Rating" value={num(data.rating)} />
          <Stat label="CT Leetify" value={pct(data.ctLeetify)} />
          <Stat label="T Leetify" value={pct(data.tLeetify)} />
          <Stat label="Aim" value={num(data.aim)} />
          <Stat label="Positioning" value={num(data.positioning)} />
          <Stat label="Utility" value={num(data.utility)} />
          <Stat label="Reaction Time" value={ms(data.reactionTimeMs)} />
          <Stat label="Win Rate" value={pct(data.winrate)} />
          {data.matches != null ? (
            <Stat label="Matches" value={data.matches} />
          ) : null}
          {data.premier != null ? (
            <Stat label="Premier" value={data.premier} />
          ) : null}
          {data.faceitElo != null ? (
            <Stat label="Faceit Elo" value={data.faceitElo} />
          ) : null}
        </div>
      ) : null}
    </PanelCard>
  );
}
