"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Cake, PartyPopper, Plus } from "lucide-react";
import { format } from "date-fns";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
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
import { personInitials } from "@/components/molecules/person-card";
import { useUpdatePerson, usePeople } from "@/hooks/people/use-people";
import {
  hasBirthday,
  upcomingBirthdays,
  type UpcomingBirthday,
} from "@/lib/people/birthdays";
import type { Person } from "@/entities/people/model/types";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function daysAwayLabel(daysAway: number): string {
  if (daysAway === 0) return "Today";
  if (daysAway === 1) return "Tomorrow";
  if (daysAway < 30) return `in ${daysAway}d`;
  return `in ${Math.round(daysAway / 30)}mo`;
}

function groupByMonth(entries: UpcomingBirthday[]) {
  const groups: { label: string; items: UpcomingBirthday[] }[] = [];
  for (const entry of entries) {
    const label = format(entry.date, "MMMM yyyy");
    const last = groups[groups.length - 1];
    if (last && last.label === label) last.items.push(entry);
    else groups.push({ label, items: [entry] });
  }
  return groups;
}

export default function SocialBirthdaysPage() {
  const { data: people, isLoading, error } = usePeople();

  const upcoming = upcomingBirthdays(people ?? []);
  const groups = groupByMonth(upcoming);
  const missing = (people ?? [])
    .filter((person) => !hasBirthday(person))
    .sort((a, b) => a.fullName.localeCompare(b.fullName));
  const todayCount = upcoming.filter((entry) => entry.isToday).length;

  return (
    <section className="mx-auto w-full max-w-4xl space-y-8">
      <PageHeader
        title="Birthdays"
        icon={<Cake className="h-5 w-5" />}
        subtitle={
          isLoading
            ? "Loading..."
            : todayCount > 0
              ? `${todayCount} ${todayCount === 1 ? "birthday" : "birthdays"} today`
              : `${upcoming.length} known ${upcoming.length === 1 ? "birthday" : "birthdays"} over the next 12 months`
        }
      />

      {error ? <p className="text-sm text-destructive">{error.message}</p> : null}

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : upcoming.length === 0 ? (
        <div className="rounded-md border border-dashed border-border px-4 py-12 text-center">
          <Cake className="mx-auto h-8 w-8 text-muted-foreground/60" />
          <p className="mt-3 text-sm font-medium text-foreground">
            No birthdays on file yet
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {missing.length > 0
              ? "Add a birthday to anyone below and they will appear on the timeline."
              : "Add some people in Relationships first, then set their birthdays here."}
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {groups.map((group, groupIndex) => (
            <motion.div
              key={group.label}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: Math.min(groupIndex * 0.05, 0.4) }}
              className="space-y-2"
            >
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                {group.label}
              </h2>
              <div className="space-y-2">
                {group.items.map((entry) => (
                  <BirthdayRow key={entry.person.id} entry={entry} />
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {!isLoading && missing.length > 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: 0.2 }}
          className="space-y-2 border-t border-border/60 pt-6"
        >
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Missing birthdays
          </h2>
          <p className="text-xs text-muted-foreground">
            Click a person to add their birthday.
          </p>
          <div className="space-y-2">
            {missing.map((person) => (
              <MissingBirthdayRow key={person.id} person={person} />
            ))}
          </div>
        </motion.div>
      ) : null}
    </section>
  );
}

function BirthdayRow({ entry }: { entry: UpcomingBirthday }) {
  const { person, date, daysAway, turns, isToday } = entry;
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-xl border bg-card p-3.5 shadow-sm",
        isToday
          ? "border-pink-500/50 bg-gradient-to-r from-pink-500/10 via-amber-500/10 to-transparent"
          : "border-border/60",
      )}
    >
      <div
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold",
          isToday ? "bg-pink-500/15 text-pink-600 dark:text-pink-400" : "bg-muted text-foreground",
        )}
      >
        {personInitials(person)}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-medium text-foreground">
            {person.fullName}
          </p>
          {isToday ? (
            <PartyPopper className="h-4 w-4 shrink-0 text-pink-500" />
          ) : null}
        </div>
        <p className="text-xs text-muted-foreground">{format(date, "EEEE d MMMM")}</p>
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        {turns !== null ? (
          <Badge variant="outline" className="text-[11px]">
            Turns {turns}
          </Badge>
        ) : null}
        <Badge
          variant="outline"
          className={cn(
            "text-[11px]",
            isToday
              ? "border-pink-500/50 bg-pink-500/10 text-pink-600 dark:text-pink-400"
              : daysAway <= 7
                ? "border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400"
                : "text-muted-foreground",
          )}
        >
          {daysAwayLabel(daysAway)}
        </Badge>
      </div>
    </div>
  );
}

function MissingBirthdayRow({ person }: { person: Person }) {
  const [open, setOpen] = useState(false);
  const [day, setDay] = useState("");
  const [month, setMonth] = useState("none");
  const [year, setYear] = useState("");
  const updatePerson = useUpdatePerson();

  const valid = Number(day) >= 1 && Number(day) <= 31 && month !== "none";

  function save() {
    if (!valid || updatePerson.isPending) return;
    updatePerson.mutate({
      personId: person.id,
      input: {
        birthdayDay: Number(day),
        birthdayMonth: Number(month),
        birthdayYear: year ? Number(year) : null,
      },
    });
  }

  return (
    <div className="rounded-xl border border-border/60 bg-card shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex w-full items-center gap-3 p-3.5 text-left"
        aria-expanded={open}
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-foreground">
          {personInitials(person)}
        </div>
        <p className="min-w-0 flex-1 truncate text-sm text-foreground">
          {person.fullName}
        </p>
        <span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
          <Plus className="h-3.5 w-3.5" />
          Add birthday
        </span>
      </button>
      {open ? (
        <form
          className="flex flex-wrap items-center gap-1.5 border-t border-border/50 px-3.5 py-2.5"
          onSubmit={(event) => {
            event.preventDefault();
            save();
          }}
        >
          <Input
            type="number"
            min={1}
            max={31}
            value={day}
            onChange={(event) => setDay(event.target.value)}
            placeholder="Day"
            aria-label={`Birthday day for ${person.fullName}`}
            className="h-8 w-16 text-xs"
          />
          <Select value={month} onValueChange={setMonth}>
            <SelectTrigger
              className="h-8 w-36 text-xs"
              aria-label={`Birthday month for ${person.fullName}`}
            >
              <SelectValue placeholder="Month" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Month</SelectItem>
              {MONTHS.map((label, index) => (
                <SelectItem key={label} value={String(index + 1)}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            type="number"
            min={1900}
            max={2100}
            value={year}
            onChange={(event) => setYear(event.target.value)}
            placeholder="Year (optional)"
            aria-label={`Birthday year for ${person.fullName}`}
            className="h-8 w-32 text-xs"
          />
          <Button
            type="submit"
            size="sm"
            className="h-8 text-xs"
            disabled={!valid || updatePerson.isPending}
          >
            Save
          </Button>
        </form>
      ) : null}
    </div>
  );
}
