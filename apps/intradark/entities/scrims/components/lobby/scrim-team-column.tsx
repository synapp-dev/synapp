"use client";

/* eslint-disable @next/next/no-img-element -- remote CDN team art */
import type { TeamRosterMember } from "@/entities/teams/types";

import type { ScrimTeamRef } from "../../types";
import { FALLBACK_TEAM_AVATAR } from "../../lib/helpers";
import { ScrimPlayerCard } from "./scrim-player-card";

const SLOTS = 5;

export function ScrimTeamColumn({
  team,
  roster,
}: {
  team: ScrimTeamRef;
  roster: TeamRosterMember[];
}) {
  return (
    <div className="flex flex-1 flex-col gap-4">
      <div className="flex items-center justify-center gap-2">
        <img
          src={team.avatar || FALLBACK_TEAM_AVATAR}
          alt=""
          className="size-7 rounded-full object-cover"
        />
        <h2 className="text-xl font-black">{team.name}</h2>
      </div>
      <div className="flex flex-col gap-2">
        {Array.from({ length: SLOTS }).map((_, i) => (
          <ScrimPlayerCard key={i} player={roster[i] ?? null} />
        ))}
      </div>
    </div>
  );
}
