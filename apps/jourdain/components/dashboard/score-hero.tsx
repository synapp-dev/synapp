"use client";

import { Card, CardContent } from "@workspace/ui/components/card";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { PillarChips } from "@/components/dashboard/pillar-chips";
import { ScoreRing } from "@/components/dashboard/score-ring";
import { ScoreSparkline } from "@/components/dashboard/score-sparkline";
import { useScore } from "@/hooks/scoring/use-score";

function HeroSkeleton() {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-6 p-5 lg:flex-row lg:items-center">
        <Skeleton className="h-[156px] w-[156px] shrink-0 rounded-full" />
        <div className="w-full min-w-0 flex-1 space-y-4">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
            {Array.from({ length: 5 }).map((_, index) => (
              <Skeleton key={index} className="h-14 w-full rounded-lg" />
            ))}
          </div>
          <Skeleton className="h-24 w-full rounded-md" />
        </div>
      </CardContent>
    </Card>
  );
}

/** Hero row: score ring, five pillar chips and the 30-day trend. */
export function ScoreHero() {
  const { data, isLoading, error } = useScore();

  if (isLoading) return <HeroSkeleton />;

  if (error || !data) {
    return (
      <Card>
        <CardContent className="p-5 text-sm text-muted-foreground">
          Couldn&apos;t load today&apos;s score.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-6 p-5 lg:flex-row lg:items-center">
        <ScoreRing score={data.today.score} />
        <div className="w-full min-w-0 flex-1 space-y-4">
          <PillarChips pillars={data.today.pillars} />
          <ScoreSparkline history={data.history} />
          {data.today.score === null ? (
            <p className="text-xs text-muted-foreground">
              Nothing scheduled today. The score kicks in once routines or due
              tasks land on the day.
            </p>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
