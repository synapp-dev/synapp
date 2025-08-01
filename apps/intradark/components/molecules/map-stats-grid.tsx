"use client";

import { Card, CardContent } from "@workspace/ui/components/card";
import Image from "next/image";
import { getMapImageName, getMapDisplayName } from "@/utils/map-utils";

export type MapStats = {
  mapName: string;
  kills: number;
  deaths: number;
  wins: number;
  total: number;
};

export type MapStatsGridProps = {
  mapStats: MapStats[];
  className?: string;
};

export function MapStatsGrid({ mapStats, className }: MapStatsGridProps) {
  if (mapStats.length === 0) return null;

  return (
    <div className={`grid grid-cols-3 gap-x-2 gap-y-1 ${className || ""}`}>
      {mapStats.map((stat) => {
        const kdRatio =
          stat.deaths > 0 ? (stat.kills / stat.deaths).toFixed(2) : "N/A";
        const winRate =
          stat.total > 0 ? Math.round((stat.wins / stat.total) * 100) : "N/A";
        const mapImageName = getMapImageName(stat.mapName);
        const displayName = getMapDisplayName(stat.mapName);

        // Debug logging
        console.log(
          `Map: ${stat.mapName}, Image: ${mapImageName}, Display: ${displayName}`
        );

        return (
          <Card
            key={stat.mapName}
            className="p-1.5 rounded-md bg-muted/40 border-muted"
          >
            <CardContent className="p-0">
              <div className="grid grid-cols-2 items-center">
                {/* Map Image */}
                <div className="flex items-center gap-1">
                  <div className="relative w-4 h-4">
                    <Image
                      src={`/images/steam/maps/${mapImageName}`}
                      alt={displayName}
                      width={16}
                      height={16}
                      className="object-cover w-4 h-4 rounded"
                      onError={(e) => {
                        // Log the error for debugging
                        console.error(
                          `Failed to load image: ${mapImageName} for map: ${stat.mapName}`
                        );
                        // Don't hide the image, let it show broken state for debugging
                      }}
                      onLoad={(e) => {
                        // Log successful image loads for debugging
                        console.log(
                          `Loaded image for ${displayName}: ${mapImageName}`
                        );
                      }}
                    />
                  </div>
                  <p className="text-[0.65rem] text-muted-foreground">
                    {displayName}
                  </p>
                </div>

                <p className="text-xs font-medium text-right">{kdRatio}</p>
                {/* <p className="text-xs font-medium text-right">{winRate}%</p> */}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
