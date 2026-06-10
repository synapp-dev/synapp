"use client";

import { useState } from "react";
import Image from "next/image";
import { ChevronsRight, ChevronsUp, Trophy } from "lucide-react";

import {
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";

import { PremierEloBadge } from "@/components/atoms/premier-elo-badge";

export interface PremierRankRow {
  /** Stable season id, e.g. `beta`, `s1`, `s4`. */
  seasonId: string;
  current: number;
  peak: number;
  totalWins: number;
}

export function seasonTabLabel(seasonId: string): string {
  if (seasonId === "beta") return "Beta";
  const match = /^s(\d+)$/.exec(seasonId);
  return match ? `S${match[1]}` : seasonId;
}

function seasonOrder(seasonId: string): number {
  if (seasonId === "beta") return 0;
  const match = /^s(\d+)$/.exec(seasonId);
  return match ? Number(match[1]) : -1;
}

function RankRow({ rank }: { rank: PremierRankRow }) {
  return (
    <div className="flex w-full items-center justify-between gap-2">
      <div className="flex min-w-[48px] items-center gap-1 text-center text-base font-semibold">
        <Trophy className="h-3 w-3 text-muted-foreground" />
        {rank.totalWins}
      </div>

      <div className="flex items-center gap-2">
        <div className="flex items-center gap-3">
          <ChevronsRight className="-skew-x-12 h-5 w-5 text-muted-foreground" />
          <PremierEloBadge rank={rank.current} size="normal" />
        </div>

        <div className="flex items-center gap-3">
          <ChevronsUp className="-skew-x-12 h-5 w-5 text-muted-foreground" />
          <PremierEloBadge rank={rank.peak} size="normal" />
        </div>
      </div>
    </div>
  );
}

function AllSeasonsSummary({ ranks }: { ranks: PremierRankRow[] }) {
  const latest = ranks.reduce((acc, rank) =>
    seasonOrder(rank.seasonId) > seasonOrder(acc.seasonId) ? rank : acc,
  );
  const totalWins = ranks.reduce((sum, rank) => sum + rank.totalWins, 0);
  const highestPeak = Math.max(...ranks.map((rank) => rank.peak));

  return (
    <div className="flex w-full items-center justify-between gap-2">
      <div className="flex min-w-[48px] items-center gap-1 text-center text-base font-semibold">
        <Trophy className="h-3 w-3 text-muted-foreground" />
        {totalWins}
      </div>

      <div className="flex items-center gap-2">
        <div className="flex items-center gap-3">
          <ChevronsRight className="-skew-x-12 h-5 w-5 text-muted-foreground" />
          <PremierEloBadge rank={latest.current} size="normal" />
        </div>

        <div className="flex items-center gap-3">
          <ChevronsUp className="-skew-x-12 h-5 w-5 text-muted-foreground" />
          <PremierEloBadge rank={highestPeak} size="normal" />
        </div>
      </div>
    </div>
  );
}

export function PremierCard({
  ranks,
  defaultTab = "All",
  loading = false,
}: {
  ranks: PremierRankRow[];
  defaultTab?: string;
  loading?: boolean;
}) {
  const seasonTabs = [...ranks.map((rank) => seasonTabLabel(rank.seasonId)), "All"];
  const [selectedTab, setSelectedTab] = useState(defaultTab);

  const displayedRanks =
    selectedTab === "All"
      ? ranks
      : ranks.filter((rank) => seasonTabLabel(rank.seasonId) === selectedTab);

  return (
    <div className="m-0 flex w-full flex-col gap-4 p-0">
      <CardHeader className="m-0 p-0">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Image
              src="/images/logos/premier-logo-colored.svg"
              alt="Premier"
              width={100}
              height={100}
              className="h-auto w-24"
            />
          </div>
          <div className="flex flex-col items-end gap-1 text-sm text-muted-foreground">
            {loading ? (
              <span className="inline-block h-7 w-40 animate-pulse rounded bg-muted" />
            ) : (
              <div className="flex items-center gap-1">
                {seasonTabs.map((tab) => (
                  <Button
                    key={tab}
                    type="button"
                    onClick={() => setSelectedTab(tab)}
                    variant={selectedTab === tab ? "default" : "ghost"}
                    size="sm"
                    className="h-fit px-2 py-0.5 text-xs"
                  >
                    {tab}
                  </Button>
                ))}
              </div>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="m-0 p-0">
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            {loading ? (
              <div className="space-y-3 py-1.5">
                <span className="inline-block h-8 w-full animate-pulse rounded bg-muted/40" />
                <span className="inline-block h-8 w-3/4 animate-pulse rounded bg-muted/30" />
              </div>
            ) : displayedRanks.length === 0 ? (
              <div className="py-1.5 text-center">
                <p className="text-sm text-muted-foreground">
                  No data for this season
                </p>
              </div>
            ) : selectedTab === "All" ? (
              <AllSeasonsSummary ranks={ranks} />
            ) : (
              displayedRanks.map((rank) => (
                <RankRow key={rank.seasonId} rank={rank} />
              ))
            )}
          </div>
        </div>
      </CardContent>
    </div>
  );
}
