"use client";

import { Swords } from "lucide-react";

import { useGetFaceitProfile } from "@/entities/players/hooks/queries";
import { PanelCard, Stat } from "@/entities/players/components/panel-card";

export function FaceitPanel({ steamid64 }: { steamid64: string }) {
  const { data, isLoading, isError } = useGetFaceitProfile(steamid64);
  const cs2 = data?.payload?.games?.cs2 ?? data?.payload?.games?.csgo;
  const hasData = data?.result === "ok" && !!cs2;

  return (
    <PanelCard
      title="Faceit"
      icon={<Swords className="size-4 text-muted-foreground" aria-hidden />}
      loading={isLoading}
      unavailable={isError || !hasData ? "Faceit data unavailable" : null}
    >
      {hasData && cs2 ? (
        <div>
          <Stat label="Nickname" value={data?.payload?.nickname || "—"} />
          <Stat label="Elo" value={cs2.faceit_elo ?? "—"} />
          <Stat
            label="Level"
            value={cs2.skill_level ?? cs2.skill_level_label ?? "—"}
          />
          <Stat label="Region" value={cs2.region ?? "—"} />
        </div>
      ) : null}
    </PanelCard>
  );
}
