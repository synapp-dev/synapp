"use client";

import { useState } from "react";
import { motion, type Variants } from "framer-motion";
import { format, parseISO } from "date-fns";
import {
  CalendarOff,
  CalendarRange,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Flame,
  Scale,
  Trophy,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { cn } from "@workspace/ui/lib/utils";
import { PageHeader } from "@/components/page-header";
import { ScoreRing } from "@/components/dashboard/score-ring";
import { GoalsSnapshot } from "@/components/review/goals-snapshot";
import { MonthHeatStrip } from "@/components/review/month-heat-strip";
import { PillarWeekDeltas } from "@/components/review/pillar-week-deltas";
import { ReflectionCard } from "@/components/review/reflection-card";
import { WeekDayBars } from "@/components/review/week-day-bars";
import {
  useScore,
  useScoreRange,
  useScoreSummary,
} from "@/hooks/scoring/use-score";
import type { DayScore } from "@/lib/scoring/compute";
import {
  addWeeks,
  averageScore,
  currentStreak,
  pillarWeekTotals,
  weekEndOf,
  weekStartOf,
} from "@/lib/scoring/weeks";
import { addMonths, monthEndOf, monthStartOf } from "@/lib/scoring/months";

const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09 } },
};

const section: Variants = {
  hidden: { opacity: 0, y: 18 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] },
  },
};

type RangeTab = "week" | "month";

function weekLabel(weekStart: string): string {
  const start = parseISO(weekStart);
  const end = parseISO(weekEndOf(weekStart));
  const startFormat =
    start.getMonth() === end.getMonth() ? "d" : "d MMM";
  return `${format(start, startFormat)} - ${format(end, "d MMM yyyy")}`;
}

function StatTile({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="min-w-0 rounded-lg border border-border/60 bg-card px-3 py-2">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Icon className="h-3.5 w-3.5 shrink-0" />
        <span className="truncate">{label}</span>
      </div>
      <p className="mt-1 truncate text-sm font-semibold tabular-nums">{value}</p>
      {hint ? (
        <p className="truncate text-[11px] text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

function OverallStat() {
  const { data } = useScoreSummary();
  return (
    <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-card px-3 py-1.5">
      <Trophy className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      <div className="leading-tight">
        <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          Overall
        </p>
        <p className="text-sm font-semibold tabular-nums">
          {data?.overall ?? "··"}
          {data ? (
            <span className="ml-1.5 text-[11px] font-normal text-muted-foreground">
              {data.daysTracked} day{data.daysTracked === 1 ? "" : "s"}
            </span>
          ) : null}
        </p>
      </div>
    </div>
  );
}

function RangeSkeleton() {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-6 p-5 lg:flex-row">
        <Skeleton className="h-[156px] w-[156px] shrink-0 rounded-full" />
        <div className="w-full min-w-0 flex-1 space-y-4">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-16 w-full rounded-lg" />
            ))}
          </div>
          <Skeleton className="h-32 w-full rounded-md" />
        </div>
      </CardContent>
    </Card>
  );
}

