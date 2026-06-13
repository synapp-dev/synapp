"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Calendar,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  Clock3,
  Loader2,
  Plus,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent } from "@workspace/ui/components/card";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { Separator } from "@workspace/ui/components/separator";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@workspace/ui/components/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@workspace/ui/components/tabs";
import { Textarea } from "@workspace/ui/components/textarea";
import { cn } from "@workspace/ui/lib/utils";
import {
  leaveApi,
  type LeaveBalanceDto,
  type LeavePagePayload,
  type LeaveRequestDto,
} from "@/entities/workforce/leave/api/endpoints";
import { buildScopedPath } from "@/lib/build-scoped-path";

type LeavePageProps = {
  organisation: string;
  venue: string;
};

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300",
  approved: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
  rejected: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
  withdrawn: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  cancelled: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
};

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

function toIsoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function LeavePage({ organisation, venue }: LeavePageProps) {
  const [loading, setLoading] = useState(true);
  const [payload, setPayload] = useState<LeavePagePayload | null>(null);
  const [calMonth, setCalMonth] = useState(() => new Date());
  const [showCalendar, setShowCalendar] = useState(true);
  const [requestOpen, setRequestOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    leaveTypeId: "",
    startDate: "",
    endDate: "",
    reason: "",
    commentsToManager: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await leaveApi.fetchPage(organisation, venue);
      setPayload(data);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load leave");
    } finally {
      setLoading(false);
    }
  }, [organisation, venue]);

  useEffect(() => {
    void load();
  }, [load]);

  const requests = payload?.requests ?? [];
  const balances = payload?.balances ?? [];
  const isOperator = payload?.isOperator ?? false;

  const pendingLeave = requests.filter((r) => r.status === "pending");
  const approvedLeave = requests.filter((r) => r.status === "approved");
  const declinedLeave = requests.filter(
    (r) => r.status === "rejected" || r.status === "cancelled" || r.status === "withdrawn",
  );

  const calendarDays = useMemo(
    () => getMonthDays(calMonth.getFullYear(), calMonth.getMonth()),
    [calMonth],
  );

  const calMonthLabel = useMemo(
    () => new Intl.DateTimeFormat("en-AU", { month: "long", year: "numeric" }).format(calMonth),
    [calMonth],
  );

  function getLeavesForDay(date: Date) {
    const dateStr = toIsoDate(date);
    return approvedLeave.filter(
      (r) => r.startDate <= dateStr && r.endDate >= dateStr,
    );
  }

  async function handleSubmitRequest() {
    if (!form.leaveTypeId || !form.startDate || !form.endDate) {
      toast.error("Leave type and dates are required");
      return;
    }
    setSubmitting(true);
    try {
      await leaveApi.createRequest(organisation, venue, {
        leaveTypeId: form.leaveTypeId,
        startDate: form.startDate,
        endDate: form.endDate,
        reason: form.reason || undefined,
        commentsToManager: form.commentsToManager || undefined,
      });
      toast.success("Leave request submitted");
      setRequestOpen(false);
      setForm({ leaveTypeId: "", startDate: "", endDate: "", reason: "", commentsToManager: "" });
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to submit request");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleApprove(req: LeaveRequestDto, approved: boolean) {
    try {
      await leaveApi.decide(organisation, venue, req.id, {
        approved,
        reason: approved ? undefined : "Declined by manager",
        rosterResolution: approved ? { mode: "unassign_all" } : undefined,
      });
      toast.success(approved ? "Leave approved" : "Leave declined");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Action failed");
    }
  }

  const availabilityHref = buildScopedPath(organisation, venue, "workforce/availability");

  if (loading && !payload) {
    return (
      <div className="flex flex-1 items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        Loading leave…
      </div>
    );
  }

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
          <Button size="sm" className="gap-1.5" onClick={() => setRequestOpen(true)}>
            <Plus className="h-3.5 w-3.5" />
            Request Leave
          </Button>
        </div>
      </div>

      {balances.length > 0 ? (
        <div className="flex shrink-0 flex-wrap gap-2">
          {balances.slice(0, 4).map((b: LeaveBalanceDto) => (
            <Badge key={b.leaveTypeId} variant="secondary" className="text-xs">
              {b.name}: {b.currentBalanceHours}h ({b.currentBalanceDays}d)
            </Badge>
          ))}
        </div>
      ) : (
        <p className="shrink-0 text-xs text-muted-foreground">
          No leave balances yet — accrual starts when timesheets are approved.
        </p>
      )}

      <div className="flex w-full min-w-0 shrink-0 flex-wrap items-center gap-2">
        <Button variant="ghost" size="sm" className="h-8 gap-1 text-xs" asChild>
          <Link href={availabilityHref}>
            <Clock3 className="h-3.5 w-3.5 text-muted-foreground" />
            Staff availability
          </Link>
        </Button>
      </div>

      <Separator className="shrink-0" />

      <div className="min-h-0 flex-1 overflow-auto overscroll-contain">
        <div className="flex flex-col gap-3 pb-1">
          <Card className="overflow-hidden shadow-sm">
            <div className="flex items-center gap-2 border-b border-border px-4 py-3">
              <CalendarDays className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold">
                {isOperator ? "Leave Requests" : "My leave"}
              </h2>
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
                          <div key={req.id} className="w-full px-4 py-3">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="flex flex-wrap items-center gap-2">
                                {isOperator ? (
                                  <span className="text-sm font-medium">{req.staffName}</span>
                                ) : null}
                                <span className="text-sm font-medium">{req.calendarLabel}</span>
                                <span
                                  className={cn(
                                    "inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize",
                                    STATUS_COLORS[req.status] ?? STATUS_COLORS.pending,
                                  )}
                                >
                                  {req.status}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <Clock className="h-3.5 w-3.5" />
                                <span>
                                  {duration} day{duration !== 1 ? "s" : ""}
                                </span>
                              </div>
                            </div>
                            <div className="mt-1 text-xs text-muted-foreground">
                              {formatDateRange(req.startDate, req.endDate)}
                              {req.decisionReason ? (
                                <span className="ml-2 text-red-600">— {req.decisionReason}</span>
                              ) : null}
                            </div>
                            {isOperator && req.status === "pending" ? (
                              <div className="mt-2 flex gap-2">
                                <Button size="sm" variant="default" onClick={() => void handleApprove(req, true)}>
                                  Approve
                                </Button>
                                <Button size="sm" variant="outline" onClick={() => void handleApprove(req, false)}>
                                  Decline
                                </Button>
                              </div>
                            ) : null}
                            {!isOperator && req.status === "pending" ? (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="mt-2 h-7 text-xs"
                                onClick={() =>
                                  void leaveApi.withdraw(organisation, venue, req.id).then(load).then(() =>
                                    toast.success("Request withdrawn"),
                                  )
                                }
                              >
                                Withdraw
                              </Button>
                            ) : null}
                          </div>
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
                              className="truncate rounded bg-blue-100 px-1 py-0.5 text-[10px] font-medium text-blue-800 dark:bg-blue-900/40 dark:text-blue-300"
                              title={req.staffName}
                            >
                              {isOperator ? req.staffName.split(" ")[0] : req.calendarLabel}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            ) : null}
          </Card>
        </div>
      </div>

      <Sheet open={requestOpen} onOpenChange={setRequestOpen}>
        <SheetContent className="overflow-y-auto sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Request leave</SheetTitle>
          </SheetHeader>
          <div className="mt-4 space-y-4">
            <div className="space-y-2">
              <Label>Leave type</Label>
              <Select
                value={form.leaveTypeId}
                onValueChange={(v) => setForm((f) => ({ ...f, leaveTypeId: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {balances.map((b) => (
                    <SelectItem key={b.leaveTypeId} value={b.leaveTypeId}>
                      {b.name} ({b.currentBalanceHours}h available)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="leave-start">Start date</Label>
                <Input
                  id="leave-start"
                  type="date"
                  value={form.startDate}
                  onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="leave-end">End date</Label>
                <Input
                  id="leave-end"
                  type="date"
                  value={form.endDate}
                  onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="leave-reason">Reason (optional)</Label>
              <Textarea
                id="leave-reason"
                value={form.reason}
                onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="leave-comments">Comments to manager</Label>
              <Textarea
                id="leave-comments"
                value={form.commentsToManager}
                onChange={(e) => setForm((f) => ({ ...f, commentsToManager: e.target.value }))}
                rows={2}
              />
            </div>
          </div>
          <SheetFooter className="mt-6">
            <Button onClick={() => void handleSubmitRequest()} disabled={submitting}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Submit request"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </section>
  );
}
