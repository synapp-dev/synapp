import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@workspace/ui/components/card";
import { Shield, CheckCircle, AlertTriangle, FileDigit } from "lucide-react";
import {
  useCSStatsProfile,
  useFaceitProfile,
  useLeetifyProfile,
  usePlayerStore,
  useSteamProfile,
} from "@/stores/players/player-store";
import { useMemo } from "react";
import {
  calculateLegitimacyScore,
  getProgressColor,
  getLegitimacyStatus,
  type LegitimacyScore,
} from "@/utils/legitimacy-score";

export function TrustScoreCard() {
  const { selectedPlayer } = usePlayerStore();
  const steamId64 = selectedPlayer?.steamId64;

  const {
    profile: steamProfile,
    isLoading: steamLoading,
    error: steamError,
  } = useSteamProfile(steamId64 || "");
  const {
    profile: leetifyProfile,
    isLoading: leetifyLoading,
    error: leetifyError,
  } = useLeetifyProfile(steamId64 || "");
  const {
    profile: csstatsProfile,
    isLoading: csstatsLoading,
    error: csstatsError,
  } = useCSStatsProfile(steamId64 || "");
  const {
    profile: faceitProfile,
    isLoading: faceitLoading,
    error: faceitError,
  } = useFaceitProfile(steamId64 || "");

  // Calculate legitimacy score
  const legitimacyScore = useMemo((): LegitimacyScore => {
    return calculateLegitimacyScore(
      steamProfile || null,
      leetifyProfile || null,
      faceitProfile || null,
      csstatsProfile || null
    );
  }, [steamProfile, leetifyProfile, faceitProfile, csstatsProfile]);

  const legitimacyStatus = getLegitimacyStatus(legitimacyScore.percentage);
  const getStatusIcon = (percentage: number) => {
    if (percentage >= 80) return Shield;
    if (percentage >= 60) return CheckCircle;
    return AlertTriangle;
  };
  const StatusIcon = getStatusIcon(legitimacyScore.percentage);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1">
            <FileDigit className="w-4 h-4" />
            <h1 className="text-sm font-bold">Veritas</h1>
          </div>
          <div className="flex items-center gap-1">
            <StatusIcon className={`w-4 h-4 ${legitimacyStatus.color}`} />
            <span className={`text-sm font-semibold ${legitimacyStatus.color}`}>
              {legitimacyStatus.text}
            </span>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Legitimacy Score */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">
              {legitimacyScore.totalScore} points
            </span>
          </div>
          <div className="w-full bg-muted rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all duration-500 ${getProgressColor(legitimacyScore.percentage)}`}
              style={{ width: `${legitimacyScore.percentage}%` }}
            />
          </div>
        </div>

        {/* Score Breakdown */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium">Score Breakdown</h4>
          <div className="space-y-3 text-sm">
            {Object.entries(legitimacyScore.breakdown).map(
              ([platform, data]) => (
                <div key={platform} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="capitalize font-medium">{platform}</span>
                    <span className="text-muted-foreground">
                      {data.score}/{data.maxScore}
                    </span>
                  </div>
                  {data.checks.length > 0 && (
                    <div className="pl-2 space-y-1">
                      {data.checks.map((check, index) => (
                        <div
                          key={index}
                          className="text-xs text-muted-foreground"
                        >
                          {check}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
