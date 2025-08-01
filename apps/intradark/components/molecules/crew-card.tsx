import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { ChevronsRight, Users } from "lucide-react";
import Image from "next/image";
import {
  useLeetifyProfile,
  usePlayerStore,
  useSteamProfile,
} from "@/stores/players/player-store";
import React from "react";
import { CrewMember } from "./crew-member";

export function CrewCard() {
  const { selectedPlayer } = usePlayerStore();
  const steamId64 = selectedPlayer?.steamId64;
  const { profile: leetifyProfile, isLoading: leetifyLoading } =
    useLeetifyProfile(steamId64 || "");
  const { profile: userSteamProfile, isLoading: userSteamLoading } =
    useSteamProfile(steamId64 || "");
  const userAvatar = userSteamProfile?.data?.avatarfull;

  // Calculate the 4 most played-with teammates from the 30 most recent games
  const mostPlayedWith: Array<{ steamId: string; gameCount: number }> =
    React.useMemo(() => {
      if (!leetifyProfile || !steamId64) return [];
      // Get the 30 most recent games starting from the top of the object
      const games = leetifyProfile.games.slice(0, 30);
      const teammateCounts: Record<string, number> = {};
      games.forEach((game) => {
        game.ownTeamSteam64Ids.forEach((teammateId) => {
          if (teammateId !== steamId64) {
            teammateCounts[teammateId] = (teammateCounts[teammateId] || 0) + 1;
          }
        });
      });
      // Sort by most frequent and return with game counts
      return Object.entries(teammateCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 4)
        .map(([steamId, gameCount]) => ({ steamId, gameCount }));
    }, [leetifyProfile, steamId64]);

  return (
    <Card className="h-full gap-3">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Users className="w-4 h-4 text-muted-foreground" />
            <h1 className="text-xs font-bold text-muted-foreground">Crew</h1>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex items-center justify-between">
        <div className="rounded-full bg-muted w-11 h-11 flex items-center justify-center overflow-hidden">
          {userSteamLoading ? (
            <span className="text-xs text-muted-foreground">...</span>
          ) : userAvatar ? (
            <Image
              src={userAvatar}
              alt={steamId64 || "user"}
              width={44}
              height={44}
              className="rounded-full w-11 h-11 object-cover"
            />
          ) : (
            <span className="text-xs text-muted-foreground">?</span>
          )}
        </div>

        <ChevronsRight className="w-4 h-4 text-muted-foreground" />
        <div className="flex items-center justify-between w-full gap-0 h-full max-w-2/3">
          {leetifyLoading ? (
            <span className="text-xs text-muted-foreground">Loading...</span>
          ) : mostPlayedWith.length === 0 ? (
            <span className="text-xs text-muted-foreground">No crew data</span>
          ) : (
            mostPlayedWith.map(({ steamId, gameCount }) => (
              <CrewMember
                key={steamId}
                steamid64={steamId}
                gameCount={gameCount}
              />
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
