"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Cake, HandHeart, Users } from "lucide-react";
import { format } from "date-fns";
import { Badge } from "@workspace/ui/components/badge";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { PageHeader } from "@/components/page-header";
import {
  CIRCLE_CONFIG,
  isTouchOverdue,
  personInitials,
  touchOverdueDays,
} from "@/components/molecules/person-card";
import { usePeople } from "@/hooks/people/use-people";
import { upcomingBirthdays } from "@/lib/people/birthdays";
import { relativeTime } from "@/lib/format";
import { PERSON_CIRCLES } from "@/entities/people/model/types";

export default function SocialPage() {
  const { data: people, isLoading, error } = usePeople();

  const all = people ?? [];
  const overdue = all
    .filter((person) => isTouchOverdue(person))
    .sort(
      (a, b) =>
        (touchOverdueDays(b) ?? 0) - (touchOverdueDays(a) ?? 0) ||
        a.fullName.localeCompare(b.fullName),
    );
  const upcoming = upcomingBirthdays(all);
  const thisMonth = new Date().getMonth() + 1;
  const birthdaysThisMonth = all.filter(
    (person) => person.birthdayMonth === thisMonth,
  ).length;

  const stats = [
    { label: "People", value: all.length, icon: Users },
    { label: "Overdue follow-ups", value: overdue.length, icon: HandHeart },
    { label: "Birthdays this month", value: birthdaysThisMonth, icon: Cake },
  ];

  return (
    <section className="mx-auto w-full max-w-5xl space-y-6">
      <PageHeader
        title="Social"
        subtitle="Your people, follow-ups and birthdays in one place"
      />

      {error ? <p className="text-sm text-destructive">{error.message}</p> : null}

      <div className="grid gap-3 sm:grid-cols-3">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: index * 0.05 }}
            className="rounded-xl border border-border/60 bg-card p-4 shadow-sm"
          >
            <div className="flex items-center gap-2 text-muted-foreground">
              <stat.icon className="h-4 w-4" />
              <p className="text-xs font-medium">{stat.label}</p>
            </div>
            {isLoading ? (
              <Skeleton className="mt-2 h-7 w-12" />
            ) : (
              <p className="mt-1 text-2xl font-semibold tracking-tight">
                {stat.value}
              </p>
            )}
          </motion.div>
        ))}
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        <PreviewCard
          href="/social/relationships"
          title="Relationships"
          icon={<Users className="h-4 w-4" />}
          delay={0.15}
        >
          {isLoading ? (
            <PreviewSkeleton />
          ) : all.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No people yet. Start by adding the people in your life.
            </p>
          ) : (
            <div className="space-y-2.5">
              <div className="flex -space-x-2">
                {all.slice(0, 6).map((person) => (
                  <div
                    key={person.id}
                    className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-card bg-muted text-[11px] font-semibold"
                    title={person.fullName}
                  >
                    {personInitials(person)}
                  </div>
                ))}
                {all.length > 6 ? (
                  <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-card bg-muted text-[10px] font-medium text-muted-foreground">
                    +{all.length - 6}
                  </div>
                ) : null}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {PERSON_CIRCLES.map((circle) => {
                  const count = all.filter((person) =>
                    person.circles.includes(circle),
                  ).length;
                  if (count === 0) return null;
                  return (
                    <Badge
                      key={circle}
                      variant="outline"
                      className={`text-[10px] ${CIRCLE_CONFIG[circle].badgeClass}`}
                    >
                      {count} {CIRCLE_CONFIG[circle].label}
                    </Badge>
                  );
                })}
              </div>
            </div>
          )}
        </PreviewCard>

        <PreviewCard
          href="/social/follow-ups"
          title="Follow-ups"
          icon={<HandHeart className="h-4 w-4" />}
          delay={0.2}
        >
          {isLoading ? (
            <PreviewSkeleton />
          ) : overdue.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No one is due a touch base right now.
            </p>
          ) : (
            <ul className="space-y-2">
              {overdue.slice(0, 3).map((person) => (
                <li key={person.id} className="flex items-center gap-2 text-sm">
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
                  <span className="min-w-0 flex-1 truncate">{person.fullName}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {person.lastTouchAt
                      ? `${relativeTime(person.lastTouchAt)} ago`
                      : "never"}
                  </span>
                </li>
              ))}
              {overdue.length > 3 ? (
                <li className="text-xs text-muted-foreground">
                  and {overdue.length - 3} more
                </li>
              ) : null}
            </ul>
          )}
        </PreviewCard>

        <PreviewCard
          href="/social/birthdays"
          title="Birthdays"
          icon={<Cake className="h-4 w-4" />}
          delay={0.25}
        >
          {isLoading ? (
            <PreviewSkeleton />
          ) : upcoming.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No birthdays on file yet. Add them to never miss one.
            </p>
          ) : (
            <ul className="space-y-2">
              {upcoming.slice(0, 3).map((entry) => (
                <li
                  key={entry.person.id}
                  className="flex items-center gap-2 text-sm"
                >
                  <span className="min-w-0 flex-1 truncate">
                    {entry.person.fullName}
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {entry.isToday ? "Today" : format(entry.date, "d MMM")}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </PreviewCard>
      </div>
    </section>
  );
}

function PreviewCard({
  href,
  title,
  icon,
  delay,
  children,
}: {
  href: string;
  title: string;
  icon: React.ReactNode;
  delay: number;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay }}
    >
      <Link
        href={href}
        className="group flex h-full flex-col gap-3 rounded-xl border border-border/60 bg-card p-4 shadow-sm transition-colors hover:border-border"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">{icon}</span>
            <h2 className="text-sm font-semibold">{title}</h2>
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
        </div>
        <div className="flex-1">{children}</div>
      </Link>
    </motion.div>
  );
}

function PreviewSkeleton() {
  return (
    <div className="space-y-2">
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-3/4" />
    </div>
  );
}
