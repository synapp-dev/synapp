"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { PillarStat } from "@/components/dashboard/pillar-stat";
import { ScoreRing } from "@/components/dashboard/score-ring";
import { ScoreSparkline } from "@/components/dashboard/score-sparkline";
import { DOMAIN_CONFIG } from "@/components/molecules/task-row";
import { useScore } from "@/hooks/scoring/use-score";
import { TASK_DOMAINS, type TaskDomain } from "@/entities/tasks/model/types";

// Same pillar hues as the tasks board so the app reads as one system.
const PILLAR_BAR: Record<TaskDomain, string> = {
  identity: "bg-violet-500",
  health: "bg-emerald-500",
  work: "bg-blue-500",
  social: "bg-amber-500",
  finance: "bg-rose-500",
};

const STAGGER = 0.12;

function ScorecardSkeleton() {
  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <Skeleton className="h-5 w-28" />
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-col items-center gap-4">
          <Skeleton className="h-[156px] w-[156px] rounded-full" />
          <Skeleton className="h-24 w-full rounded-md" />
        </div>
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-6 w-10" />
              </div>
              <Skeleton className="h-2 w-full rounded-full" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * The hero of the dashboard: the overall ring and 30-day trend up top, then the
 * five life pillars as animated Leetify-style stat rows.
 */
export function PillarScorecard() {
  const { data, isLoading, error } = useScore();

  if (isLoading) return <ScorecardSkeleton />;

  if (error || !data) {
    return (
      <Card className="h-full">
        <CardContent className="p-5 text-sm text-muted-foreground">
          Couldn&apos;t load today&apos;s score.
        </CardContent>
      </Card>
    );
  }

  const { today, history } = data;
  const byPillar = new Map(today.pillars.map((pillar) => [pillar.pillar, pillar]));

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base">Life balance</CardTitle>
          <span className="text-xs tabular-nums text-muted-foreground">
            {today.score === null ? "Rest day" : `${today.score} / 100 today`}
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-col items-center gap-4">
          <ScoreRing score={today.score} />
          <div className="w-full min-w-0 overflow-hidden">
            <ScoreSparkline history={history} />
          </div>
        </div>

        {today.score === null ? (
          <p className="rounded-lg border border-dashed border-border/60 px-4 py-6 text-center text-sm text-muted-foreground">
            Nothing scheduled yet today. Your pillars light up once routines or
            due tasks land on the day.
          </p>
        ) : (
          <div className="space-y-4">
            {TASK_DOMAINS.map((domain, index) => {
              const pillar = byPillar.get(domain);
              const config = DOMAIN_CONFIG[domain];
              return (
                <PillarStat
                  key={domain}
                  pillar={domain}
                  label={config.label}
                  icon={config.icon}
                  score={pillar?.score ?? null}
                  completed={pillar?.completed ?? 0}
                  total={pillar?.total ?? 0}
                  colorClass={PILLAR_BAR[domain]}
                  delay={index * STAGGER}
                />
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
