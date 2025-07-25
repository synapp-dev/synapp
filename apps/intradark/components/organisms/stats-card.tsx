import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import {
  useLeetifyProfile,
  usePlayerStore,
} from "@/stores/players/player-store";
import { useEffect } from "react";
import { Button } from "@workspace/ui/components/button";
import { useState } from "react";
import { MapRadialChart } from "../molecules/map-radial-chart";
import { Separator } from "@workspace/ui/components/separator";
import { SkipBack } from "lucide-react";
import { cn } from "@workspace/ui/lib/utils";

export function StatsCard() {
  const { selectedPlayer } = usePlayerStore();
  const steamId64 = selectedPlayer?.steamId64;
  const {
    profile: leetifyProfile,
    isLoading: leetifyLoading,
    error: leetifyError,
  } = useLeetifyProfile(steamId64 || "");

  useEffect(() => {
    if (leetifyProfile) {
      console.log(leetifyProfile.games);
    }
  }, [leetifyProfile]);

  const [selectedRange, setSelectedRange] = useState("30");
  const rangeOptions = ["10", "30", "60"];

  // Determine how many games to use based on selected tab
  const gamesToUse = leetifyProfile?.games
    ? selectedRange === "All"
      ? leetifyProfile.games
      : leetifyProfile.games.slice(0, Number(selectedRange))
    : [];

  // Calculate total kills, deaths, and missing values from selected games
  let totalKills = 0;
  let totalDeaths = 0;
  let missingKills = 0;
  let missingDeaths = 0;
  gamesToUse.forEach((game) => {
    if (typeof game.kills === "number") {
      totalKills += game.kills;
    } else {
      missingKills++;
    }
    if (typeof game.deaths === "number") {
      totalDeaths += game.deaths;
    } else {
      missingDeaths++;
    }
  });

  // Calculate kill to death ratio for selected games
  const killDeathRatio =
    totalDeaths > 0 ? (totalKills / totalDeaths).toFixed(2) : "N/A";

  // Tally up matchResult values from selected games (case-insensitive)
  const matchResultCounts = gamesToUse.reduce(
    (acc, game) => {
      const result = (game.matchResult || "Unknown").toLowerCase();
      acc[result] = (acc[result] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  // Calculate win percentage from selected games (case-insensitive)
  const totalGames = gamesToUse.length;
  const winCount = matchResultCounts["win"] || 0;
  const winPercentage =
    totalGames > 0 ? ((winCount / totalGames) * 100).toFixed(1) : "N/A";

  // Tally up mapName values from selected games
  const mapCounts = gamesToUse.reduce(
    (acc, game) => {
      const map = (game.mapName || "Unknown").toLowerCase();
      acc[map] = (acc[map] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  // Tally up wins and losses per map
  const mapWinLossCounts = gamesToUse.reduce(
    (acc, game) => {
      const map = (game.mapName || "Unknown").toLowerCase();
      const result = (game.matchResult || "Unknown").toLowerCase();
      if (!acc[map]) acc[map] = { win: 0, loss: 0, total: 0 };
      if (result === "win") acc[map].win += 1;
      else if (result === "loss") acc[map].loss += 1;
      acc[map].total += 1;
      return acc;
    },
    {} as Record<string, { win: number; loss: number; total: number }>
  );

  // Tally up partySize values from selected games
  const partySizeCounts = gamesToUse.reduce(
    (acc, game) => {
      const size = game.partySize ?? "Unknown";
      acc[size] = (acc[size] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  // Tally up commonly occurring steam64Ids on own team and enemy team (excluding selected player)
  const ownTeamCounts = steamId64
    ? gamesToUse.reduce(
        (acc, game) => {
          (game.ownTeamSteam64Ids || []).forEach((id) => {
            if (id !== steamId64) acc[id] = (acc[id] || 0) + 1;
          });
          return acc;
        },
        {} as Record<string, number>
      )
    : {};

  const enemyTeamCounts = steamId64
    ? gamesToUse.reduce(
        (acc, game) => {
          (game.enemyTeamSteam64Ids || []).forEach((id) => {
            if (id !== steamId64) acc[id] = (acc[id] || 0) + 1;
          });
          return acc;
        },
        {} as Record<string, number>
      )
    : {};

  // Helper to get top N entries
  function getTopEntries(obj: Record<string, number>, n: number) {
    return Object.entries(obj)
      .sort((a, b) => b[1] - a[1])
      .slice(0, n);
  }

  const topOwnTeam = getTopEntries(ownTeamCounts, 4);
  const topEnemyTeam = getTopEntries(enemyTeamCounts, 4);

  return (
    <Card className="w-full h-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div>
            <h1 className="text-xs font-bold text-muted-foreground">Stats</h1>
          </div>

          {/* Range Tabs on the opposite end */}
          <div className="flex items-center gap-1 ml-auto">
            <SkipBack className="w-3 h-3 text-muted-foreground" />
            {/* <p className="text-xs text-muted-foreground">Recent</p> */}
            <div className="" />
            {rangeOptions.map((option) => (
              <Button
                key={option}
                type="button"
                onClick={() => setSelectedRange(option)}
                variant={selectedRange === option ? "default" : "ghost"}
                size="sm"
                className="text-xs px-2 py-0.5 h-fit"
              >
                {option}
              </Button>
            ))}
          </div>
        </CardTitle>

        <CardDescription></CardDescription>
      </CardHeader>
      <CardContent>
        {/* <div>
          <div className="flex items-center justify-center gap-1">
            {gamesToUse.slice(0, 5).map((game, idx) => {
              const result = (game.matchResult || "").toLowerCase();
              return (
                <span
                  key={idx}
                  className={cn(
                    result === "win"
                      ? "text-green-300"
                      : result === "loss"
                        ? "text-red-300"
                        : "text-gray-400",
                    "text-2xl font-bold"
                  )}
                >
                  {result === "win" ? "W" : result === "loss" ? "L" : "D"}
                </span>
              );
            })}
          </div>
        </div> */}
        {/* <Separator className="my-4" /> */}
        <div className="grid grid-cols-2 gap-4 border-spacing-x-2 border-muted">
          <div className="flex flex-col items-center gap-4">
            {/* KD Ratio */}
            <div className="text-sm flex flex-col items-center gap-0.5">
              <h2 className="font-bold text-3xl">{killDeathRatio}</h2>
              <p className="text-xs text-muted-foreground">K/D Ratio</p>
            </div>
          </div>
          <div className="flex flex-col items-center gap-4">
            <div className="text-sm flex flex-col items-center gap-0.5">
              <h2 className="font-bold text-3xl">{winPercentage}%</h2>
              <p className="text-xs text-muted-foreground">Win Rate</p>
            </div>
            {/* <div>{winCount} W</div> */}
          </div>
        </div>

        <Separator className="my-8" />
        <MapRadialChart
          mapCounts={mapCounts}
          mapWinLossCounts={mapWinLossCounts}
        />
        {/* <Separator className="my-4" /> */}
      </CardContent>
    </Card>
  );
}
