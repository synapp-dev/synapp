"use client";

import Image from "next/image";
import { useState } from "react";
import { ArrowUpRight } from "lucide-react";

import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";
import { Separator } from "@workspace/ui/components/separator";

import { useGetLeetifyProfile } from "@/entities/players/hooks/queries";
import { AnimatedStat } from "@/components/organisms/animated-stat";
import { playerSourceCardClass } from "@/entities/players/components/player-source-card-class";

type RatingType = "overall" | "ct" | "t";

/**
 * Leetify skill breakdown rendered as animated progress bars (Aim, Utility,
 * Positioning, Opening, Clutch) plus a CT/Overall/T rating switcher. Overall
 * uses the flat Leetify rating from the API, not CT+T sum.
 */
export function LeetifyRatingsCard({ steamid64 }: { steamid64: string }) {
  const { data, isLoading, isError } = useGetLeetifyProfile(steamid64);
  const isProfileReady = !!data && !isLoading;

  const [activeRating, setActiveRating] = useState<RatingType>("overall");

  const ct = data?.ctLeetify ?? 0;
  const t = data?.tLeetify ?? 0;
  const overall = data?.rating ?? 0;

  const ratingValue =
    activeRating === "ct" ? ct : activeRating === "t" ? t : overall;
  const ratingLabel =
    activeRating === "ct"
      ? "CT Leetify"
      : activeRating === "t"
        ? "T Leetify"
        : "Leetify Rating";
  const ratingColor =
    activeRating === "ct"
      ? "text-cyan-500"
      : activeRating === "t"
        ? "text-emerald-500"
        : "text-orange-500";

  const hasData =
    !!data && (data.aim != null || data.rating != null || data.utility != null);

  const leetifyName = data?.name?.trim() || null;

  return (
    <Card
      className={playerSourceCardClass(
        "leetify",
        "group/leetify-card relative h-full w-full overflow-hidden",
      )}
    >
      <Image
        src="/images/logos/leetify-logo-colored.svg"
        alt=""
        width={1600}
        height={1600}
        aria-hidden
        className="pointer-events-none absolute -right-24 -top-24 z-0 w-[1200px] max-w-none select-none opacity-5 grayscale"
      />
      <CardHeader className="z-10">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Image
              src="/images/logos/leetify-logo-colored.svg"
              alt="Leetify"
              width={100}
              height={100}
              className="h-auto w-5"
            />
            <span className="text-xs font-bold text-muted-foreground">
              Leetify ratings
            </span>
          </div>
          {leetifyName ? (
            <a
              href={`https://leetify.com/public/profile/${steamid64}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex max-w-[45%] items-center gap-0.5 truncate text-xs text-muted-foreground hover:underline"
            >
              <ArrowUpRight className="mt-0.5 h-3 w-3 shrink-0" />
              <span className="truncate">{leetifyName}</span>
            </a>
          ) : isLoading ? (
            <span className="inline-block h-4 w-24 animate-pulse rounded bg-muted" />
          ) : (
            <a
              href={`https://leetify.com/public/profile/${steamid64}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-0.5 text-xs text-muted-foreground hover:underline"
            >
              <ArrowUpRight className="mt-0.5 h-3 w-3" />
              <span>View on Leetify</span>
            </a>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="z-10">
        {isError && !isLoading && !hasData ? (
          <p className="text-sm text-muted-foreground">
            Leetify data unavailable
          </p>
        ) : (
          <div className="relative space-y-6">
            <AnimatedStat
              label="Aim"
              loadingLabel="Checking crosshair placement.."
              value={Math.round(data?.aim ?? 0)}
              dataReady={isProfileReady}
              colorClass="text-blue-500"
              progressMax={100}
              decimals={0}
              delay={0}
            />
            <AnimatedStat
              label="Utility"
              loadingLabel="Counting effective flashes.."
              value={Math.round(data?.utility ?? 0)}
              dataReady={isProfileReady}
              colorClass="text-purple-500"
              progressMax={100}
              decimals={0}
              delay={0.15}
            />
            <AnimatedStat
              label="Positioning"
              loadingLabel="Inspecting trade frags.."
              value={Math.round(data?.positioning ?? 0)}
              dataReady={isProfileReady}
              colorClass="text-green-500"
              progressMax={100}
              decimals={0}
              delay={0.3}
            />
            <AnimatedStat
              label="Opening"
              loadingLabel="Watching entry highlights.."
              value={data?.opening ?? 0}
              dataReady={isProfileReady}
              colorClass="text-yellow-500"
              progressMax={100}
              decimals={2}
              progressTransform={(v) => ((v + 10) / 20) * 100}
              delay={0.45}
              showPlusSign
            />
            <AnimatedStat
              label="Clutch"
              loadingLabel="Analyzing clutch moments.."
              value={data?.clutch ?? 0}
              dataReady={isProfileReady}
              colorClass="text-red-500"
              progressMax={100}
              decimals={2}
              progressTransform={(v) => (v / 16) * 100}
              delay={0.6}
              showPlusSign
            />

            <Separator />

            <div className="flex items-center justify-center gap-1">
              {(
                [
                  {
                    key: "ct",
                    label: "CT",
                    icon: "/images/logos/ct-patch-small.webp",
                  },
                  {
                    key: "overall",
                    label: "Overall",
                    icon: "/images/logos/leetify-logo-colored.svg",
                  },
                  {
                    key: "t",
                    label: "T",
                    icon: "/images/logos/t-patch-small.webp",
                  },
                ] as const
              ).map((tab) => (
                <Button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveRating(tab.key)}
                  variant={activeRating === tab.key ? "default" : "ghost"}
                  size="sm"
                  className="flex h-fit items-center gap-1 px-2 py-0.5 text-xs"
                >
                  <Image
                    src={tab.icon}
                    alt={tab.label}
                    width={18}
                    height={18}
                    className="h-4 w-4 object-contain"
                  />
                  <span>{tab.label}</span>
                </Button>
              ))}
            </div>

            <AnimatedStat
              label={ratingLabel}
              value={ratingValue}
              dataReady={isProfileReady}
              colorClass={ratingColor}
              progressMax={100}
              decimals={2}
              progressTransform={(v) => ((v + 8) / 16) * 100}
              delay={0.75}
              showPlusSign
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
