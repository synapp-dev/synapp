import { useLeetifyProfile, usePlayerStore } from "@/hooks/players";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Form } from "@workspace/ui/components/form";
import { cn } from "@workspace/ui/lib/utils";
import Marquee from "react-fast-marquee";
import Image from "next/image";
import { BicepsFlexed } from "lucide-react";

// Function to map Leetify map names to image files
const getMapImage = (mapName: string): string => {
  const mapNameLower = mapName.toLowerCase();

  // Map Leetify map names to image files
  const mapImageMap: Record<string, string> = {
    de_mirage: "/images/steam/maps/De_mirage.png",
    de_dust2: "/images/steam/maps/De_dust2.png",
    de_inferno: "/images/steam/maps/De_inferno.png",
    de_overpass: "/images/steam/maps/De_overpass.png",
    de_nuke: "/images/steam/maps/De_nuke.png",
    de_ancient: "/images/steam/maps/De_ancient.png",
    de_anubis: "/images/steam/maps/De_anubis.png",
    de_vertigo: "/images/steam/maps/De_vertigo.png",
    de_train: "/images/steam/maps/De_train.png",
    de_grail: "/images/steam/maps/De_grail.png",
    de_jura: "/images/steam/maps/De_jura.png",
    de_dogtown: "/images/steam/maps/De_dogtown.png",
    de_brewery: "/images/steam/maps/De_brewery.png",
    cs_office: "/images/steam/maps/Cs_office.png",
    cs_italy: "/images/steam/maps/Cs_italy.png",
    cs_agency: "/images/steam/maps/Cs_agency.png",
    ar_shoots: "/images/steam/maps/Ar_shoots.png",
    ar_pool_day: "/images/steam/maps/Ar_pool_day.png",
    ar_baggage: "/images/steam/maps/Ar_baggage.png",
  };

  return mapImageMap[mapNameLower] || "/images/steam/maps/De_mirage.png"; // Default fallback
};

export function FormCard() {
  const { selectedPlayer } = usePlayerStore();
  const steamId64 = selectedPlayer?.steamId64;
  const {
    profile: leetifyProfile,
    isLoading: leetifyLoading,
    error: leetifyError,
  } = useLeetifyProfile(steamId64 || "");

  // Get the last 10 games from the Leetify profile
  const lastGames = leetifyProfile?.games?.slice(0, 10) || [];

  return (
    <Card className="h-full gap-0">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <BicepsFlexed className="w-3 h-3 text-muted-foreground" />
            <h1 className="text-xs font-bold text-muted-foreground">Form</h1>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-1 items-center justify-center h-full">
        {leetifyLoading ? (
          <div className="flex items-center justify-center">
            <p className="text-xs text-muted-foreground">Loading...</p>
          </div>
        ) : leetifyError ? (
          <div className="flex items-center justify-center">
            <p className="text-xs text-muted-foreground">Error loading data</p>
          </div>
        ) : lastGames.length === 0 ? (
          <div className="flex items-center justify-center">
            <p className="text-xs text-muted-foreground">No recent games</p>
          </div>
        ) : (
          <div className="w-full h-full flex items-center">
            <Marquee
              speed={30}
              pauseOnHover={true}
              gradient={true}
              gradientColor="hsl(var(--background))"
              gradientWidth={50}
              className="py-2 overflow-y-hidden"
            >
              {lastGames.map((game, index) => {
                const isWin = game.matchResult === "win";
                const isLoss = game.matchResult === "loss";
                const isDraw = game.matchResult === "draw";

                return (
                  <div
                    key={game.gameId || index}
                    className={cn(
                      "flex items-center justify-center gap-1.5 border rounded-full px-3 py-1 mx-1",
                      isWin && "bg-green-700/25 border-green-500/25",
                      isLoss && "bg-red-700/25 border-red-500/25",
                      isDraw && "bg-yellow-600/25 border-yellow-500/25",
                      !isWin && !isLoss && !isDraw && "bg-muted border-border"
                    )}
                  >
                    <p
                      className={cn(
                        "text-xs font-bold",
                        isWin && "text-green-100",
                        isLoss && "text-red-100",
                        isDraw && "text-yellow-100",
                        !isWin && !isLoss && !isDraw && "text-foreground"
                      )}
                    >
                      {isWin ? "W" : isLoss ? "L" : isDraw ? "D" : "?"}
                    </p>
                    <div className="w-4 h-4 relative">
                      <Image
                        src={getMapImage(game.mapName || "")}
                        alt={game.mapName || "Unknown map"}
                        width={16}
                        height={16}
                        className="rounded-sm"
                      />
                    </div>
                    <p
                      className={cn(
                        "text-xs font-bold",
                        isWin && "text-green-100",
                        isLoss && "text-red-100",
                        isDraw && "text-yellow-100",
                        !isWin && !isLoss && !isDraw && "text-foreground"
                      )}
                    >
                      {game.scores
                        ? `${game.scores[0]}-${game.scores[1]}`
                        : "??-??"}
                    </p>
                  </div>
                );
              })}
            </Marquee>
          </div>
        )}
        {/* <p className="text-xs text-muted-foreground">Form</p> */}
      </CardContent>
    </Card>
  );
}