function NoActivityCard({ period }: { period: string }) {
  return (
    <motion.div variants={section}>
      <Card>
        <CardContent className="flex flex-col items-center gap-2 p-10 text-center">
          <CalendarOff className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm font-medium">
            No activity recorded this {period}
          </p>
          <p className="max-w-sm text-xs text-muted-foreground">
            Scores appear once routines or due tasks land on these days.
          </p>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function bestAndWorst(days: DayScore[]): {
  best: DayScore | null;
  worst: DayScore | null;
} {
  let best: DayScore | null = null;
  let worst: DayScore | null = null;
  for (const day of days) {
    if (day.score === null) continue;
    if (!best || day.score > best.score!) best = day;
    if (!worst || day.score < worst.score!) worst = day;
  }
  return { best, worst };
}

export default function ReviewPage() {
  const todayIso = format(new Date(), "yyyy-MM-dd");
  const [tab, setTab] = useState<RangeTab>("week");

  const currentWeekStart = weekStartOf(todayIso);
  const [weekStart, setWeekStart] = useState(currentWeekStart);
  const isCurrentWeek = weekStart === currentWeekStart;

  const currentMonthStart = monthStartOf(todayIso);
  const [monthStart, setMonthStart] = useState(currentMonthStart);
  const isCurrentMonth = monthStart === currentMonthStart;

  const previousWeekStart = addWeeks(weekStart, -1);
  const weekEnd = weekEndOf(weekStart);
  const weekRange = useScoreRange(previousWeekStart, weekEnd, tab === "week");

  // Current + previous calendar month in one fetch: at most 62 days, safely
  // inside the API's 92-day range cap.
  const previousMonthStart = addMonths(monthStart, -1);
  const monthEnd = monthEndOf(monthStart);
  const monthRange = useScoreRange(
    previousMonthStart,
    monthEnd,
    tab === "month"
  );

  const { data: scoreData } = useScore();

  const weekDays: DayScore[] =
    weekRange.data?.filter((day) => day.date >= weekStart) ?? [];
  const previousDays: DayScore[] =
    weekRange.data?.filter((day) => day.date < weekStart) ?? [];

  // Future days score 0 when tasks are due there; only elapsed days count.
  const visibleDays = weekDays.filter((day) => day.date <= todayIso);

  const hasActivity = weekDays.some((day) =>
    day.pillars.some((pillar) => pillar.total > 0)
  );

  const average = averageScore(visibleDays);
  const pillars = pillarWeekTotals(visibleDays);
  const previousPillars = pillarWeekTotals(previousDays);

  const completed = pillars.reduce((sum, pillar) => sum + pillar.completed, 0);
  const scheduled = pillars.reduce((sum, pillar) => sum + pillar.total, 0);
  const { best, worst } = bestAndWorst(visibleDays);
  const scoredDayCount = visibleDays.filter((day) => day.score !== null).length;

  const monthDays: DayScore[] =
    monthRange.data?.filter((day) => day.date >= monthStart) ?? [];
  const previousMonthDays: DayScore[] =
    monthRange.data?.filter((day) => day.date < monthStart) ?? [];
  const visibleMonthDays = monthDays.filter((day) => day.date <= todayIso);

  const monthHasActivity = monthDays.some((day) =>
    day.pillars.some((pillar) => pillar.total > 0)
  );

  const monthAverage = averageScore(visibleMonthDays);
  const monthPillars = pillarWeekTotals(visibleMonthDays);
  const previousMonthPillars = pillarWeekTotals(previousMonthDays);

  const monthCompleted = monthPillars.reduce(
    (sum, pillar) => sum + pillar.completed,
    0
  );
  const monthScheduled = monthPillars.reduce(
    (sum, pillar) => sum + pillar.total,
    0
  );
  const { best: monthBest, worst: monthWorst } =
    bestAndWorst(visibleMonthDays);
  const monthScoredCount = visibleMonthDays.filter(
    (day) => day.score !== null
  ).length;

  const streak = currentStreak(scoreData?.history ?? [], 50, todayIso);

  const isWeek = tab === "week";
  const activeRange = isWeek ? weekRange : monthRange;

  return (
    <section className="mx-auto w-full max-w-7xl space-y-6">
      <PageHeader
        title={isWeek ? "Weekly review" : "Monthly review"}
        icon={<ClipboardCheck className="h-5 w-5" />}
        subtitle={
          isWeek
            ? isCurrentWeek
              ? `This week, ${weekLabel(weekStart)}`
              : weekLabel(weekStart)
            : isCurrentMonth
              ? `This month, ${format(parseISO(monthStart), "MMMM yyyy")}`
              : format(parseISO(monthStart), "MMMM yyyy")
        }
        actions={
          <>
            <OverallStat />
            <div className="inline-flex rounded-lg border border-border/60 p-0.5 text-sm">
              {(["week", "month"] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  aria-pressed={tab === option}
                  onClick={() => setTab(option)}
                  className={cn(
                    "rounded-md px-3 py-1 capitalize transition-colors",
                    tab === option
                      ? "bg-muted font-medium"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {option}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                aria-label={isWeek ? "Previous week" : "Previous month"}
                onClick={() =>
                  isWeek
                    ? setWeekStart(addWeeks(weekStart, -1))
                    : setMonthStart(addMonths(monthStart, -1))
                }
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              {isWeek && !isCurrentWeek ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8"
                  onClick={() => setWeekStart(currentWeekStart)}
                >
                  This week
                </Button>
              ) : null}
              {!isWeek && !isCurrentMonth ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8"
                  onClick={() => setMonthStart(currentMonthStart)}
                >
                  This month
                </Button>
              ) : null}
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                aria-label={isWeek ? "Next week" : "Next month"}
                disabled={isWeek ? isCurrentWeek : isCurrentMonth}
                onClick={() =>
                  isWeek
                    ? setWeekStart(addWeeks(weekStart, 1))
                    : setMonthStart(addMonths(monthStart, 1))
                }
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </>
        }
      />

      <motion.div
        key={isWeek ? `week-${weekStart}` : `month-${monthStart}`}
        variants={container}
        initial="hidden"
        animate="show"
        className="space-y-4"
      >
        {activeRange.isLoading ? (
          <RangeSkeleton />
        ) : activeRange.error || !activeRange.data ? (
          <Card>
            <CardContent className="p-5 text-sm text-muted-foreground">
              Couldn&apos;t load {isWeek ? "this week's" : "this month's"}{" "}
              scores.
            </CardContent>
          </Card>
        ) : isWeek ? (
          !hasActivity ? (
            <NoActivityCard period="week" />
          ) : (
            <>
              <motion.div variants={section}>
                <Card>
                  <CardContent className="flex flex-col items-center gap-6 p-5 lg:flex-row">
                    <ScoreRing
                      score={average}
                      label={isCurrentWeek ? "Week avg so far" : "Week avg"}
                    />
                    <div className="w-full min-w-0 flex-1 space-y-4">
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                        <StatTile
                          icon={Flame}
                          label="Current streak"
                          value={`${streak} day${streak === 1 ? "" : "s"}`}
                          hint="scoring 50 or more"
                        />
                        <StatTile
                          icon={CheckCircle2}
                          label="Completions"
                          value={`${completed}/${scheduled}`}
                          hint="done vs scheduled"
                        />
                        {best ? (
                          <StatTile
                            icon={TrendingUp}
                            label="Best day"
                            value={format(parseISO(best.date), "EEE d")}
                            hint={`${best.score}/100`}
                          />
                        ) : (
                          <StatTile icon={TrendingUp} label="Best day" value="··" />
                        )}
                        {worst && scoredDayCount > 1 ? (
                          <StatTile
                            icon={TrendingDown}
                            label="Toughest day"
                            value={format(parseISO(worst.date), "EEE d")}
                            hint={`${worst.score}/100`}
                          />
                        ) : (
                          <StatTile
                            icon={TrendingDown}
                            label="Toughest day"
                            value="··"
                          />
                        )}
                      </div>
                      <WeekDayBars days={weekDays} today={todayIso} />
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div variants={section}>
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Scale className="h-4 w-4 text-muted-foreground" />
                      Pillars this week
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <PillarWeekDeltas
                      current={pillars}
                      previous={previousPillars}
                    />
                  </CardContent>
                </Card>
              </motion.div>
            </>
          )
        ) : !monthHasActivity ? (
          <NoActivityCard period="month" />
        ) : (
          <>
            <motion.div variants={section}>
              <Card>
                <CardContent className="flex flex-col items-center gap-6 p-5 lg:flex-row">
                  <ScoreRing
                    score={monthAverage}
                    label={isCurrentMonth ? "Month avg so far" : "Month avg"}
                  />
                  <div className="w-full min-w-0 flex-1 space-y-4">
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                      <StatTile
                        icon={CheckCircle2}
                        label="Completions"
                        value={`${monthCompleted}/${monthScheduled}`}
                        hint="done vs scheduled"
                      />
                      <StatTile
                        icon={CalendarRange}
                        label="Days tracked"
                        value={`${monthScoredCount}`}
                        hint={
                          isCurrentMonth ? "so far this month" : "this month"
                        }
                      />
                      {monthBest ? (
                        <StatTile
                          icon={TrendingUp}
                          label="Best day"
                          value={format(parseISO(monthBest.date), "EEE d")}
                          hint={`${monthBest.score}/100`}
                        />
                      ) : (
                        <StatTile icon={TrendingUp} label="Best day" value="··" />
                      )}
                      {monthWorst && monthScoredCount > 1 ? (
                        <StatTile
                          icon={TrendingDown}
                          label="Toughest day"
                          value={format(parseISO(monthWorst.date), "EEE d")}
                          hint={`${monthWorst.score}/100`}
                        />
                      ) : (
                        <StatTile
                          icon={TrendingDown}
                          label="Toughest day"
                          value="··"
                        />
                      )}
                    </div>
                    <MonthHeatStrip days={monthDays} today={todayIso} />
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div variants={section}>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Scale className="h-4 w-4 text-muted-foreground" />
                    Pillars this month
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <PillarWeekDeltas
                    current={monthPillars}
                    previous={previousMonthPillars}
                    compareLabel="vs previous month"
                  />
                </CardContent>
              </Card>
            </motion.div>
          </>
        )}

        {isWeek ? (
          <>
            <motion.div variants={section}>
              <GoalsSnapshot />
            </motion.div>

            <motion.div variants={section}>
              <ReflectionCard weekStart={weekStart} />
            </motion.div>
          </>
        ) : null}
      </motion.div>
    </section>
  );
}
