import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@workspace/ui/components/card";

import {
  ChevronLeft,
  ChevronRight,
  ChevronsRight,
  ChevronsUp,
  Trophy,
} from "lucide-react";
import { useState } from "react";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@workspace/ui/components/alert";
import {
  useCSStatsProfile,
  usePlayerStore,
} from "@/stores/players/player-store";
import CountUp from "react-countup";
import { PremierEloBadge } from "../atoms/premier-elo-badge";
import Image from "next/image";
import { Button } from "@workspace/ui/components/button";

function getHighestPeak(ranks: { peak: number | null }[] = []): number {
  if (!ranks.length) return 0;
  return Math.max(...ranks.map((rank) => rank.peak ?? 0));
}

export function PremierCard() {
  const { selectedPlayer } = usePlayerStore();
  const steamId64 = selectedPlayer?.steamId64;

  const {
    profile: csstatsProfile,
    isLoading: csstatsLoading,
    error: csstatsError,
  } = useCSStatsProfile(steamId64 || "");

  const highestPeak = getHighestPeak(csstatsProfile?.data.ranks);

  // Add state for tab switcher
  const ranks = csstatsProfile?.data.ranks || [];
  // Tab switcher: S1, S2, S3, All (no label)
  const seasonTabs = ["S1", "S2", "S3", "All"];
  const [selectedTab, setSelectedTab] = useState("All");

  // Filtered data for content below
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
              className="w-30 h-auto"
            />
          </div>
          <div className="text-sm text-muted-foreground flex flex-col items-end gap-1">
            {/* S1, S2, S3, All buttons, no label */}
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
        {csstatsLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="flex items-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
              <span className="text-sm text-muted-foreground">Loading...</span>
            </div>
          </div>
        ) : csstatsError ? (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-xs">
              {csstatsError}
            </AlertDescription>
          </Alert>
        ) : csstatsProfile ? (
          <div className="space-y-4">
            <div className="grid gap-4 grid-cols-1">
              {displayedRanks.length === 0 ? (
                <div className="text-center py-1.5">
                  <p className="text-sm text-muted-foreground">
                    No data for this season
                  </p>
                </div>
              ) : // Custom content for each tab
              selectedTab === "All" ? (
                (() => {
                  // Find latest season (highest number, ignoring null)
                  const validRanks = ranks.filter(
                    (r) => typeof r.season === "number" && r.season !== null
                  );
                  const latest = validRanks.reduce(
                    (acc, r) => (r.season! > (acc?.season ?? 0) ? r : acc),
                    validRanks[0]
                  );
                  const totalWins = ranks.reduce(
                    (sum, r) => sum + (r.total_wins || 0),
                    0
                  );
                  const highestPeak = Math.max(
                    ...ranks.map((r) => r.peak ?? 0)
                  );
                  return (
                    <div className="flex items-center justify-between gap-2 w-full">
                      <div className="text-base font-semibold text-center min-w-[48px] flex items-center gap-1">
                        <Trophy className="w-3 h-3 text-muted-foreground" />
                        {totalWins}
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-3">
                          <ChevronsRight className="w-5 h-5 text-muted-foreground -skew-x-12" />

                          <PremierEloBadge
                            rank={latest?.current || 0}
                            size="normal"
                          />
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
                        <PremierEloBadge
                          rank={rank.current || 0}
                          size="normal"
                        />
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
        ) : (
          <div className="text-center py-8">
            <p className="text-sm text-muted-foreground">
              No CSStats.gg data found
            </p>
          </div>
        )}
      </CardContent>
    </div>
  );
}
