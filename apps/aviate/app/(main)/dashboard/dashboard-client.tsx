"use client";

import * as React from "react";
import Link from "next/link";
import { format } from "date-fns";
import {
  ArrowRight,
  Banknote,
  CalendarOff,
  CalendarRange,
  Clock,
  PlaneTakeoff,
  SunMedium,
  UserCheck,
  Users,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Card } from "@workspace/ui/components/card";
import { cn } from "@workspace/ui/lib/utils";

import { PageHeader } from "@/components/molecules/page-header";
import {
  AVAILABILITY_ENTRIES,
  LEAVE_REQUESTS,
  ROLE_DOT,
  ROLE_PILL,
  ROSTER_STAFF,
  leaveStatusTone,
} from "@/lib/aviate-demo";

// date-fns getDay: 0=Sun..6=Sat; our shift arrays are Mon..Sun (0=Mon).
const now = new Date();
const todayIdx = (now.getDay() + 6) % 7;

export function DashboardClient() {
  const onShiftToday = ROSTER_STAFF.filter((s) => s.shifts[todayIdx]);
  const weekShifts = ROSTER_STAFF.reduce(
    (n, s) => n + s.shifts.filter(Boolean).length,
    0
  );
  const pendingLeave = LEAVE_REQUESTS.filter((r) => r.status === "pending");

  return (
    <div className="space-y-6 py-6">
      <PageHeader
        title="Dashboard"
        subtitle={`Ground handling overview · ${format(now, "EEEE d MMMM yyyy")}`}
      />

      {/* KPI tiles */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          icon={UserCheck}
          label="On shift today"
          value={onShiftToday.length}
          hint={`of ${ROSTER_STAFF.length} crew`}
          tone="text-emerald-600 dark:text-emerald-400"
        />
        <StatTile
          icon={Users}
          label="Off today"
          value={ROSTER_STAFF.length - onShiftToday.length}
          hint="resting / rostered off"
          tone="text-sky-600 dark:text-sky-400"
        />
        <StatTile
          icon={Clock}
          label="Shifts this week"
          value={weekShifts}
          hint="assigned across crew"
          tone="text-violet-600 dark:text-violet-400"
        />
        <StatTile
          icon={SunMedium}
          label="Leave to approve"
          value={pendingLeave.length}
          hint="awaiting your review"
          tone="text-amber-600 dark:text-amber-400"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        {/* Today's roster */}
        <Card className="gap-0 p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold">On shift today</h2>
            <Button asChild variant="ghost" size="sm" className="text-muted-foreground">
              <Link href="/rostering">
                Full roster <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
          <div className="mt-3 divide-y">
            {onShiftToday.length === 0 ? (
              <p className="py-6 text-sm text-muted-foreground">
                No crew rostered today.
              </p>
            ) : (
              onShiftToday.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center gap-3 py-2.5"
                >
                  <span
                    className={cn("size-2.5 shrink-0 rounded-full", ROLE_DOT[s.role])}
                    aria-hidden
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{s.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {s.jobTitle}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "rounded-md px-2 py-1 text-xs font-semibold tabular-nums",
                      ROLE_PILL[s.role]
                    )}
                  >
                    {s.shifts[todayIdx]}
                  </span>
                </div>
              ))
            )}
          </div>
        </Card>

        {/* Leave awaiting approval */}
        <Card className="h-fit gap-0 p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold">Leave requests</h2>
            <Button asChild variant="ghost" size="sm" className="text-muted-foreground">
              <Link href="/leave">
                All <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
          <div className="mt-3 space-y-3">
            {LEAVE_REQUESTS.slice(0, 4).map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between gap-2 rounded-lg border p-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{r.type}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {r.range} · {r.days} {r.days === 1 ? "day" : "days"}
                  </p>
                </div>
                {r.status === "pending" ? (
                  <div className="flex shrink-0 gap-1.5">
                    <Button
                      size="sm"
                      className="h-7 bg-emerald-600 px-2 text-white hover:bg-emerald-700"
                      onClick={() => toast.success(`${r.type} approved`)}
                    >
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 px-2"
                      onClick={() => toast(`${r.type} declined`)}
                    >
                      Decline
                    </Button>
                  </div>
                ) : (
                  <Badge
                    className={cn(
                      "shrink-0 border-transparent capitalize",
                      leaveStatusTone(r.status)
                    )}
                  >
                    {r.status}
                  </Badge>
                )}
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Quick links */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <QuickLink
          href="/rostering"
          icon={CalendarRange}
          label="Roster"
          description="Weekly duty roster"
        />
        <QuickLink
          href="/payslips"
          icon={Banknote}
          label="Payslips"
          description="Pay statements"
        />
        <QuickLink
          href="/leave"
          icon={PlaneTakeoff}
          label="Leave"
          description="Time-off requests"
        />
        <QuickLink
          href="/availability"
          icon={CalendarOff}
          label="Availability"
          description={`${AVAILABILITY_ENTRIES.length} off-days set`}
        />
      </div>
    </div>
  );
}

function StatTile({
  icon: Icon,
  label,
  value,
  hint,
  tone,
}: {
  icon: LucideIcon;
  label: string;
  value: number;
  hint: string;
  tone: string;
}) {
  return (
    <Card className="gap-0 p-5">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{label}</span>
        <Icon className={cn("size-4", tone)} />
      </div>
      <p className="mt-2 text-3xl font-bold tracking-tight tabular-nums">
        {value}
      </p>
      <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>
    </Card>
  );
}

function QuickLink({
  href,
  icon: Icon,
  label,
  description,
}: {
  href: string;
  icon: LucideIcon;
  label: string;
  description: string;
}) {
  return (
    <Link href={href}>
      <Card className="h-full flex-row items-center gap-3 p-4 transition-colors hover:border-primary/50">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted">
          <Icon className="size-5 text-muted-foreground" />
        </div>
        <div className="min-w-0">
          <p className="font-medium">{label}</p>
          <p className="truncate text-xs text-muted-foreground">{description}</p>
        </div>
      </Card>
    </Link>
  );
}
