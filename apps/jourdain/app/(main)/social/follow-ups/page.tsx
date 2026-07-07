"use client";

import { useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { CheckCircle2, HandHeart } from "lucide-react";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { cn } from "@workspace/ui/lib/utils";
import { PageHeader } from "@/components/page-header";
import {
  isTouchOverdue,
  personInitials,
  touchOverdueDays,
} from "@/components/molecules/person-card";
import {
  peopleQueryKey,
  usePeople,
  useUpdatePerson,
} from "@/hooks/people/use-people";
import { relativeTime } from "@/lib/format";
import type { Person } from "@/entities/people/model/types";

const CADENCE_OPTIONS = [7, 14, 30, 60, 90];

function overdueCompare(a: Person, b: Person): number {
  const overdueA = touchOverdueDays(a) ?? Number.NEGATIVE_INFINITY;
  const overdueB = touchOverdueDays(b) ?? Number.NEGATIVE_INFINITY;
  if (overdueA === overdueB) return a.fullName.localeCompare(b.fullName);
  return overdueB - overdueA;
}

export default function SocialFollowUpsPage() {
  const { data: people, isLoading, error } = usePeople();
  const updatePerson = useUpdatePerson();
  const queryClient = useQueryClient();

  const all = people ?? [];
  const overdue = all.filter((person) => isTouchOverdue(person)).sort(overdueCompare);
  const recentlyTouched = all
    .filter((person) => person.lastTouchAt && !isTouchOverdue(person))
    .sort((a, b) =>
      (b.lastTouchAt as string).localeCompare(a.lastTouchAt as string),
    );
  const untracked = all
    .filter((person) => !person.touchBaseDays && !person.lastTouchAt)
    .sort((a, b) => a.fullName.localeCompare(b.fullName));

  function logTouch(person: Person) {
    const now = new Date().toISOString();
    queryClient.setQueryData<Person[]>(peopleQueryKey, (prev) =>
      prev?.map((entry) =>
        entry.id === person.id ? { ...entry, lastTouchAt: now } : entry,
      ),
    );
    updatePerson.mutate(
      { personId: person.id, input: { lastTouchAt: now } },
      {
        onError: () =>
          queryClient.invalidateQueries({ queryKey: peopleQueryKey }),
      },
    );
  }

  function setCadence(person: Person, days: number | null) {
    updatePerson.mutate({ personId: person.id, input: { touchBaseDays: days } });
  }

  return (
    <section className="mx-auto w-full max-w-4xl space-y-8">
      <PageHeader
        title="Follow-ups"
        icon={<HandHeart className="h-5 w-5" />}
        subtitle={
          isLoading
            ? "Loading..."
            : overdue.length > 0
              ? `${overdue.length} ${overdue.length === 1 ? "person is" : "people are"} due a touch base`
              : "All caught up"
        }
      />

      {error ? <p className="text-sm text-destructive">{error.message}</p> : null}

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : (
        <div className="space-y-8">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="space-y-2"
          >
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Due now
            </h2>
            {overdue.length === 0 ? (
              <div className="flex items-center gap-2.5 rounded-md border border-dashed border-border px-4 py-8 text-sm text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                {all.length === 0
                  ? "No people yet. Add someone in Relationships and set a cadence to start tracking."
                  : "No one is overdue. Nice work staying in touch."}
              </div>
            ) : (
              <div className="space-y-2">
                {overdue.map((person) => (
                  <FollowUpRow
                    key={person.id}
                    person={person}
                    onLogTouch={logTouch}
                    onSetCadence={setCadence}
                  />
                ))}
              </div>
            )}
          </motion.div>

          {recentlyTouched.length > 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: 0.08 }}
              className="space-y-2"
            >
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Recently touched
              </h2>
              <div className="space-y-2">
                {recentlyTouched.map((person) => (
                  <FollowUpRow
                    key={person.id}
                    person={person}
                    onLogTouch={logTouch}
                    onSetCadence={setCadence}
                  />
                ))}
              </div>
            </motion.div>
          ) : null}

          {untracked.length > 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: 0.16 }}
              className="space-y-2 border-t border-border/60 pt-6"
            >
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Not tracked
              </h2>
              <p className="text-xs text-muted-foreground">
                Set a cadence or log a first touch to start tracking someone.
              </p>
              <div className="space-y-2">
                {untracked.map((person) => (
                  <FollowUpRow
                    key={person.id}
                    person={person}
                    onLogTouch={logTouch}
                    onSetCadence={setCadence}
                  />
                ))}
              </div>
            </motion.div>
          ) : null}
        </div>
      )}
    </section>
  );
}

function FollowUpRow({
  person,
  onLogTouch,
  onSetCadence,
}: {
  person: Person;
  onLogTouch: (person: Person) => void;
  onSetCadence: (person: Person, days: number | null) => void;
}) {
  const overdueDays = touchOverdueDays(person);
  const overdue = isTouchOverdue(person);
  const cadenceValue = person.touchBaseDays
    ? String(person.touchBaseDays)
    : "off";
  const cadenceOptions =
    person.touchBaseDays && !CADENCE_OPTIONS.includes(person.touchBaseDays)
      ? [person.touchBaseDays, ...CADENCE_OPTIONS]
      : CADENCE_OPTIONS;

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border/60 bg-card p-3.5 shadow-sm">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold text-foreground">
        {personInitials(person)}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-medium text-foreground">
            {person.fullName}
          </p>
          {overdue ? (
            <Badge
              variant="outline"
              className="shrink-0 border-amber-500/40 bg-amber-500/10 text-[11px] text-amber-600 dark:text-amber-400"
            >
              {overdueDays === Number.POSITIVE_INFINITY
                ? "Never contacted"
                : `Overdue ${overdueDays}d`}
            </Badge>
          ) : null}
        </div>
        <p className="text-xs text-muted-foreground">
          {person.lastTouchAt
            ? `Last contact ${relativeTime(person.lastTouchAt)} ago`
            : "No contact logged"}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        <Select
          value={cadenceValue}
          onValueChange={(value) =>
            onSetCadence(person, value === "off" ? null : Number(value))
          }
        >
          <SelectTrigger
            className={cn(
              "h-8 w-28 text-xs",
              cadenceValue === "off" && "text-muted-foreground",
            )}
            aria-label={`Cadence for ${person.fullName}`}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="off">No cadence</SelectItem>
            {cadenceOptions.map((days) => (
              <SelectItem key={days} value={String(days)}>
                Every {days}d
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 gap-1.5 text-xs"
          onClick={() => onLogTouch(person)}
        >
          <HandHeart className="h-3.5 w-3.5" />
          Log touch
        </Button>
      </div>
    </div>
  );
}
