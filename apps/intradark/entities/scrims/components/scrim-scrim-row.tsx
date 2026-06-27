"use client";

/* eslint-disable @next/next/no-img-element -- remote CDN map/team art */
import { useRouter } from "next/navigation";
import { Swords, Timer } from "lucide-react";

import type { ScrimMap } from "../types";
import { FALLBACK_TEAM_AVATAR, mapById } from "../lib/helpers";
import type { ScrimItem } from "../lib/client";

export function ScrimScrimRow({
  scrim,
  maps,
}: {
  scrim: ScrimItem;
  maps: ScrimMap[];
}) {
  const router = useRouter();
  const map = mapById(maps, scrim.map_id);

  return (
    <button
      type="button"
      onClick={() => router.push(`/scrims/match/${scrim.id}`)}
      style={map?.screenshot ? { backgroundImage: `url(${map.screenshot})` } : undefined}
      className="group relative flex w-full flex-col gap-2 border-l-4 border-blue-600 bg-cover bg-center px-6 py-5 text-left transition-all animate-slide-left-fade-in hover:border-l-8 hover:pl-8"
    >
      <span className="absolute inset-0 bg-black/75 transition-colors group-hover:bg-black/70" />
      <div className="relative z-10 flex items-center gap-3">
        <div className="flex items-center gap-2">
          <img
            src={scrim.home_team?.avatar || FALLBACK_TEAM_AVATAR}
            alt=""
            className="size-6 rounded-full object-cover"
          />
          <span className="text-2xl font-black">{scrim.home_team?.name}</span>
        </div>
        <span className="text-sm">vs.</span>
        <div className="flex items-center gap-2">
          <img
            src={scrim.away_team?.avatar || FALLBACK_TEAM_AVATAR}
            alt=""
            className="size-6 rounded-full object-cover"
          />
          <span className="text-2xl font-black">{scrim.away_team?.name}</span>
        </div>
      </div>
      <div className="relative z-10 flex items-center gap-4 text-xs text-muted-foreground">
        {map ? (
          <span className="flex items-center gap-1">
            {map.badge ? (
              <img src={map.badge} alt="" className="h-4 w-auto object-contain" />
            ) : null}
            {map.name}
          </span>
        ) : null}
        <span className="flex items-center gap-1">
          <Swords className="size-3.5" /> Scrim
        </span>
        <span className="flex items-center gap-1">
          <Timer className="size-3.5" /> 30 rounds
        </span>
      </div>
    </button>
  );
}
