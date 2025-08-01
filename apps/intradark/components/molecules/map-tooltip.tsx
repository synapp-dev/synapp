"use client";

import Image from "next/image";
import { cn } from "@workspace/ui/lib/utils";
import { getMapImageName, getMapDisplayName } from "@/utils/map-utils";

export type MapTooltipData = {
  mapName: string;
  win?: number;
  loss?: number;
  kills?: number;
  deaths?: number;
  total?: number;
  wins?: number;
};

export type MapTooltipProps = {
  data: MapTooltipData;
  className?: string;
  showStats?: boolean; // Whether to show detailed stats (kills, deaths, etc.)
};

export function MapTooltip({
  data,
  className,
  showStats = false,
}: MapTooltipProps) {
  const mapImageName = getMapImageName(data.mapName);
  const displayName = getMapDisplayName(data.mapName);

  // Calculate derived stats
  const kdRatio =
    data.deaths && data.deaths > 0
      ? (data.kills! / data.deaths).toFixed(2)
      : data.kills
        ? data.kills.toString()
        : "N/A";

  const winRate =
    data.total && data.total > 0 && data.wins
      ? Math.round((data.wins / data.total) * 100)
      : "N/A";

  return (
    <div
      className={cn(
        "border-border/50 bg-background grid min-w-[8rem] items-start gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs shadow-xl",
        className
      )}
    >
      {/* Map name and badge */}
      <div className="flex items-center gap-1.5 pb-1 border-b border-border/20">
        <Image
          src={`/images/steam/maps/${mapImageName}`}
          alt={displayName}
          width={16}
          height={16}
          className="object-cover w-4 h-4"
          onError={(e) => {
            // Fallback to a placeholder if image doesn't exist
            const target = e.target as HTMLImageElement;
            target.style.display = "none";
          }}
        />
        <span className="font-medium text-foreground">{data.mapName}</span>
      </div>

      {/* Stats */}
      <div className="grid gap-1.5">
        {showStats ? (
          // Detailed stats view
          <>
            {data.kills !== undefined && (
              <div className="flex w-full flex-wrap items-center gap-2">
                <div className="h-2.5 w-2.5 shrink-0 rounded-[2px] bg-green-500 border border-green-500" />
                <div className="flex flex-1 justify-between leading-none items-center">
                  <span className="text-muted-foreground">Kills</span>
                  <span className="text-foreground font-mono font-medium tabular-nums">
                    {data.kills.toLocaleString()}
                  </span>
                </div>
              </div>
            )}
            {data.deaths !== undefined && (
              <div className="flex w-full flex-wrap items-center gap-2">
                <div className="h-2.5 w-2.5 shrink-0 rounded-[2px] bg-red-500 border border-red-500" />
                <div className="flex flex-1 justify-between leading-none items-center">
                  <span className="text-muted-foreground">Deaths</span>
                  <span className="text-foreground font-mono font-medium tabular-nums">
                    {data.deaths.toLocaleString()}
                  </span>
                </div>
              </div>
            )}
            <div className="flex w-full flex-wrap items-center gap-2">
              <div className="h-2.5 w-2.5 shrink-0 rounded-[2px] bg-blue-500 border border-blue-500" />
              <div className="flex flex-1 justify-between leading-none items-center">
                <span className="text-muted-foreground">K/D Ratio</span>
                <span className="text-foreground font-mono font-medium tabular-nums">
                  {kdRatio}
                </span>
              </div>
            </div>
            {data.total !== undefined && (
              <div className="flex w-full flex-wrap items-center gap-2">
                <div className="h-2.5 w-2.5 shrink-0 rounded-[2px] bg-purple-500 border border-purple-500" />
                <div className="flex flex-1 justify-between leading-none items-center">
                  <span className="text-muted-foreground">Win Rate</span>
                  <span className="text-foreground font-mono font-medium tabular-nums">
                    {winRate}%
                  </span>
                </div>
              </div>
            )}
          </>
        ) : (
          // Simple win/loss view (for chart)
          <>
            {data.win !== undefined && (
              <div className="flex w-full flex-wrap items-center gap-2">
                <div className="h-2.5 w-2.5 shrink-0 rounded-[2px] bg-green-500 border border-green-500" />
                <div className="flex flex-1 justify-between leading-none items-center">
                  <span className="text-muted-foreground">Wins</span>
                  <span className="text-foreground font-mono font-medium tabular-nums">
                    {data.win.toLocaleString()}
                  </span>
                </div>
              </div>
            )}
            {data.loss !== undefined && (
              <div className="flex w-full flex-wrap items-center gap-2">
                <div className="h-2.5 w-2.5 shrink-0 rounded-[2px] bg-red-500 border border-red-500" />
                <div className="flex flex-1 justify-between leading-none items-center">
                  <span className="text-muted-foreground">Losses</span>
                  <span className="text-foreground font-mono font-medium tabular-nums">
                    {data.loss.toLocaleString()}
                  </span>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
