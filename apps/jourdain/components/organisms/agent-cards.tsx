"use client";

import {
  Cake,
  CheckCircle2,
  Gauge,
  HandHeart,
  ListTodo,
  Plus,
  UserRound,
  UsersRound,
  Wallet,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { Badge } from "@workspace/ui/components/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { cn } from "@workspace/ui/lib/utils";
import { DOMAIN_CONFIG, TaskRow } from "@/components/molecules/task-row";
import { WorkoutSessionCard } from "@/components/organisms/agent-workout-card";
import {
  CIRCLE_CONFIG,
  lastTouchLabel,
  personInitials,
} from "@/components/molecules/person-card";
import { formatMoney } from "@/lib/format";
import { scoreBand } from "@/lib/scoring/bands";
import type { AgentCard } from "@/entities/agent/model/types";
import type { Person } from "@/entities/people/model/types";
import type { Task } from "@/entities/tasks/model/types";

type AgentCardViewProps = {
  card: AgentCard;
  onToggleTask: (task: Task) => void;
  /** When this card becomes visible (ms from render) — for staged reveals. */
  revealDelayMs?: number;
  /** When false, cards that choreograph their reveal render fully at rest —
   *  used for turns that have settled into the transcript. */
  animate?: boolean;
};

function PersonSummaryRow({ person }: { person: Person }) {
  const latestFact = person.facts[person.facts.length - 1];
  return (
    <div className="flex items-start gap-3 rounded-md border border-border/70 bg-muted/30 px-3 py-2">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-foreground">
        {personInitials(person)}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <p className="text-sm font-medium text-foreground">{person.fullName}</p>
          {person.circles.map((circle) => (
            <Badge
              key={circle}
              variant="outline"
              className={cn("text-[10px]", CIRCLE_CONFIG[circle].badgeClass)}
            >
              {CIRCLE_CONFIG[circle].label}
            </Badge>
          ))}
        </div>
        {person.bio ? (
          <p className="truncate text-xs text-muted-foreground">{person.bio}</p>
        ) : null}
        {latestFact ? (
          <p className="truncate text-xs text-muted-foreground">“{latestFact}”</p>
        ) : null}
      </div>
    </div>
  );
}

const SCORE_BAR_CLASS = {
  high: "bg-emerald-500",
  mid: "bg-amber-500",
  low: "bg-rose-500",
} as const;

function scoreBarColor(score: number): string {
  return SCORE_BAR_CLASS[scoreBand(score)];
}

export function AgentCardView({
  card,
  onToggleTask,
  revealDelayMs = 0,
  animate = true,
}: AgentCardViewProps) {
  if (card.type === "score") {
    return (
      <Card className="max-w-2xl border-border/80">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Gauge className="h-4 w-4 text-muted-foreground" />
            {card.title}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <span className="text-3xl font-semibold tabular-nums text-foreground">
              {card.score ?? "-"}
            </span>
            <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-muted">
              <div
                className={cn(
                  "h-full rounded-full transition-[width]",
                  scoreBarColor(card.score ?? 0),
                )}
                style={{ width: `${card.score ?? 0}%` }}
              />
            </div>
            <span className="text-xs text-muted-foreground">/ 100</span>
          </div>
          <div className="space-y-2">
            {card.pillars.map((pillar) => {
              const config = DOMAIN_CONFIG[pillar.pillar];
              const Icon = config.icon;
              return (
                <div key={pillar.pillar} className="flex items-center gap-3">
                  <span className="flex w-24 shrink-0 items-center gap-1.5 text-xs text-muted-foreground">
                    <Icon className="h-3.5 w-3.5" />
                    {config.label}
                  </span>
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                    {pillar.score !== null ? (
                      <div
                        className={cn(
                          "h-full rounded-full",
                          scoreBarColor(pillar.score),
                        )}
                        style={{ width: `${pillar.score}%` }}
                      />
                    ) : null}
                  </div>
                  <span className="w-10 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
                    {pillar.score !== null
                      ? `${pillar.completed}/${pillar.total}`
                      : "-"}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="flex items-end gap-1.5 pt-1">
            {card.trend.map((day) => (
              <div
                key={day.date}
                className="flex flex-1 flex-col items-center gap-1"
                title={`${day.date}: ${day.score ?? "no tasks"}`}
              >
                <div className="flex h-10 w-full items-end overflow-hidden rounded-sm bg-muted/60">
                  {day.score !== null ? (
                    <div
                      className={cn("w-full rounded-sm", scoreBarColor(day.score))}
                      style={{ height: `${Math.max(day.score, 6)}%` }}
                    />
                  ) : null}
                </div>
                <span className="text-[10px] text-muted-foreground">
                  {format(parseISO(day.date), "EEEEE")}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (card.type === "spending") {
    const maxCategory = card.categories[0]?.total ?? 0;
    return (
      <Card className="max-w-2xl border-border/80">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Wallet className="h-4 w-4 text-muted-foreground" />
            {card.title}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-semibold tabular-nums text-foreground">
              {formatMoney(card.total)}
            </span>
            <span className="text-xs text-muted-foreground">
              spent in {card.monthLabel}
            </span>
          </div>
          {card.categories.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No spending recorded this month.
            </p>
          ) : (
            <div className="space-y-2">
              {card.categories.map((entry) => (
                <div key={entry.category} className="flex items-center gap-3">
                  <span className="w-24 shrink-0 text-xs capitalize text-muted-foreground">
                    {entry.category}
                  </span>
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-sky-500"
                      style={{
                        width: `${maxCategory > 0 ? Math.max((entry.total / maxCategory) * 100, 2) : 0}%`,
                      }}
                    />
                  </div>
                  <span className="w-20 shrink-0 text-right text-xs tabular-nums text-foreground">
                    {formatMoney(entry.total)}
                  </span>
                </div>
              ))}
            </div>
          )}
          {card.merchants.length > 0 ? (
            <div className="space-y-1 border-t border-border/60 pt-3">
              <p className="text-xs font-medium text-muted-foreground">
                Top merchants
              </p>
              {card.merchants.slice(0, 5).map((merchant) => (
                <div
                  key={merchant.merchant}
                  className="flex items-center justify-between gap-3 text-sm"
                >
                  <span className="truncate text-foreground">
                    {merchant.merchant}
                    <span className="ml-1.5 text-xs text-muted-foreground">
                      ×{merchant.count}
                    </span>
                  </span>
                  <span className="shrink-0 tabular-nums text-muted-foreground">
                    {formatMoney(merchant.total)}
                  </span>
                </div>
              ))}
            </div>
          ) : null}
        </CardContent>
      </Card>
    );
  }

  if (card.type === "birthday_list") {
    return (
      <Card className="max-w-2xl border-border/80">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Cake className="h-4 w-4 text-muted-foreground" />
            {card.title}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {card.entries.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No birthdays on file yet.
            </p>
          ) : (
            card.entries.map((entry) => (
              <div
                key={entry.person.id}
                className="flex items-center gap-3 rounded-md border border-border/70 bg-muted/30 px-3 py-2"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-foreground">
                  {personInitials(entry.person)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">
                    {entry.person.fullName}
                    {entry.turns !== null ? (
                      <span className="ml-1.5 text-xs text-muted-foreground">
                        turns {entry.turns}
                      </span>
                    ) : null}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {format(parseISO(entry.date), "EEEE d MMMM")}
                  </p>
                </div>
                <span
                  className={cn(
                    "shrink-0 text-xs font-medium",
                    entry.daysAway === 0
                      ? "text-pink-500"
                      : "text-muted-foreground",
                  )}
                >
                  {entry.daysAway === 0
                    ? "Today"
                    : entry.daysAway === 1
                      ? "Tomorrow"
                      : `in ${entry.daysAway}d`}
                </span>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    );
  }

  if (card.type === "followup_list") {
    return (
      <Card className="max-w-2xl border-border/80">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <HandHeart className="h-4 w-4 text-muted-foreground" />
            {card.title}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {card.entries.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No one is overdue. Nice work.
            </p>
          ) : (
            card.entries.map((entry) => (
              <div
                key={entry.person.id}
                className="flex items-center gap-3 rounded-md border border-border/70 bg-muted/30 px-3 py-2"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-foreground">
                  {personInitials(entry.person)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <p className="text-sm font-medium text-foreground">
                      {entry.person.fullName}
                    </p>
                    {entry.person.circles.map((circle) => (
                      <Badge
                        key={circle}
                        variant="outline"
                        className={cn(
                          "text-[10px]",
                          CIRCLE_CONFIG[circle].badgeClass,
                        )}
                      >
                        {CIRCLE_CONFIG[circle].label}
                      </Badge>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Last contact {lastTouchLabel(entry.person)}
                  </p>
                </div>
                <span className="shrink-0 text-xs font-medium text-amber-500">
                  {entry.overdueDays !== null
                    ? `${entry.overdueDays}d overdue`
                    : "never contacted"}
                </span>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    );
  }

  if (card.type === "person_profile") {
    return (
      <Card className="max-w-2xl border-border/80">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <UserRound className="h-4 w-4 text-muted-foreground" />
            {card.title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <PersonSummaryRow person={card.person} />
        </CardContent>
      </Card>
    );
  }

  if (card.type === "people_list") {
    return (
      <Card className="max-w-2xl border-border/80">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <UsersRound className="h-4 w-4 text-muted-foreground" />
            {card.title}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {card.people.length === 0 ? (
            <p className="text-sm text-muted-foreground">No one here yet.</p>
          ) : (
            card.people.map((person) => (
              <PersonSummaryRow key={person.id} person={person} />
            ))
          )}
        </CardContent>
      </Card>
    );
  }

  if (card.type === "workout_session") {
    return (
      <WorkoutSessionCard
        card={card}
        revealDelayMs={revealDelayMs}
        animate={animate}
      />
    );
  }

  if (card.type === "task_list") {
    return (
      <Card className="max-w-2xl border-border/80">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <ListTodo className="h-4 w-4 text-muted-foreground" />
            {card.title}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {card.tasks.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nothing here.</p>
          ) : (
            card.tasks.map((task) => (
              <TaskRow key={task.id} task={task} onToggle={onToggleTask} />
            ))
          )}
        </CardContent>
      </Card>
    );
  }

  const isCreated = card.type === "task_created";
  return (
    <Card className="max-w-2xl border-border/80">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          {isCreated ? (
            <Plus className="h-4 w-4 text-muted-foreground" />
          ) : (
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          )}
          {isCreated ? "Task added" : "Task completed"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <TaskRow task={card.task} onToggle={onToggleTask} />
      </CardContent>
    </Card>
  );
}
