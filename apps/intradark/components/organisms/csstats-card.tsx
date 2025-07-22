import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@workspace/ui/components/card";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@workspace/ui/components/avatar";
import { Badge } from "@workspace/ui/components/badge";
import { AlertCircle, Trophy } from "lucide-react";
import { Alert, AlertDescription } from "@workspace/ui/components/alert";
import {
  useCSStatsProfile,
  usePlayerStore,
} from "@/stores/players/player-store";

interface CSStatsProfile {
  success: boolean;
  data: {
    steamId: string;
    playerName: string;
    playerAvatar: string;
    ranks: Array<{
      season: number | null;
      current: number | null;
      peak: number | null;
      last_match: string | null;
      total_wins: number;
    }>;
    url: string;
  };
}

export function CSStatsCard() {
  const formatDate = (timestamp: string | null) => {
    if (!timestamp) return "---";
    try {
      const date = new Date(timestamp);
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "2-digit",
      });
    } catch {
      return "---";
    }
  };

  const { selectedPlayer } = usePlayerStore();
  const steamId64 = selectedPlayer?.steamId64;

  const {
    profile: csstatsProfile,
    isLoading: csstatsLoading,
    error: csstatsError,
  } = useCSStatsProfile(steamId64 || "");

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          CS2 Leaderboard
        </CardTitle>
      </CardHeader>
      <CardContent>
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
            {/* <div className="flex items-center gap-3">
              <Avatar className="w-12 h-12">
                <AvatarImage src={csstatsProfile.data.playerAvatar} />
                <AvatarFallback>
                  {csstatsProfile.data.playerName.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">{csstatsProfile.data.playerName}</p>
                <p className="text-sm text-muted-foreground">CSStats.gg</p>
              </div>
            </div> */}

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {csstatsProfile.data.ranks.map((rank, index) => (
                <div key={index} className="space-y-2 p-3 rounded-lg border">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">Premier</span>
                      {rank.season && (
                        <Badge variant="outline" className="text-xs">
                          S{rank.season}
                        </Badge>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(rank.last_match)}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div>
                      <div className="text-sm font-stratum font-bold">
                        {rank.current ? rank.current.toLocaleString() : "---"}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Current
                      </div>
                    </div>
                    <div>
                      <div className="text-sm font-stratum font-bold">
                        {rank.peak ? rank.peak.toLocaleString() : "---"}
                      </div>
                      <div className="text-xs text-muted-foreground">Peak</div>
                    </div>
                  </div>

                  <div className="text-center">
                    <span className="text-xs text-muted-foreground">
                      Wins:{" "}
                      {rank.total_wins ? rank.total_wins.toLocaleString() : "0"}
                    </span>
                  </div>
                </div>
              ))}
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
    </Card>
  );
}
