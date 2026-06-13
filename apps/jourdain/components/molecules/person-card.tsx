"use client";

import { Cake } from "lucide-react";
import { differenceInDays, format, parseISO } from "date-fns";
import { Badge } from "@workspace/ui/components/badge";
import { cn } from "@workspace/ui/lib/utils";
import type { Person, PersonCircle } from "@/entities/people/model/types";

export const CIRCLE_CONFIG: Record<
  PersonCircle,
  { label: string; badgeClass: string }
> = {
  work: {
    label: "Work",
    badgeClass: "border-blue-500/40 bg-blue-500/10 text-blue-600 dark:text-blue-400",
  },
  friends: {
    label: "Friends",
    badgeClass:
      "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  },
  family: {
    label: "Family",
    badgeClass:
      "border-violet-500/40 bg-violet-500/10 text-violet-600 dark:text-violet-400",
  },
};

export function personInitials(person: Person): string {
  return person.fullName
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function birthdayLabel(person: Person): string | null {
  if (!person.birthdayMonth || !person.birthdayDay) return null;
  const date = new Date(2000, person.birthdayMonth - 1, person.birthdayDay);
  return format(date, "d MMM");
}

export function isTouchOverdue(person: Person): boolean {
  if (!person.touchBaseDays) return false;
  if (!person.lastTouchAt) return true;
  return (
    differenceInDays(new Date(), parseISO(person.lastTouchAt)) >
    person.touchBaseDays
  );
}

export function lastTouchLabel(person: Person): string {
  if (!person.lastTouchAt) return "never";
  const days = differenceInDays(new Date(), parseISO(person.lastTouchAt));
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 14) return `${days}d ago`;
  if (days < 60) return `${Math.round(days / 7)}w ago`;
  return `${Math.round(days / 30)}mo ago`;
}

export function PersonCard({
  person,
  onOpen,
}: {
  person: Person;
  onOpen: (person: Person) => void;
}) {
  const birthday = birthdayLabel(person);
  const overdue = isTouchOverdue(person);

  return (
    <button
      type="button"
      onClick={() => onOpen(person)}
      className="flex w-full items-start gap-3 rounded-xl border border-border/60 bg-card p-4 text-left shadow-sm transition-colors hover:border-border"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold text-foreground">
        {personInitials(person)}
      </div>
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-medium text-foreground">
            {person.fullName}
          </p>
          {overdue ? (
            <span
              className="h-2 w-2 shrink-0 rounded-full bg-amber-500"
              title={`Touch base overdue — last contact ${lastTouchLabel(person)}`}
            />
          ) : null}
        </div>
        {person.company || person.role ? (
          <p className="truncate text-xs text-muted-foreground">
            {[person.role, person.company].filter(Boolean).join(" · ")}
          </p>
        ) : null}
        <div className="flex flex-wrap items-center gap-1.5">
          {person.circles.map((circle) => (
            <Badge
              key={circle}
              variant="outline"
              className={cn("text-[10px]", CIRCLE_CONFIG[circle].badgeClass)}
            >
              {CIRCLE_CONFIG[circle].label}
            </Badge>
          ))}
          {birthday ? (
            <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <Cake className="h-3 w-3" />
              {birthday}
            </span>
          ) : null}
        </div>
      </div>
    </button>
  );
}
