import {
  Card,
  CardTitle,
  CardHeader,
  CardContent,
} from "@workspace/ui/components/card";
import {
  CheckCircle,
  Loader2,
  Shield,
  AlertTriangle,
  MessageCircle,
  ThumbsUp,
  TriangleAlert,
  View,
} from "lucide-react";
import {
  useCSStatsProfile,
  useFaceitProfile,
  useLeetifyProfile,
  usePlayerStore,
  useSteamProfile,
} from "@/stores/players/player-store";
import { useBotStore } from "@/stores/bot-store";
import { useEffect, useState, useMemo } from "react";
import { Button } from "@workspace/ui/components/button";
import {
  calculateLegitimacyScore,
  getProgressColor,
  getLegitimacyStatus,
  type LegitimacyScore,
} from "@/utils/legitimacy-score";
import Image from "next/image";
import CountUp from "react-countup";
import { cn } from "@workspace/ui/lib/utils";

export function BotPreviewCard() {
  const { selectedPlayer } = usePlayerStore();
  const { messages, addMessage, updateServiceStatus, reset } = useBotStore();
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

  const [activeMessage, setActiveMessage] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState<string>("idle");

  // Calculate legitimacy score
  const legitimacyScore = useMemo((): LegitimacyScore => {
    return calculateLegitimacyScore(
      steamProfile || null,
      leetifyProfile || null,
      faceitProfile || null,
      csstatsProfile || null
    );
  }, [steamProfile, leetifyProfile, faceitProfile, csstatsProfile]);

  // Reset bot state when player changes
  useEffect(() => {
    if (steamId64) {
      reset();
      setCurrentStep("idle");
      addMessage(
        "🤖 Hello! I'm your CS2 stats assistant. Let me analyze player legitimacy...",
        "info"
      );
    }
  }, [steamId64, reset, addMessage]);

  // Sequential flow: Steam -> Leetify -> Faceit -> CSStats
  useEffect(() => {
    if (!steamId64) return;

    // Step 1: Steam
    if (currentStep === "idle" && steamLoading) {
      setCurrentStep("steam-loading");
      addMessage("Analyzing Steam account...", "loading");
    }

    if (currentStep === "steam-loading" && (steamProfile || steamError)) {
      setCurrentStep("steam-complete");
      if (steamProfile) {
        addMessage("Steam analysis complete!", "success");
        updateServiceStatus("steam", "success", steamProfile);
      } else {
        addMessage("Steam analysis failed", "error");
        updateServiceStatus(
          "steam",
          "error",
          undefined,
          steamError || undefined
        );
      }
    }

    // Step 2: Leetify (after Steam completes)
    if (currentStep === "steam-complete" && leetifyLoading) {
      setCurrentStep("leetify-loading");
      addMessage("Analyzing Leetify performance...", "loading");
    }

    if (currentStep === "leetify-loading" && (leetifyProfile || leetifyError)) {
      setCurrentStep("leetify-complete");
      if (leetifyProfile) {
        addMessage("Leetify analysis complete!", "success");
        updateServiceStatus("leetify", "success", leetifyProfile);
      } else {
        addMessage("Leetify analysis failed", "error");
        updateServiceStatus(
          "leetify",
          "error",
          undefined,
          leetifyError || undefined
        );
      }
    }

    // Step 3: Faceit (after Leetify completes)
    if (currentStep === "leetify-complete" && faceitLoading) {
      setCurrentStep("faceit-loading");
      addMessage("Analyzing Faceit stats...", "loading");
    }

    if (currentStep === "faceit-loading" && (faceitProfile || faceitError)) {
      setCurrentStep("faceit-complete");
      if (faceitProfile) {
        addMessage("Faceit analysis complete!", "success");
        updateServiceStatus("faceit", "success", faceitProfile);
      } else {
        addMessage("Faceit analysis failed", "error");
        updateServiceStatus(
          "faceit",
          "error",
          undefined,
          faceitError || undefined
        );
      }
    }

    // Step 4: CSStats (after Faceit completes)
    if (currentStep === "faceit-complete" && csstatsLoading) {
      setCurrentStep("csstats-loading");
      addMessage("Analyzing CSStats data...", "loading");
    }

    if (currentStep === "csstats-loading" && (csstatsProfile || csstatsError)) {
      setCurrentStep("complete");
      if (csstatsProfile) {
        addMessage("CSStats analysis complete!", "success");
        updateServiceStatus("csstats", "success", csstatsProfile);
      } else {
        addMessage("CSStats analysis failed", "error");
        updateServiceStatus(
          "csstats",
          "error",
          undefined,
          csstatsError || undefined
        );
      }
    }
  }, [
    steamId64,
    currentStep,
    steamLoading,
    steamProfile,
    steamError,
    leetifyLoading,
    leetifyProfile,
    leetifyError,
    faceitLoading,
    faceitProfile,
    faceitError,
    csstatsLoading,
    csstatsProfile,
    csstatsError,
    addMessage,
    updateServiceStatus,
  ]);

  // Set active message to the latest message
  useEffect(() => {
    if (messages.length > 0) {
      const latestMessage = messages[messages.length - 1];
      if (latestMessage) {
        setActiveMessage(latestMessage.text);
      }
    }
  }, [messages]);

  const legitimacyStatus = getLegitimacyStatus(legitimacyScore.percentage);
  const getStatusIcon = (percentage: number) => {
    if (percentage >= 80) return Shield;
    if (percentage >= 60) return CheckCircle;
    return AlertTriangle;
  };
  const StatusIcon = getStatusIcon(legitimacyScore.percentage);

  // Check if all analyses are complete (either succeeded or failed)
  const isAnalysisComplete =
    !steamLoading &&
    !leetifyLoading &&
    !faceitLoading &&
    !csstatsLoading &&
    (steamProfile || steamError) &&
    (leetifyProfile || leetifyError) &&
    (faceitProfile || faceitError) &&
    (csstatsProfile || csstatsError);

  return (
    <Card className="h-full w-full min-h-38">
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1">
            <Image
              src="/images/logos/intradark-symbol-blue.svg"
              alt="Intradark Logo"
              width={20}
              height={20}
              className="h-3 w-3 animate-spin-slow"
            />
            <h1 className="text-sm font-bold text-blue-400">Veritas</h1>
          </div>
          <div className="flex items-center gap-2">
            {isAnalysisComplete ? (
              <div className="flex items-center gap-1">
                {/* <FileDigit className="w-3 h-3" /> */}
                <h3 className="text-xs text-muted-foreground">
                  Analysis completed!
                </h3>
              </div>
            ) : (
              <>
                {activeMessage && (
                  <>
                    {activeMessage.includes("✅") && (
                      <CheckCircle className="w-3 h-3 text-green-500" />
                    )}
                    {activeMessage.includes("❌") && (
                      <CheckCircle className="w-3 h-3 text-red-500" />
                    )}
                    {!activeMessage.includes("✅") &&
                      !activeMessage.includes("❌") &&
                      !activeMessage.includes("Hello") && (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      )}
                  </>
                )}
                <p
                  className="text-xs text-muted-foreground animate-slide-down-fade-in-slow"
                  key={activeMessage}
                >
                  {activeMessage}
                </p>
              </>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Legitimacy Score */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <StatusIcon className={`w-4 h-4 ${legitimacyStatus.color}`} />
              <span
                className={`text-sm font-semibold ${legitimacyStatus.color}`}
              >
                {legitimacyStatus.text}
              </span>
            </div>

            <p className={cn("text-2xl font-bold", legitimacyStatus.color)}>
              <CountUp end={legitimacyScore.totalScore} duration={2} />%
            </p>
          </div>
          <div className="w-full bg-muted rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all duration-500 ${getProgressColor(legitimacyScore.percentage)}`}
              style={{ width: `${legitimacyScore.percentage}%` }}
            />
          </div>
        </div>
        {isAnalysisComplete && (
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-1">
              <View className="w-5 h-5 text-muted-foreground" />
              <p className="text-lg font-bold">
                <CountUp end={247} duration={2} />
              </p>
            </div>

            <div>
              <Button
                size="sm"
                variant="ghost"
                className="text-green-200 gap-1"
              >
                <ThumbsUp />
                <p className="text-xs">12</p>
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="text-orange-300 gap-1"
              >
                <TriangleAlert />
                <p className="text-xs">149</p>
              </Button>
              <Button size="sm" variant="ghost" className="gap-1">
                <MessageCircle />
                <p className="text-xs">12</p>
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
