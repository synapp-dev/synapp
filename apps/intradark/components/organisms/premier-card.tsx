import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@workspace/ui/components/card";

import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@workspace/ui/components/alert";
import {
  useCSStatsProfile,
  usePlayerStore,
} from "@/stores/players/player-store";
import CountUp from "react-countup";
import { PremierEloBadge } from "../atoms/premier-elo-badge";
import Image from "next/image";

export function PremierCard() {
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
            <div className="grid gap-4 grid-cols-1">
              {csstatsProfile.data.ranks.map((rank, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between gap-2"
                >
                  <div className="text-sm text-muted-foreground">
                    Season {rank.season}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {/* {formatDate(rank.last_match)} */}
                  </div>
                  <PremierEloBadge rank={rank.current || 0} />
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
