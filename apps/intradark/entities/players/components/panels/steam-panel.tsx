"use client";

import { Gamepad2 } from "lucide-react";

import { useGetSteamProfile } from "@/entities/players/hooks/queries";
import { PanelCard, Stat } from "@/entities/players/components/panel-card";

function formatDate(unixSeconds?: number): string {
  if (!unixSeconds) return "—";
  return new Date(unixSeconds * 1000).toLocaleDateString();
}

export function SteamPanel({ steamid64 }: { steamid64: string }) {
  const { data, isLoading, isError } = useGetSteamProfile(steamid64);
  const profile = data?.success ? data.data : null;

  return (
    <PanelCard
      title="Steam"
      icon={<Gamepad2 className="size-4 text-muted-foreground" aria-hidden />}
      loading={isLoading}
      unavailable={isError || !profile ? "Steam data unavailable" : null}
    >
      {profile ? (
        <div>
          <Stat label="Persona" value={profile.personaname || "—"} />
          {profile.realname ? (
            <Stat label="Name" value={profile.realname} />
          ) : null}
          <Stat label="Created" value={formatDate(profile.timecreated)} />
          {profile.profileurl ? (
            <a
              href={profile.profileurl}
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-block text-xs font-medium text-primary underline-offset-4 hover:underline"
            >
              Open Steam profile
            </a>
          ) : null}
        </div>
      ) : null}
    </PanelCard>
  );
}
