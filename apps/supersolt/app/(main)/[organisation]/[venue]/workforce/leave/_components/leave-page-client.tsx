"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  Calendar,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  Clock3,
  Plus,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent } from "@workspace/ui/components/card";
import { Separator } from "@workspace/ui/components/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@workspace/ui/components/tabs";
import { cn } from "@workspace/ui/lib/utils";
import { buildScopedPath } from "@/lib/build-scoped-path";

type LeavePageClientProps = {
  organisation: string;
  venue: string;
};

type LeaveType = "annual" | "personal" | "unpaid" | "long_service" | "compassionate" | "other";
type LeaveStatus = "pending" | "approved" | "rejected" | "cancelled";

type LeaveRequest = {
  id: string;
  staffId: string;
  staffName: string;
  leaveType: LeaveType;
  status: LeaveStatus;
  startDate: string;
  endDate: string;
  reason?: string;
  rejectionReason?: string;
  createdAt: string;
};

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

const LEAVE_TYPE_LABELS: Record<LeaveType, string> = {
  annual: "Annual",
  personal: "Personal",
  unpaid: "Unpaid",
  long_service: "Long Service",
  compassionate: "Compassionate",
  other: "Other",
};

const LEAVE_TYPE_COLORS: Record<LeaveType, string> = {
  annual: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  personal: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
  unpaid: "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300",
  long_service: "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300",
  compassionate: "bg-pink-100 text-pink-800 dark:bg-pink-900/40 dark:text-pink-300",
  other: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
};

const LEAVE_STATUS_COLORS: Record<LeaveStatus, string> = {
  pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300",
  approved: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
  rejected: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
  cancelled: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
};

const LEAVE_STATUS_LABELS: Record<LeaveStatus, string> = {
  pending: "Pending",
  approved: "Approved",
  rejected: "Declined",
  cancelled: "Cancelled",
};

const SEED_LEAVE: LeaveRequest[] = [
  { id: "lr1", staffId: "s3", staffName: "Jordan Lee", leaveType: "annual", status: "pending", startDate: "2026-04-06", endDate: "2026-04-10", reason: "Family holiday to Queensland", createdAt: "2026-03-15" },
  { id: "lr2", staffId: "s5", staffName: "Liam Johnson", leaveType: "personal", status: "pending", startDate: "2026-03-25", endDate: "2026-03-25", reason: "Medical appointment", createdAt: "2026-03-18" },
  { id: "lr3", staffId: "s1", staffName: "Alex Chen", leaveType: "annual", status: "approved", startDate: "2026-04-20", endDate: "2026-04-24", reason: "Annual trip to Japan", createdAt: "2026-03-01" },
  { id: "lr4", staffId: "s4", staffName: "Mia Roberts", leaveType: "unpaid", status: "approved", startDate: "2026-03-31", endDate: "2026-04-02", reason: "Uni exams", createdAt: "2026-03-10" },
  { id: "lr5", staffId: "s8", staffName: "Olivia Kim", leaveType: "compassionate", status: "approved", startDate: "2026-03-21", endDate: "2026-03-22", createdAt: "2026-03-19" },
  { id: "lr6", staffId: "s2", staffName: "Sam Taylor", leaveType: "annual", status: "rejected", startDate: "2026-03-28", endDate: "2026-04-04", reason: "Wanted extended Easter break", rejectionReason: "Too many staff off during Easter period", createdAt: "2026-03-05" },
  { id: "lr7", staffId: "s6", staffName: "Emma Clark", leaveType: "personal", status: "cancelled", startDate: "2026-03-15", endDate: "2026-03-15", reason: "No longer needed", createdAt: "2026-03-12" },
];

function leaveDuration(startDate: string, endDate: string): number {
  const ms = new Date(endDate).getTime() - new Date(startDate).getTime();
  return Math.ceil(ms / 86_400_000) + 1;
}

function formatDateRange(startDate: string, endDate: string): string {
  const fmt = new Intl.DateTimeFormat("en-AU", { day: "numeric", month: "short", year: "numeric" });
  if (startDate === endDate) return fmt.format(new Date(startDate));
  const fmtShort = new Intl.DateTimeFormat("en-AU", { day: "numeric", month: "short" });
  return `${fmtShort.format(new Date(startDate))} – ${fmt.format(new Date(endDate))}`;
}

