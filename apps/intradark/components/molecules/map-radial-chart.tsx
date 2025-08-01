"use client";

import { RadarChart, PolarGrid, PolarAngleAxis, Radar } from "recharts";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@workspace/ui/components/chart";
import { MapStatsGrid, type MapStats } from "./map-stats-grid";
import {
  useLeetifyProfile,
  usePlayerStore,
} from "@/stores/players/player-store";

export type MapRadialChartProps = {
  selectedRange?: string;
  className?: string;
};

export function MapRadialChart({
  selectedRange = "30",
  className,
}: MapRadialChartProps) {
  const { selectedPlayer } = usePlayerStore();
  const steamId64 = selectedPlayer?.steamId64;
  const {
    profile: leetifyProfile,
    isLoading: leetifyLoading,
    error: leetifyError,
  } = useLeetifyProfile(steamId64 || "");

  // Determine how many games to use based on selected range
  const gamesToUse = leetifyProfile?.games
    ? selectedRange === "All"
      ? leetifyProfile.games
      : leetifyProfile.games.slice(0, Number(selectedRange))
    : [];

  // Tally up wins and losses per map
  const mapWinLossCounts = gamesToUse.reduce(
    (acc, game) => {
      const map = game.mapName || "Unknown";
      const result = (game.matchResult || "Unknown").toLowerCase();
      if (!acc[map]) acc[map] = { win: 0, loss: 0, total: 0 };
      if (result === "win") acc[map].win += 1;
      else if (result === "loss") acc[map].loss += 1;
      acc[map].total += 1;
      return acc;
    },
    {} as Record<string, { win: number; loss: number; total: number }>
  );

  // Calculate map-specific stats (KD ratio and winrate per map)
  const mapStats = gamesToUse.reduce(
    (acc, game) => {
      const map = game.mapName || "Unknown";
      if (!acc[map]) {
        acc[map] = {
          mapName: map,
          kills: 0,
          deaths: 0,
          wins: 0,
          total: 0,
        };
      }

      // Add kills and deaths
      if (typeof game.kills === "number") {
        acc[map].kills += game.kills;
      }
      if (typeof game.deaths === "number") {
        acc[map].deaths += game.deaths;
      }

      // Add win/loss
      const result = (game.matchResult || "Unknown").toLowerCase();
      if (result === "win") {
        acc[map].wins += 1;
      }
      acc[map].total += 1;

      return acc;
    },
    {} as Record<
      string,
      {
        mapName: string;
        kills: number;
        deaths: number;
        wins: number;
        total: number;
      }
    >
  );

  // Convert to array and sort by total games played
  const mapStatsArray = Object.values(mapStats)
    .filter((stat) => stat.total > 0) // Only show maps with games played
    .sort((a, b) => b.total - a.total); // Sort by most played first

  // Create radar chart data using the same sorted order as the grid
  let data: { map: string; win: number; loss: number }[] = [];
  if (mapStatsArray.length > 0) {
    data = mapStatsArray.map((stat) => {
      const mapWinLoss = mapWinLossCounts[stat.mapName] || { win: 0, loss: 0 };
      return {
        map:
          stat.mapName.replace(/^de_/, "").charAt(0).toUpperCase() +
          stat.mapName.replace(/^de_/, "").slice(1),
        win: mapWinLoss.win,
        loss: mapWinLoss.loss,
      };
    });
  }

  if (data.length === 0) return null;

  // Determine which series (win or loss) has the higher max value, and render that last (on top)
  const maxWin = Math.max(...data.map((d) => d.win));
  const maxLoss = Math.max(...data.map((d) => d.loss));
  const renderOrder = maxWin >= maxLoss ? ["loss", "win"] : ["win", "loss"];

  // Chart config for design system colors and labels
  const chartConfig: ChartConfig = {
    win: {
      label: "Wins",
      color: "rgb(21 128 61)", // dark green (green-700)
    },
    loss: {
      label: "Losses",
      color: "rgb(185 28 28)", // dark red (red-700)
    },
  };

  return (
    <div
      className={`w-full h-full overflow-visible ${className ? className : ""}`}
    >
      <ChartContainer config={chartConfig} className="flex justify-center">
        <RadarChart data={data} outerRadius={70}>
          <ChartTooltip content={<ChartTooltipContent hideLabel />} />
          <PolarGrid />
          <PolarAngleAxis dataKey="map" />
          {renderOrder.map((key) => (
            <Radar
              key={key}
              name={chartConfig[key]?.label as string}
              dataKey={key}
              stroke={chartConfig[key]?.color as string}
              fill={chartConfig[key]?.color as string}
              fillOpacity={0.15}
              strokeWidth={1.5}
            />
          ))}
        </RadarChart>
      </ChartContainer>

      {/* Map Stats Grid */}
      {mapStatsArray.length > 0 && (
        <div className="mt-6">
          <MapStatsGrid mapStats={mapStatsArray} />
        </div>
      )}
    </div>
  );
}
