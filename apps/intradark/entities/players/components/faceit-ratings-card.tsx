"use client";

import type { ReactNode } from "react";
import Image from "next/image";
import CountUp from "react-countup";
import { ArrowUpRight } from "lucide-react";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Separator } from "@workspace/ui/components/separator";
import { cn } from "@workspace/ui/lib/utils";

import { FaceitLevelBadge } from "@/components/atoms/faceit-level-badge";
import { useGetFaceitProfile } from "@/entities/players/hooks/queries";
import type { FaceitProfile } from "@/entities/players/lib/types";
import { CountryFlag } from "@/entities/players/components/country-flag";
import { playerSourceCardClass } from "@/entities/players/components/player-source-card-class";

type FaceitGame = NonNullable<
  FaceitProfile["payload"]["games"]["cs2"]
>;

function hasGameData(game: FaceitGame | undefined): game is FaceitGame {
  return !!game && (game.faceit_elo != null || game.skill_level != null);
}

function GameEloColumn({
  label,
  game,
}: {
  label: string;
  game: FaceitGame;
}) {
  const elo = game.faceit_elo ?? 0;
  const level = game.skill_level ?? 0;

  return (
    <div className="flex flex-col items-center justify-center gap-2 py-2">
      <FaceitLevelBadge level={level} size="sm" />
      <p className="text-2xl font-bold tabular-nums">
        <CountUp end={elo} duration={2} separator="," />
      </p>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      {game.skill_level_label ? (
        <p className="text-xs text-muted-foreground">{game.skill_level_label}</p>
      ) : null}
    </div>
  );
}

function DetailRow({
  label,
  value,
  loading,
}: {
  label: string;
  value: ReactNode;
  loading?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 text-sm">
      <span className="text-muted-foreground">{label}</span>
      {loading ? (
        <span className="inline-block h-4 w-20 animate-pulse rounded bg-muted" />
      ) : (
        <span className="font-medium">{value}</span>
      )}
    </div>
  );
}

/** FACEIT profile card: CS2/CSGO elo, level, region, and nickname from archived data. */
export function FaceitRatingsCard({ steamid64 }: { steamid64: string }) {
  const { data, isLoading, isError } = useGetFaceitProfile(steamid64);

  const cs2 = data?.payload?.games?.cs2;
  const csgo = data?.payload?.games?.csgo;
  const hasCs2 = hasGameData(cs2);
  const hasCsgo = hasGameData(csgo);
  const hasData =
    data?.result === "ok" && (hasCs2 || hasCsgo || !!data.payload.nickname);

  const nickname = data?.payload?.nickname;
  const country = data?.payload?.country?.toUpperCase() || null;
  const region = cs2?.region ?? csgo?.region ?? null;
  const gameCount = Number(hasCs2) + Number(hasCsgo);

  return (
    <Card
      className={playerSourceCardClass(
        "faceit",
        "group/faceit-card relative h-full w-full overflow-hidden",
      )}
    >
      <div className="absolute inset-0 z-0 bg-gradient-to-br from-orange-800/10 via-orange-800/5 to-transparent opacity-0 transition-opacity duration-200 ease-out group-hover/faceit-card:opacity-100" />
      <Image
        src="/images/logos/faceit-logo-colored.svg"
        alt=""
        width={1600}
        height={1600}
        aria-hidden
        className="pointer-events-none absolute -right-24 -top-24 z-0 w-[1200px] max-w-none select-none opacity-5 grayscale"
      />
      <CardHeader className="z-10">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Image
              src="/images/logos/faceit-logo-colored.svg"
              alt="FACEIT"
              width={100}
              height={100}
              className="h-auto w-5"
            />
            <span className="text-xs font-bold text-muted-foreground">
              FACEIT
            </span>
          </div>
          {nickname ? (
            <a
              href={`https://www.faceit.com/en/players/${encodeURIComponent(nickname)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex max-w-[45%] items-center gap-0.5 truncate text-xs text-muted-foreground hover:underline"
            >
              <ArrowUpRight className="mt-0.5 h-3 w-3 shrink-0" />
              <span className="truncate">{nickname}</span>
            </a>
          ) : isLoading ? (
            <span className="inline-block h-4 w-24 animate-pulse rounded bg-muted" />
          ) : null}
        </CardTitle>
      </CardHeader>
      <CardContent className="z-10">
        {isError && !isLoading && !hasData ? (
          <p className="text-sm text-muted-foreground">
            FACEIT data unavailable
          </p>
        ) : (
          <div className="space-y-6">
            <div
              className={cn(
                "grid gap-4",
                isLoading
                  ? "grid-cols-1"
                  : gameCount > 1
                    ? "grid-cols-2"
                    : "grid-cols-1",
              )}
            >
              {isLoading ? (
                <div className="flex flex-col items-center justify-center gap-2 py-2">
                  <span className="inline-block h-8 w-8 animate-pulse rounded-full bg-muted" />
                  <span className="inline-block h-8 w-20 animate-pulse rounded bg-muted" />
                  <span className="inline-block h-3 w-10 animate-pulse rounded bg-muted" />
                </div>
              ) : null}
              {!isLoading && hasCs2 ? (
                <GameEloColumn label="CS2" game={cs2} />
              ) : null}
              {!isLoading && hasCsgo ? (
                <GameEloColumn label="CSGO" game={csgo} />
              ) : null}
            </div>

            {!hasCs2 && !hasCsgo && !isLoading ? (
              <p className="text-center text-sm text-muted-foreground">
                No ranked FACEIT data found
              </p>
            ) : null}

            <Separator />

            <div className="space-y-3">
              <DetailRow
                label="Region"
                value={region ?? "—"}
                loading={isLoading}
              />
              <DetailRow
                label="Country"
                value={
                  country ? (
                    <span className="inline-flex items-center gap-1.5">
                      <CountryFlag code={country} />
                      {country}
                    </span>
                  ) : (
                    "—"
                  )
                }
                loading={isLoading}
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
