"use client";

import type { CurriculumStageRow } from "@/types/db";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { BarChart3, Loader2, Star } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { cn } from "@workspace/ui/lib/utils";
import { StaggeredAnimation } from "@workspace/ui/components/atoms/staggered-animation";
import {
  OverallRatingStars,
  OVERALL_RATING_STAR_SLOT_CLASS,
} from "@/components/atoms/overall-rating-stars";
import { useStages } from "@/entities/stages/model/store";
import { ratingsApi, type RatingsStageSummary } from "@/entities/ratings/api/endpoints";
import { usePageTitle } from "@/hooks/use-page-title";

type RatingsStageCardStage = CurriculumStageRow & {
  years?: Array<{
    id: string;
    code: string;
    displayName: string;
    sortIndex: number;
    level: { id: string; name: string; key: string };
  }>;
};

function formatAverageRating(value: number | null | undefined): string {
  if (value == null) return "N/A";
  const r = Math.round(value * 10) / 10;
  return Number.isInteger(r) ? `${r}/5` : `${r.toFixed(1)}/5`;
}

function reviewCountLabel(count: number, loading: boolean): string {
  if (loading) return "…";
  if (count === 1) return "1 review";
  return `${count} reviews`;
}

const STAR_SLOT_CLASS = "h-9 w-9 sm:h-10 sm:w-10";

