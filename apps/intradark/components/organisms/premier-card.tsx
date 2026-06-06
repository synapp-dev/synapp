import { CardHeader, CardTitle, CardContent } from "@workspace/ui/components/card";

import { ChevronsRight, ChevronsUp, Trophy } from "lucide-react";
import { useState } from "react";
import type { CSStatsProfile } from "@/entities/players";
import { PremierEloBadge } from "../atoms/premier-elo-badge";
import Image from "next/image";
import { Button } from "@workspace/ui/components/button";

const MOCK_CSSTATS_PROFILE: CSStatsProfile = {
  success: true,
  data: {
    steamId: "76561198000000000",
    playerName: "Demo Player",
    playerAvatar: "",
    url: "https://csstats.gg",
    ranks: [
      {
        season: 1,
        current: 12000,
        peak: 15500,
        last_match: null,
        total_wins: 42,
      },
      {
        season: 2,
        current: 18500,
        peak: 22100,
        last_match: null,
        total_wins: 51,
      },
      {
        season: 3,
        current: 21200,
        peak: 24800,
        last_match: null,
        total_wins: 36,
      },
    ],
  },
};

export function PremierCard() {
  const csstatsProfile = MOCK_CSSTATS_PROFILE;

  const ranks = csstatsProfile.data.ranks;
  const seasonTabs = ["S1", "S2", "S3", "All"];
  const [selectedTab, setSelectedTab] = useState("All");

  let displayedRanks = ranks;
  if (selectedTab !== "All") {
    const seasonNumber = Number(selectedTab.replace("S", ""));
    displayedRanks = ranks.filter((rank) => rank.season === seasonNumber);
  }

  return (
    <div className="w-full m-0 p-0 flex flex-col gap-4">
      <CardHeader className="m-0 p-0">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Image
              src="/images/logos/premier-logo-colored.svg"
              alt="Premier"
              width={100}
              height={100}
              className="w-24 h-auto"
            />
          </div>
          <div className="text-sm text-muted-foreground flex flex-col items-end gap-1">
            <div className="flex items-center gap-1">
              {seasonTabs.map((tab) => (
                <Button
                  key={tab}
                  type="button"
                  onClick={() => setSelectedTab(tab)}
                  variant={selectedTab === tab ? "default" : "ghost"}
                  size="sm"
                  className="text-xs px-2 py-0.5 h-fit"
                >
                  {tab}
                </Button>
              ))}
            </div>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="m-0 p-0">
        <div className="space-y-4">
          <div className="grid gap-4 grid-cols-1">
            {displayedRanks.length === 0 ? (
              <div className="text-center py-1.5">
                <p className="text-sm text-muted-foreground">No data for this season</p>
              </div>
            ) : selectedTab === "All" ? (
              (() => {
                const validRanks = ranks.filter(
                  (r) => typeof r.season === "number" && r.season !== null,
                );
                const latest = validRanks.reduce(
                  (acc, r) => (r.season! > (acc?.season ?? 0) ? r : acc),
                  validRanks[0],
                );
                const totalWins = ranks.reduce((sum, r) => sum + (r.total_wins || 0), 0);
                const highestPeak = Math.max(...ranks.map((r) => r.peak ?? 0));
                return (
                  <div className="flex items-center justify-between gap-2 w-full">
                    <div className="text-base font-semibold text-center min-w-[48px] flex items-center gap-1">
                      <Trophy className="w-3 h-3 text-muted-foreground" />
                      {totalWins}
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-3">
                        <ChevronsRight className="w-5 h-5 text-muted-foreground -skew-x-12" />

                        <PremierEloBadge rank={latest?.current || 0} size="normal" />
                      </div>

                      <div className="flex items-center gap-3">
                        <ChevronsUp className="w-5 h-5 text-muted-foreground -skew-x-12" />
                        <PremierEloBadge rank={highestPeak} size="normal" />
                      </div>
                    </div>
                  </div>
                );
              })()
            ) : (
              displayedRanks.map((rank, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between gap-2 w-full"
                >
                  <div className="text-base font-semibold text-center min-w-[48px] flex items-center gap-1">
                    <Trophy className="w-3 h-3 text-muted-foreground" />
                    {rank.total_wins ?? 0}
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-3">
                      <ChevronsRight className="w-5 h-5 text-muted-foreground -skew-x-12" />
                      <PremierEloBadge rank={rank.current || 0} size="normal" />
                    </div>

                    <div className="flex items-center gap-3">
                      <ChevronsUp className="w-5 h-5 text-muted-foreground -skew-x-12" />
                      <PremierEloBadge rank={rank.peak || 0} size="normal" />
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </CardContent>
    </div>
  );
}
