"use client";

import { CheckCircle2, ListTodo, Plus, UserRound, UsersRound } from "lucide-react";
import { Badge } from "@workspace/ui/components/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { cn } from "@workspace/ui/lib/utils";
import { TaskRow } from "@/components/molecules/task-row";
import { WorkoutSessionCard } from "@/components/organisms/agent-workout-card";
import { CIRCLE_CONFIG, personInitials } from "@/components/molecules/person-card";
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

export function AgentCardView({
  card,
  onToggleTask,
  revealDelayMs = 0,
  animate = true,
}: AgentCardViewProps) {
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
