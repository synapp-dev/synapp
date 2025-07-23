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
  const rangeOptions = ["10", "30", "60", "90", "All"];

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

  const topOwnTeam = getTopEntries(ownTeamCounts, 5);
  const topEnemyTeam = getTopEntries(enemyTeamCounts, 5);

  return (
    <Card className="w-full h-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <h1 className="text-xs font-bold text-muted-foreground">Stats</h1>
          {/* Range Tabs on the opposite end */}
          <div className="flex items-center gap-1 ml-auto">
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
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            {/* Display total kills from first 30 games */}
            <div className="text-sm">
              Total Kills (last {selectedRange} games):{" "}
              <span className="font-semibold">
                {totalKills}
                {missingKills > 0 ? "*" : ""}
              </span>
            </div>
            <div className="text-xs text-muted-foreground">
              Missing kills:{" "}
              <span className="font-semibold">{missingKills}</span>
            </div>
            <div className="text-sm">
              Total Deaths (last {selectedRange} games):{" "}
              <span className="font-semibold">
                {totalDeaths}
                {missingDeaths > 0 ? "*" : ""}
              </span>
            </div>
            <div className="text-xs text-muted-foreground">
              Missing deaths:{" "}
              <span className="font-semibold">{missingDeaths}</span>
            </div>
            {/* Display K/D ratio from first 30 games */}
            <div className="text-sm">
              K/D Ratio (last {selectedRange} games):{" "}
              <span className="font-semibold">{killDeathRatio}</span>
            </div>
            {/* Display match result counts from first 30 games */}
            <div className="text-sm mt-2">
              Match Results (last {selectedRange} games):
            </div>
            <ul className="text-xs ml-2">
              {Object.entries(matchResultCounts).map(([result, count]) => (
                <li key={result}>
                  <span className="font-semibold">
                    {result.charAt(0).toUpperCase() + result.slice(1)}:
                  </span>{" "}
                  {count}
                </li>
              ))}
            </ul>
            {/* Display win percentage from first 30 games */}
            <div className="text-sm mt-2">
              Win % (last {selectedRange} games):{" "}
              <span className="font-semibold">{winPercentage}</span>
            </div>
            {/* Display map counts from first 30 games */}
            <div className="text-sm mt-2">
              Maps Played (last {selectedRange} games):
            </div>
            {/* <ul className="text-xs ml-2">
              {Object.entries(mapWinLossCounts).map(
                ([map, { win, loss, total }]) => (
                  <li key={map}>
                    <span className="font-semibold">
                      {map.charAt(0).toUpperCase() + map.slice(1)}:
                    </span>{" "}
                    {total} (W: {win}, L: {loss})
                  </li>
                )
              )}
            </ul> */}
            {/* Radar chart for maps played */}
            <MapRadialChart
              mapCounts={mapCounts}
              mapWinLossCounts={mapWinLossCounts}
            />
            {/* Display party size counts from first 30 games */}
            <div className="text-sm mt-2">
              Party Sizes (last {selectedRange} games):
            </div>
            <ul className="text-xs ml-2">
              {Object.entries(partySizeCounts).map(([size, count]) => (
                <li key={size}>
                  <span className="font-semibold">{size}:</span> {count}
                </li>
              ))}
            </ul>
            {/* Display top own team steam64Ids */}
            <div className="text-sm mt-2">
              Most Common Teammates (last {selectedRange} games):
            </div>
            <ul className="text-xs ml-2">
              {topOwnTeam.map(([id, count]) => (
                <li key={id}>
                  <span className="font-semibold">{id}:</span> {count}
                </li>
              ))}
            </ul>
            {/* Display top enemy team steam64Ids */}
            {/* <div className="text-sm mt-2">
              Most Common Opponents (last {selectedRange} games):
            </div>
            <ul className="text-xs ml-2">
              {topEnemyTeam.map(([id, count]) => (
                <li key={id}>
                  <span className="font-semibold">{id}:</span> {count}
                </li>
              ))}
            </ul> */}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
