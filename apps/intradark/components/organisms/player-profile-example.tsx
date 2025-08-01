"use client";

import { useState } from "react";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import {
  usePlayerByVanityUrl,
  usePlayerStore,
  useSteamProfile,
  useLeetifyProfile,
  useFaceitProfile,
  useCSStatsProfile,
} from "@/stores/players/player-store";

export function PlayerProfileExample() {
  const [vanityUrl, setVanityUrl] = useState("");
  const [searchUrl, setSearchUrl] = useState("");

  const { player, isLoading, error, refetch } = usePlayerByVanityUrl(searchUrl);
  const { players, clearPlayers } = usePlayerStore();

  const handleSearch = () => {
    setSearchUrl(vanityUrl);
  };

  const handleClearCache = () => {
    clearPlayers();
  };

  return (
    <div className="space-y-6 p-6">
      <Card>
        <CardHeader>
          <CardTitle>Player Profile Search</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Enter Steam vanity URL (e.g., 'gabelogannewell')"
              value={vanityUrl}
              onChange={(e) => setVanityUrl(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleSearch()}
            />
            <Button onClick={handleSearch} disabled={!vanityUrl}>
              Search
            </Button>
            <Button variant="outline" onClick={handleClearCache}>
              Clear Cache
            </Button>
          </div>

          {isLoading && (
            <div className="text-sm text-muted-foreground">
              Loading player data...
            </div>
          )}

          {error && <div className="text-sm text-red-500">Error: {error}</div>}

          {player && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">
                {player.steamProfile?.data.personaname || "Unknown Player"}
              </h3>

              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <div>
                  <h4 className="font-medium mb-2">Steam Profile</h4>
                  <div className="text-sm space-y-1">
                    <p>Steam ID: {player.steamId64}</p>
                    <p>Vanity URL: {player.vanityUrl}</p>
                    <p>
                      Level: {player.steamProfile?.data.player_level || "N/A"}
                    </p>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Leetify Stats</h4>
                  <div className="text-sm space-y-1">
                    <p>
                      Games Played:{" "}
                      {player.leetifyProfile?.recentGameRatings.gamesPlayed ||
                        "N/A"}
                    </p>
                    <p>
                      Aim Rating:{" "}
                      {player.leetifyProfile?.recentGameRatings.aim.toFixed(
                        1
                      ) || "N/A"}
                    </p>
                    <p>
                      Positioning:{" "}
                      {player.leetifyProfile?.recentGameRatings.positioning.toFixed(
                        1
                      ) || "N/A"}
                    </p>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Faceit Profile</h4>
                  <div className="text-sm space-y-1">
                    <p>
                      Nickname:{" "}
                      {player.faceitProfile?.payload.nickname || "N/A"}
                    </p>
                    <p>
                      CS2 ELO:{" "}
                      {player.faceitProfile?.payload.games.cs2?.faceit_elo ||
                        "N/A"}
                    </p>
                    <p>
                      Skill Level:{" "}
                      {player.faceitProfile?.payload.games.cs2
                        ?.skill_level_label || "N/A"}
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-2">Cache Info</h4>
                <div className="text-sm text-muted-foreground">
                  <p>Cached Players: {Object.keys(players).length}</p>
                  <p>
                    Last Updated:{" "}
                    {new Date(player.lastUpdated).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Example of using individual service hooks */}
      {player && (
        <Card>
          <CardHeader>
            <CardTitle>Individual Service Usage Example</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm space-y-2">
              <p>You can also use individual service hooks:</p>
              <code className="block bg-gray-100 p-2 rounded">
                {`const { profile, isLoading, error } = useSteamProfile("${player.steamId64}");`}
              </code>
              <code className="block bg-gray-100 p-2 rounded">
                {`const { profile, isLoading, error } = useLeetifyProfile("${player.steamId64}");`}
              </code>
              <code className="block bg-gray-100 p-2 rounded">
                {`const { profile, isLoading, error } = useFaceitProfile("${player.steamId64}");`}
              </code>
              <code className="block bg-gray-100 p-2 rounded">
                {`const { profile, isLoading, error } = useCSStatsProfile("${player.steamId64}");`}
              </code>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
