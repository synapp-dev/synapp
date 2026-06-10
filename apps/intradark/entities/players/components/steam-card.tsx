"use client";

import type { ReactNode } from "react";
import Image from "next/image";
import { ArrowUpRight } from "lucide-react";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Separator } from "@workspace/ui/components/separator";

import {
  PremierCard,
  seasonTabLabel,
  type PremierRankRow,
} from "@/components/organisms/premier-card";
import {
  CoinShowcase,
  medalDefindexes,
} from "@/entities/players/components/coin-showcase";
import {
  useGetLeetifyProfile,
  useGetSteamProfile,
} from "@/entities/players/hooks/queries";
import type { GcBadges } from "@/entities/players/hooks/use-gc-badges";
import type { SeasonSummary } from "@/entities/players/lib/parse-leetify-seasons";
import { playerSourceCardClass } from "@/entities/players/components/player-source-card-class";

function mapSeasonsToRanks(seasons: SeasonSummary[]): PremierRankRow[] {
  return seasons
    .filter((season) => season.premier)
    .map((season) => ({
      seasonId: season.id,
      current: season.premier!.current ?? season.premier!.max,
      peak: season.premier!.max,
      totalWins: Math.round(season.matches * season.winRate),
    }));
}

function deriveSteamVanity(profileurl: string | null | undefined): string | null {
  if (!profileurl) return null;
  const match = profileurl.match(/steamcommunity\.com\/id\/([^/?#]+)/i);
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

function permanentSteamProfileUrl(steamid64: string): string {
  return `https://steamcommunity.com/profiles/${steamid64}`;
}

function SteamProfileLink({
  profileUrl,
  linkLabel,
  loading,
}: {
  profileUrl: string;
  linkLabel: string | null;
  loading: boolean;
}) {
  if (loading) {
    return (
      <span className="inline-block h-4 w-24 animate-pulse rounded bg-muted" />
    );
  }

  return (
    <a
      href={profileUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="flex max-w-[45%] items-center gap-0.5 truncate text-xs text-muted-foreground hover:underline"
    >
      <ArrowUpRight className="mt-0.5 h-3 w-3 shrink-0" />
      <span className="truncate">{linkLabel ?? "View on Steam"}</span>
    </a>
  );
}

function SteamCardShell({
  profileUrl,
  linkLabel,
  steamLoading,
  children,
}: {
  profileUrl: string;
  linkLabel: string | null;
  steamLoading: boolean;
  children: ReactNode;
}) {
  return (
    <Card
      className={playerSourceCardClass(
        "steam",
        "group/steam-card relative flex h-full w-full flex-col overflow-hidden",
      )}
    >
      <Image
        src="/images/logos/steam-logo-colored.svg"
        alt=""
        width={1600}
        height={1600}
        aria-hidden
        className="pointer-events-none absolute -right-24 -top-24 z-0 w-[1200px] max-w-none select-none opacity-5 grayscale"
      />
      <CardHeader className="z-10 pb-2">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Image
              src="/images/logos/steam-logo-colored.svg"
              alt="Steam"
              width={100}
              height={100}
              className="h-auto w-5"
            />
            <span className="text-xs font-bold text-muted-foreground">
              Steam
            </span>
          </div>
          <SteamProfileLink
            profileUrl={profileUrl}
            linkLabel={linkLabel}
            loading={steamLoading}
          />
        </CardTitle>
      </CardHeader>
      <CardContent className="z-10 flex flex-1 flex-col">{children}</CardContent>
    </Card>
  );
}

/** Steam card shell with coins/medals and Premier season history. */
export function SteamCard({
  steamid64,
  badges = null,
}: {
  steamid64: string;
  badges?: GcBadges | null;
}) {
  const { data, isLoading, isError } = useGetLeetifyProfile(steamid64);
  const { data: steamData, isLoading: steamLoading } =
    useGetSteamProfile(steamid64);
  const steam = steamData?.success ? steamData.data : null;
  const profileUrl = permanentSteamProfileUrl(steamid64);
  const vanity = deriveSteamVanity(steam?.profileurl);
  const linkLabel =
    vanity ?? steam?.personaname?.trim() ?? null;

  const seasons = [...(data?.seasonRanks?.seasons ?? [])];
  const ranks = mapSeasonsToRanks(seasons);
  const hasPremierData = ranks.length > 0;
  const coinDefindexes = medalDefindexes(badges?.medals);
  const hasCoins = coinDefindexes.length > 0;
  const latestSeasonId = ranks.at(-1)?.seasonId;
  const defaultTab = latestSeasonId
    ? seasonTabLabel(latestSeasonId)
    : "All";

  const showCard = isLoading || hasPremierData || hasCoins;
  if (!showCard) return null;

  const shellProps = {
    profileUrl,
    linkLabel,
    steamLoading,
  };

  if (isLoading) {
    return (
      <SteamCardShell {...shellProps}>
        {hasCoins ? (
          <CoinShowcase
            defindexes={coinDefindexes}
            paginated={5}
            className="w-full"
          />
        ) : null}
        {hasCoins ? <Separator className="my-4" /> : null}
        <PremierCard ranks={[]} loading />
      </SteamCardShell>
    );
  }

  if (isError && !hasCoins) return null;

  return (
    <SteamCardShell {...shellProps}>
      {hasCoins ? (
        <CoinShowcase
          defindexes={coinDefindexes}
          paginated={5}
          className="w-full"
        />
      ) : null}
      {hasCoins && hasPremierData ? <Separator className="my-4" /> : null}
      {hasPremierData ? (
        <PremierCard ranks={ranks} defaultTab={defaultTab} />
      ) : null}
    </SteamCardShell>
  );
}