function getMonthDays(year: number, month: number) {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startPad = (firstDay.getDay() + 6) % 7;
  const days: (Date | null)[] = Array.from({ length: startPad }, () => null);
  for (let d = 1; d <= lastDay.getDate(); d++) {
    days.push(new Date(year, month, d));
  }
  return days;
}

function LeaveTypeBadge({ type }: { type: LeaveType }) {
  return (
    <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium", LEAVE_TYPE_COLORS[type])}>
      {LEAVE_TYPE_LABELS[type]}
    </span>
  );
}

function StatusBadge({ status }: { status: LeaveStatus }) {
  return (
    <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium", LEAVE_STATUS_COLORS[status])}>
      {LEAVE_STATUS_LABELS[status]}
    </span>
  );
}

export function LeavePageClient({ organisation, venue }: LeavePageClientProps) {
  const [calMonth, setCalMonth] = useState(() => new Date());
  const [showCalendar, setShowCalendar] = useState(true);

  const pendingLeave = SEED_LEAVE.filter((r) => r.status === "pending");
  const approvedLeave = SEED_LEAVE.filter((r) => r.status === "approved");
  const declinedLeave = SEED_LEAVE.filter((r) => r.status === "rejected" || r.status === "cancelled");

  const calendarDays = useMemo(
    () => getMonthDays(calMonth.getFullYear(), calMonth.getMonth()),
    [calMonth]
  );

  const calMonthLabel = useMemo(
    () => new Intl.DateTimeFormat("en-AU", { month: "long", year: "numeric" }).format(calMonth),
    [calMonth]
  );

  function getLeavesForDay(date: Date) {
    const dateStr = date.toISOString().slice(0, 10);
    return SEED_LEAVE.filter(
      (r) => r.status === "approved" && r.startDate <= dateStr && r.endDate >= dateStr
    );
  }

  const availabilityHref = buildScopedPath(organisation, venue, "workforce/availability");

  return (
    <section className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Leave</h1>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-x-2 gap-y-1.5">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground sm:text-sm">
            <span className="tabular-nums font-semibold text-foreground">{pendingLeave.length}</span>
            <span>pending</span>
            <span className="h-0.5 w-0.5 shrink-0 rounded-full bg-muted-foreground/70" aria-hidden />
            <span className="tabular-nums font-semibold text-foreground">{approvedLeave.length}</span>
            <span>approved</span>
          </div>
          <span className="h-0.5 w-0.5 shrink-0 rounded-full bg-muted-foreground/70" aria-hidden />
          <Button size="sm" className="gap-1.5" onClick={() => toast.info("Request leave dialog coming soon")}>
            <Plus className="h-3.5 w-3.5" />
            Request Leave
          </Button>
        </div>
      </div>

      <p className="shrink-0 text-xs text-muted-foreground sm:text-sm">
        {organisation} · {venue}
      </p>

      <Separator className="shrink-0" />

      <div className="flex w-full min-w-0 shrink-0 flex-wrap items-center gap-2">
        <Button variant="ghost" size="sm" className="h-8 gap-1 text-xs" asChild>
          <Link href={availabilityHref}>
            <Clock3 className="h-3.5 w-3.5 text-muted-foreground" />
            Staff availability
          </Link>
        </Button>
      </div>

      <div className="min-h-0 flex-1 overflow-auto overscroll-contain">
        <div className="flex flex-col gap-3 pb-1">
          <Card className="overflow-hidden shadow-sm">
            <div className="flex items-center gap-2 border-b border-border px-4 py-3">
              <CalendarDays className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold">Leave Requests</h2>
            </div>
            <Tabs defaultValue="pending" className="p-0">
              <div className="px-4 pt-3">
                <TabsList>
                  <TabsTrigger value="pending">
                    Pending
                    {pendingLeave.length > 0 ? (
                      <Badge variant="secondary" className="ml-1.5 h-4 px-1.5 text-[10px]">
                        {pendingLeave.length}
                      </Badge>
                    ) : null}
                  </TabsTrigger>
                  <TabsTrigger value="approved">Approved</TabsTrigger>
                  <TabsTrigger value="declined">Declined</TabsTrigger>
                </TabsList>
              </div>

              {(
                [
                  { key: "pending" as const, rows: pendingLeave },
                  { key: "approved" as const, rows: approvedLeave },
                  { key: "declined" as const, rows: declinedLeave },
                ] as const
              ).map(({ key, rows }) => (
                <TabsContent key={key} value={key} className="mt-0">
                  {rows.length === 0 ? (
                    <p className="px-4 py-6 text-center text-sm text-muted-foreground">
                      No {key} leave requests.
                    </p>
                  ) : (
                    <div className="mt-3 divide-y divide-border border-t border-border">
                      {rows.map((req) => {
                        const duration = leaveDuration(req.startDate, req.endDate);
                        return (
                          <button
                            key={req.id}
                            type="button"
                            className="w-full px-4 py-3 text-left transition-colors hover:bg-muted/40"
                            onClick={() => toast.info(`Leave detail: ${req.staffName}`)}
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium">{req.staffName}</span>
                                <LeaveTypeBadge type={req.leaveType} />
                                <StatusBadge status={req.status} />
                              </div>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <Clock className="h-3.5 w-3.5" />
                                <span>
                                  {duration} day{duration !== 1 ? "s" : ""}
                                </span>
                              </div>
                            </div>
                            <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                              <span>{formatDateRange(req.startDate, req.endDate)}</span>
                              {req.rejectionReason ? (
                                <span className="truncate text-red-600">
                                  Reason: {req.rejectionReason}
                                </span>
                              ) : null}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </TabsContent>
              ))}
            </Tabs>
          </Card>

          <Card className="hidden overflow-hidden shadow-sm md:block">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <h2 className="text-sm font-semibold">Calendar View</h2>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={() => setShowCalendar((v) => !v)}
              >
                {showCalendar ? "Hide" : "Show"}
              </Button>
            </div>
            {showCalendar ? (
              <CardContent className="p-4">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-semibold">{calMonthLabel}</h3>
                  <div className="flex gap-1">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() =>
                        setCalMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1))
                      }
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() =>
                        setCalMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1))
                      }
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-7 gap-px overflow-hidden rounded-lg border border-border bg-border">
                  {DAYS.map((d) => (
                    <div
                      key={d}
                      className="bg-muted/50 py-1.5 text-center text-xs font-medium text-muted-foreground"
                    >
                      {d}
                    </div>
                  ))}
                  {calendarDays.map((date, i) => {
                    if (!date) {
                      return <div key={`pad-${i}`} className="min-h-[60px] bg-background" />;
                    }
                    const leaves = getLeavesForDay(date);
                    const isCurrentMonth = date.getMonth() === calMonth.getMonth();
                    return (
                      <div
                        key={date.toISOString()}
                        className={cn("min-h-[60px] bg-background p-1", !isCurrentMonth && "opacity-40")}
                      >
                        <div className="mb-1 text-xs font-medium">{date.getDate()}</div>
                        <div className="space-y-0.5">
                          {leaves.slice(0, 3).map((req) => (
                            <div
                              key={req.id}
                              className={cn(
                                "truncate rounded px-1 py-0.5 text-[10px] font-medium",
                                LEAVE_TYPE_COLORS[req.leaveType]
                              )}
                              title={`${req.staffName} — ${LEAVE_TYPE_LABELS[req.leaveType]}`}
                            >
                              {req.staffName.split(" ")[0]}
                            </div>
                          ))}
                          {leaves.length > 3 ? (
                            <div className="px-1 text-[10px] text-muted-foreground">
                              +{leaves.length - 3} more
                            </div>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-3 flex flex-wrap gap-3">
                  {(Object.entries(LEAVE_TYPE_LABELS) as [LeaveType, string][]).map(
                    ([type, label]) => (
                      <div key={type} className="flex items-center gap-1.5">
                        <div className={cn("h-2.5 w-2.5 rounded-sm", LEAVE_TYPE_COLORS[type])} />
                        <span className="text-xs text-muted-foreground">{label}</span>
                      </div>
                    )
                  )}
                </div>
              </CardContent>
            ) : null}
          </Card>
        </div>
      </div>
    </section>
  );
}
