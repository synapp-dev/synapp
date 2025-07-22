import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@workspace/ui/components/card";
import { Progress } from "@workspace/ui/components/progress";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { AlertCircle, ArrowUpRight, TrendingUp } from "lucide-react";
import { Alert, AlertDescription } from "@workspace/ui/components/alert";
import { Separator } from "@workspace/ui/components/separator";
import { Button } from "@workspace/ui/components/button";
import { useState, useRef } from "react";
import { AnimatedStat } from "./animated-stat";
import Image from "next/image";
import {
  useLeetifyProfile,
  usePlayerStore,
} from "@/stores/players/player-store";
import { cn } from "@workspace/ui/lib/utils";

type RatingType = "overall" | "ct" | "t";

export function LeetifyCard() {
  const { selectedPlayer } = usePlayerStore();
  const steamId64 = selectedPlayer?.steamId64;
  const {
    profile: leetifyProfile,
    isLoading: leetifyLoading,
    error: leetifyError,
  } = useLeetifyProfile(steamId64 || "");

  const [activeRating, setActiveRating] = useState<RatingType>("overall");
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleRatingChange = (rating: RatingType) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setActiveRating(rating);
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      setActiveRating("overall");
      timeoutRef.current = null;
    }, 1000);
  };

  // Always render the card, but use zero values if loading or no profile
  const isMissingSteamId = !steamId64;
  const isProfileReady = !!leetifyProfile && !leetifyLoading;

  // Helper to get stat or 0 if loading
  const safe = (getter: () => number) => (isProfileReady ? getter() : 0);
  const safeMeta = (getter: () => string | undefined | React.ReactNode) =>
    isProfileReady ? (getter() ?? "") : "";

  const getRatingValue = (type: RatingType) => {
    if (!isProfileReady) return 0;
    switch (type) {
      case "ct":
        return leetifyProfile.recentGameRatings.ctLeetify;
      case "t":
        return leetifyProfile.recentGameRatings.tLeetify;
      case "overall":
      default:
        return leetifyProfile.recentGameRatings.leetify;
    }
  };

  const getRatingLabel = (type: RatingType) => {
    switch (type) {
      case "ct":
        return "CT Leetify";
      case "t":
        return "T Leetify";
      case "overall":
      default:
        return "Leetify Rating";
    }
  };

  const getRatingColor = (type: RatingType) => {
    switch (type) {
      case "ct":
        return "text-cyan-500";
      case "t":
        return "text-emerald-500";
      case "overall":
      default:
        return "text-orange-500";
    }
  };

  const currentRating = getRatingValue(activeRating);
  const currentLabel = getRatingLabel(activeRating);
  const currentColor = getRatingColor(activeRating);

  return (
    <Card className="relative group/leetify-card">
      <div className="absolute opacity-0 inset-0 bg-gradient-to-br from-pink-800/10 via-pink-800/5 to-transparent z-0 group-hover/leetify-card:opacity-100 transition-opacity duration-200 ease-out" />
      <Image
        src="/images/logos/leetify-logo-colored.svg"
        alt="Leetify background"
        width={1600}
        height={1600}
        className="pointer-events-none select-none absolute -top-24 -right-24 grayscale opacity-5"
        style={{
          width: "1200px",
          height: "auto",
          zIndex: 0,
        }}
      />
      <Image
        src="/images/logos/leetify-logo-colored.svg"
        alt="Leetify background"
        width={1600}
        height={1600}
        className="pointer-events-none select-none absolute -bottom-24 -left-24 grayscale opacity-5"
        style={{
          width: "1200px",
          height: "auto",
          zIndex: 0,
        }}
      />
      <CardHeader className="z-10">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Image
              src="/images/logos/leetify-logo-colored.svg"
              alt="Leetify"
              width={100}
              height={100}
              className="w-5 h-auto"
            />
            Leetify
          </div>

          <div className="text-xs text-muted-foreground mb-0.5">
            <span className="">
              {safeMeta(() => (
                <div className="animate-slide-right-fade-in-slowest">
                  <a
                    href={
                      leetifyProfile?.meta?.vanityUrl
                        ? `https://leetify.com/@${leetifyProfile?.meta?.vanityUrl}`
                        : `https://leetify.com/public/profile/${steamId64}`
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(
                      "flex items-center gap-0.5",
                      leetifyProfile?.meta?.vanityUrl ? "text-sm" : "text-xs"
                    )}
                  >
                    <ArrowUpRight className="w-4 h-4" />
                    <span className="">
                      {leetifyProfile?.meta?.vanityUrl
                        ? `${leetifyProfile?.meta?.vanityUrl}`
                        : `${steamId64}`}
                    </span>
                  </a>
                </div>
              )) ||
                (leetifyLoading ? (
                  <div className="animate-slide-down-fade-in-slower">
                    <span className="text-muted-foreground text-xs animate-pulse">
                      Talking to Leetify admins..
                    </span>
                  </div>
                ) : (
                  ""
                ))}
            </span>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="z-10">
        {/* Show error or missing player alert at the top if needed */}
        {/* {isMissingSteamId && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {"No player selected or missing Steam ID."}
            </AlertDescription>
          </Alert>
        )} */}
        {leetifyError && !leetifyLoading && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {typeof leetifyError === "object" && "message" in leetifyError
                ? (leetifyError as { message?: string }).message ||
                  "Failed to load Leetify profile."
                : typeof leetifyError === "string"
                  ? leetifyError
                  : "Failed to load Leetify profile."}
            </AlertDescription>
          </Alert>
        )}
        <div className="space-y-6 relative">
          {/* Aim */}
          <AnimatedStat
            label="Aim"
            loadingLabel="Checking crosshair placement.."
            value={Math.ceil(leetifyProfile?.recentGameRatings?.aim ?? 0)}
            dataReady={isProfileReady}
            colorClass="text-blue-500"
            progressMax={10}
            decimals={0}
            delay={0}
          />

          {/* Utility */}
          <AnimatedStat
            label="Utility"
            loadingLabel="Counting effective flashes.."
            value={Math.ceil(leetifyProfile?.recentGameRatings?.utility ?? 0)}
            dataReady={isProfileReady}
            colorClass="text-purple-500"
            progressMax={10}
            decimals={0}
            delay={0.15}
          />

          {/* Positioning */}
          <AnimatedStat
            label="Positioning"
            loadingLabel="Inspecting trade frags.."
            value={Math.ceil(
              leetifyProfile?.recentGameRatings?.positioning ?? 0
            )}
            dataReady={isProfileReady}
            colorClass="text-green-500"
            progressMax={10}
            decimals={0}
            delay={0.3}
          />

          {/* Opening */}
          <AnimatedStat
            label="Opening"
            loadingLabel="Watching entry highlights.."
            value={(leetifyProfile?.recentGameRatings?.opening ?? 0) * 100}
            dataReady={isProfileReady}
            colorClass="text-yellow-500"
            progressMax={100}
            decimals={2}
            suffix=".00"
            progressTransform={(v) => ((v + 10) / 20) * 100}
            delay={0.45}
          />

          {/* Clutch */}
          <AnimatedStat
            label="Clutch"
            loadingLabel="Analyzing clutch moments.."
            value={(leetifyProfile?.recentGameRatings?.clutch ?? 0) * 100}
            dataReady={isProfileReady}
            colorClass="text-red-500"
            progressMax={100}
            decimals={2}
            suffix=".00"
            progressTransform={(v) => (v / 16) * 100}
            delay={0.6}
          />

          <Separator />

          {/* Rating Type Buttons */}
          <div className="flex justify-center items-center gap-4 mb-4">
            <Button
              variant={activeRating === "ct" ? "default" : "outline"}
              size="sm"
              onMouseEnter={() => handleRatingChange("ct")}
              onMouseLeave={handleMouseLeave}
              className="w-6 h-6 rounded-full p-0 text-xs flex items-center justify-center"
            >
              <Image
                src="/images/logos/ct-patch-small.webp"
                alt="CT Icon"
                width={100}
                height={100}
                className="w-full h-full object-contain"
              />
            </Button>
            <Button
              variant={activeRating === "overall" ? "default" : "outline"}
              size="sm"
              onMouseEnter={() => handleRatingChange("overall")}
              onMouseLeave={handleMouseLeave}
              className="w-10 h-10 rounded-full p-0 flex items-center justify-center relative overflow-hidden"
            >
              {/* CT half (top-left) */}
              <span
                className="absolute inset-0 w-full h-full"
                style={{ zIndex: 1 }}
              >
                <Image
                  src="/images/logos/ct-patch-small.webp"
                  alt="CT Icon"
                  width={100}
                  height={100}
                  className="w-full h-full object-contain"
                  style={{ clipPath: "polygon(0 0, 100% 0, 0 100%)" }}
                />
              </span>
              {/* T half (bottom-right) */}
              <span
                className="absolute inset-0 w-full h-full"
                style={{ zIndex: 2 }}
              >
                <Image
                  src="/images/logos/t-patch-small.webp"
                  alt="T Icon"
                  width={100}
                  height={100}
                  className="w-full h-full object-contain"
                  style={{ clipPath: "polygon(100% 0, 100% 100%, 0 100%)" }}
                />
              </span>
            </Button>
            <Button
              variant={activeRating === "t" ? "default" : "outline"}
              size="sm"
              onMouseEnter={() => handleRatingChange("t")}
              onMouseLeave={handleMouseLeave}
              className="w-6 h-6 rounded-full p-0 text-xs flex items-center justify-center"
            >
              <Image
                src="/images/logos/t-patch-small.webp"
                alt="T Icon"
                width={100}
                height={100}
                className="w-full h-full object-contain"
              />
            </Button>
          </div>

          {/* Dynamic Rating Display */}
          <AnimatedStat
            label={currentLabel}
            value={currentRating * 100}
            dataReady={isProfileReady}
            colorClass={currentColor}
            progressMax={100}
            decimals={2}
            progressTransform={(v) => ((v / 100 + 10) / 20) * 100}
            delay={0.75}
            suffix=".00"
          />
        </div>
      </CardContent>
    </Card>
  );
}