function AverageRatingStars({
  average,
  isHovered,
  className,
}: {
  average: number | null | undefined;
  isHovered?: boolean;
  className?: string;
}) {
  const max = 5;
  const value =
    average == null ? 0 : Math.min(max, Math.max(0, average));

  return (
    <div
      className={cn("flex items-center gap-0.5", className)}
      aria-hidden
    >
      {Array.from({ length: max }, (_, i) => {
        const fill = Math.min(1, Math.max(0, value - i));
        return (
          <div
            key={i}
            className={cn("relative shrink-0", STAR_SLOT_CLASS)}
          >
            <Star
              className={cn(
                "pointer-events-none absolute left-0 top-0",
                STAR_SLOT_CLASS,
                "fill-transparent",
                isHovered ? "text-white/35" : "text-muted-foreground/50"
              )}
              strokeWidth={1.35}
            />
            <div
              className={cn(
                "absolute left-0 top-0 overflow-hidden",
                STAR_SLOT_CLASS
              )}
              style={{ width: `${fill * 100}%` }}
            >
              <Star
                className={cn(
                  "pointer-events-none absolute left-0 top-0",
                  STAR_SLOT_CLASS,
                  isHovered
                    ? "fill-amber-200 text-amber-100"
                    : "fill-amber-400 text-amber-500"
                )}
                strokeWidth={1.35}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function RatingsCourseAverageCard({
  index,
  totalReviewCount,
  averageRating,
  isLoadingSummaries,
}: {
  index: number;
  totalReviewCount: number;
  averageRating: number | null;
  isLoadingSummaries: boolean;
}) {
  return (
    <StaggeredAnimation index={index}>
      <Card
        className={cn(
          "relative gap-0 overflow-hidden border-0 bg-transparent pb-0 shadow-none"
        )}
      >
        <CardContent className="flex flex-row items-stretch gap-3 px-6 py-5 sm:gap-4 sm:px-6">
          <div className="relative w-40 shrink-0 self-stretch sm:w-48 md:w-52">
            <Image
              src="/images/bullyproof-logo.svg"
              alt="Bullyproof"
              fill
              className="object-contain object-left"
              sizes="(max-width: 640px) 160px, 208px"
            />
          </div>
          <div className="flex min-h-0 min-w-0 flex-col items-start justify-center gap-2 text-left sm:gap-3">
            <div className="flex flex-row flex-wrap items-baseline gap-x-2 gap-y-1 sm:gap-x-3">
              <CardTitle className="text-xl font-semibold leading-tight sm:text-2xl">
                Overall
              </CardTitle>
              {isLoadingSummaries ? (
                <Skeleton className="h-4 w-24 rounded-md sm:h-5 sm:w-28" />
              ) : (
                <span className="text-sm text-muted-foreground sm:text-base">
                  {reviewCountLabel(totalReviewCount, false)}
                </span>
              )}
            </div>
            <div className="flex flex-row flex-wrap items-center gap-2 sm:gap-3">
              {isLoadingSummaries ? (
                <>
                  <div className="flex items-center gap-1 sm:gap-1.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Skeleton
                        key={i}
                        className={cn(
                          "rounded-md",
                          OVERALL_RATING_STAR_SLOT_CLASS
                        )}
                      />
                    ))}
                  </div>
                  <Skeleton className="h-11 w-[6rem] rounded-md sm:h-12 sm:w-28" />
                </>
              ) : (
                <>
                  <OverallRatingStars average={averageRating} />
                  <p className="text-3xl font-bold tabular-nums tracking-tight text-foreground sm:text-4xl md:text-5xl">
                    {formatAverageRating(averageRating)}
                  </p>
                </>
              )}
            </div>
            {!isLoadingSummaries && totalReviewCount === 0 ? (
              <span className="max-w-xs text-xs leading-snug text-muted-foreground">
                No lesson ratings yet
              </span>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </StaggeredAnimation>
  );
}

function RatingsStageCard({
  stage,
  index,
  summary,
  isLoadingSummaries,
}: {
  stage: RatingsStageCardStage;
  index: number;
  summary: RatingsStageSummary | undefined;
  isLoadingSummaries: boolean;
}) {
  const [isCardHovered, setIsCardHovered] = useState(false);

  const ratingCount = summary?.ratingCount ?? 0;
  const href = `/admin/ratings/${stage.slug}`;

  return (
    <StaggeredAnimation index={index}>
      <Link href={href} className="block">
        <Card
          className={cn(
            "relative min-h-[11.5rem] overflow-hidden pb-0 transition-all duration-200 ease-out gap-0 sm:min-h-[12.5rem]",
            "cursor-pointer hover:shadow-md",
            isCardHovered &&
              "scale-[1.02] -translate-y-1 bg-[var(--brand-bullyproof-primary)]"
          )}
          onMouseEnter={() => setIsCardHovered(true)}
          onMouseLeave={() => setIsCardHovered(false)}
        >
          <CardHeader className="py-0 pb-3">
            <div className="space-y-0">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="flex items-center gap-2 text-xl">
                  <BarChart3
                    className={cn(
                      "h-5 w-5 flex-shrink-0 transition-all",
                      isCardHovered
                        ? "text-white animate-bounce-gentle"
                        : "text-primary"
                    )}
                  />
                  <span className={cn(isCardHovered && "text-white")}>
                    {stage.name}
                  </span>
                </CardTitle>
                <span
                  className={cn(
                    "text-xs whitespace-nowrap",
                    isCardHovered ? "text-white/80" : "text-muted-foreground"
                  )}
                >
                  {reviewCountLabel(ratingCount, isLoadingSummaries)}
                </span>
              </div>
              {stage.years && stage.years.length > 0 ? (
                <div
                  className={cn(
                    "flex items-center gap-x-2 text-xs",
                    isCardHovered ? "text-white/80" : "text-muted-foreground"
                  )}
                >
                  {stage.years
                    .flatMap((year, yIndex) => [
                      yIndex > 0 && (
                        <span key={`dot-${year.id}`} className="opacity-50">
                          •
                        </span>
                      ),
                      <span key={year.id}>{year.displayName}</span>,
                    ])
                    .filter(Boolean)}
                </div>
              ) : null}
            </div>
          </CardHeader>
          <CardContent className="flex min-h-[5.5rem] flex-row items-center justify-between gap-4 px-6 pb-6 pt-2 sm:min-h-[6.25rem]">
            {isLoadingSummaries ? (
              <div className="flex items-center gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton
                    key={i}
                    className={cn("rounded-md", STAR_SLOT_CLASS)}
                  />
                ))}
              </div>
            ) : (
              <AverageRatingStars
                average={summary?.averageRating}
                isHovered={isCardHovered}
              />
            )}
            <div className="flex min-w-0 flex-1 flex-col items-end justify-center gap-0.5 text-right">
              {isLoadingSummaries ? (
                <Skeleton className="h-10 w-[5.5rem] rounded-md sm:h-11" />
              ) : (
                <p
                  className={cn(
                    "text-3xl font-bold tabular-nums tracking-tight sm:text-4xl",
                    isCardHovered ? "text-white" : "text-foreground"
                  )}
                >
                  {formatAverageRating(summary?.averageRating)}
                </p>
              )}
              {!isLoadingSummaries &&
              !summary &&
              ratingCount === 0 ? (
                <span
                  className={cn(
                    "max-w-[12rem] text-xs leading-snug",
                    isCardHovered ? "text-white/75" : "text-muted-foreground"
                  )}
                >
                  No lesson ratings yet
                </span>
              ) : null}
            </div>
          </CardContent>
        </Card>
      </Link>
    </StaggeredAnimation>
  );
}

export function RatingsStagesSection() {
  usePageTitle(["admin", "ratings"]);

  const { stages, isLoading: isLoadingStages, error, refetch } = useStages();
  const [summaries, setSummaries] = useState<RatingsStageSummary[]>([]);
  const [isLoadingSummaries, setIsLoadingSummaries] = useState(true);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  useEffect(() => {
    refetch();
  }, [refetch]);

  useEffect(() => {
    let isMounted = true;

    async function fetchSummaries() {
      setIsLoadingSummaries(true);
      setSummaryError(null);
      const result = await ratingsApi.get.stageSummaries();
      if (!isMounted) return;

      if (result.error) {
        setSummaryError(result.error.message ?? "Failed to load ratings summary");
        setSummaries([]);
      } else {
        setSummaries(result.data);
      }
      setIsLoadingSummaries(false);
    }

    fetchSummaries();
    return () => {
      isMounted = false;
    };
  }, []);

  const summaryBySlug = useMemo(
    () => new Map(summaries.map((summary) => [summary.stageSlug, summary])),
    [summaries]
  );

  const courseAggregate = useMemo(() => {
    let weightedSum = 0;
    let countWithAverage = 0;
    let totalReviewCount = 0;
    for (const row of summaries) {
      totalReviewCount += row.ratingCount;
      const n = row.ratingCount;
      const avg = row.averageRating;
      if (n > 0 && avg != null) {
        weightedSum += avg * n;
        countWithAverage += n;
      }
    }
    return {
      totalReviewCount,
      averageRating:
        countWithAverage > 0 ? weightedSum / countWithAverage : null,
    };
  }, [summaries]);

  if (isLoadingStages && stages.length === 0) {
    return (
      <div className="flex min-h-[320px] items-center justify-center">
        <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-destructive">
            {error.message || "Failed to load curriculum stages"}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Ratings</h2>
        <p className="text-sm text-muted-foreground">
          Select a curriculum stage to review lesson ratings from teachers.
        </p>
        {summaryError ? (
          <p className="mt-2 text-xs text-muted-foreground">
            Ratings summary is temporarily unavailable, but stage navigation still works.
          </p>
        ) : null}
      </div>

      {stages.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">No curriculum stages found.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div className="min-w-0 md:col-span-2 lg:col-span-2">
              <RatingsCourseAverageCard
                index={0}
                totalReviewCount={courseAggregate.totalReviewCount}
                averageRating={courseAggregate.averageRating}
                isLoadingSummaries={isLoadingSummaries}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {stages.map((stage, index) => (
              <RatingsStageCard
                key={stage.id}
                stage={stage}
                index={index}
                summary={summaryBySlug.get(stage.slug)}
                isLoadingSummaries={isLoadingSummaries}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
