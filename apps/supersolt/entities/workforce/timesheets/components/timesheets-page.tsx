"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, Clock, Loader2, MapPin } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import { cn } from "@workspace/ui/lib/utils";

import {
  timesheetsApi,
  type TimesheetEntryDto,
  type TimesheetPagePayload,
} from "@/entities/workforce/timesheets/api/endpoints";

type TimesheetsPageProps = {
  organisation: string;
  venue: string;
};

const VARIANCE_CLASS: Record<string, string> = {
  green: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
  amber: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  red: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
  black: "bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
};

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  open: "secondary",
  submitted: "outline",
  approved: "default",
  disputed: "destructive",
  locked: "default",
};

function formatTime(iso: string | null): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("en-AU", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(iso));
}

function formatCurrency(cents: number | null): string {
  if (cents == null) return "—";
  return `$${(cents / 100).toLocaleString("en-AU", { minimumFractionDigits: 2 })}`;
}

function getGeolocation(): Promise<{ lat: number; lng: number } | undefined> {
  if (typeof navigator === "undefined" || !navigator.geolocation) {
    return Promise.resolve(undefined);
  }
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve(undefined),
      { enableHighAccuracy: true, timeout: 8000 },
    );
  });
}

export function TimesheetsPage({ organisation, venue }: TimesheetsPageProps) {
  const [loading, setLoading] = useState(true);
  const [payload, setPayload] = useState<TimesheetPagePayload | null>(null);
  const [payPeriodId, setPayPeriodId] = useState<string | undefined>();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [clockBusy, setClockBusy] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await timesheetsApi.fetchPage(organisation, venue, payPeriodId);
      setPayload(data);
      if (!payPeriodId && data.currentPayPeriodId) {
        setPayPeriodId(data.currentPayPeriodId);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load timesheets");
    } finally {
      setLoading(false);
    }
  }, [organisation, venue, payPeriodId]);

  useEffect(() => {
    void load();
  }, [load]);

  const entries = useMemo(() => {
    const list = payload?.entries ?? [];
    if (statusFilter === "all") return list;
    if (statusFilter === "clean") {
      return list.filter((e) => e.varianceTier === "green" && e.status !== "approved");
    }
    if (statusFilter === "review") {
      return list.filter(
        (e) =>
          e.varianceTier !== "green" ||
          e.hasDispute ||
          e.isNoRoster ||
          (e.actualStartsAt == null && e.status !== "approved"),
      );
    }
    return list.filter((e) => e.status === statusFilter);
  }, [payload?.entries, statusFilter]);

  async function handleClockIn() {
    setClockBusy(true);
    try {
      const geo = payload?.settings.geolocationEnabled ? await getGeolocation() : undefined;
      await timesheetsApi.clockIn(organisation, venue, geo);
      toast.success("Clocked in");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Clock in failed");
    } finally {
      setClockBusy(false);
    }
  }

  async function handleClockOut() {
    setClockBusy(true);
    try {
      const geo = payload?.settings.geolocationEnabled ? await getGeolocation() : undefined;
      const result = await timesheetsApi.clockOut(organisation, venue, geo);
      toast.success(`Clocked out · ${result.hoursWorked.toFixed(2)} hrs`);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Clock out failed");
    } finally {
      setClockBusy(false);
    }
  }

  async function handleApprove(entry: TimesheetEntryDto) {
    try {
      await timesheetsApi.approve(organisation, venue, entry.id);
      toast.success("Timesheet approved");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Approve failed");
    }
  }

  async function handleBreakStart() {
    setClockBusy(true);
    try {
      await timesheetsApi.breakStart(organisation, venue);
      toast.success("Break started");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Break start failed");
    } finally {
      setClockBusy(false);
    }
  }

  async function handleBreakEnd() {
    setClockBusy(true);
    try {
      await timesheetsApi.breakEnd(organisation, venue);
      toast.success("Break ended");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Break end failed");
    } finally {
      setClockBusy(false);
    }
  }

  async function handleBulkApprove() {
    const ids = [...selected];
    if (ids.length === 0) return;
    try {
      const result = await timesheetsApi.bulkApprove(organisation, venue, ids);
      toast.success(`Approved ${result.approved} timesheets`);
      setSelected(new Set());
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Bulk approve failed");
    }
  }

  if (loading && !payload) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const isOperator = payload?.isOperator ?? false;
  const activeClock = payload?.activeClock;

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Timesheets</h1>
          <p className="text-sm text-muted-foreground">
            {isOperator
              ? "Review variance and approve hours for payroll."
              : "Clock in and out for your shifts."}
          </p>
        </div>
        {payload?.payPeriods?.length ? (
          <Select value={payPeriodId} onValueChange={setPayPeriodId}>
            <SelectTrigger className="w-full sm:w-[240px]">
              <SelectValue placeholder="Pay period" />
            </SelectTrigger>
            <SelectContent>
              {payload.payPeriods.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : null}
      </div>

      {!isOperator ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="size-5" />
              {activeClock ? "On shift" : "Ready to clock in"}
            </CardTitle>
            <CardDescription>
              {activeClock
                ? `Clocked in since ${formatTime(activeClock.startedAt)}`
                : "Tap when you arrive at the venue for your shift."}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 sm:flex-row">
            {!activeClock ? (
              <Button
                size="lg"
                className="min-h-11 flex-1 text-base"
                disabled={clockBusy}
                onClick={() => void handleClockIn()}
              >
                {clockBusy ? <Loader2 className="size-4 animate-spin" /> : "Clock in"}
              </Button>
            ) : (
              <>
                {activeClock.onBreak ? (
                  <Button
                    size="lg"
                    variant="outline"
                    className="min-h-11 flex-1 text-base"
                    disabled={clockBusy}
                    onClick={() => void handleBreakEnd()}
                  >
                    End break
                  </Button>
                ) : (
                  <Button
                    size="lg"
                    variant="outline"
                    className="min-h-11 flex-1 text-base"
                    disabled={clockBusy}
                    onClick={() => void handleBreakStart()}
                  >
                    Start break
                  </Button>
                )}
                <Button
                  size="lg"
                  variant="secondary"
                  className="min-h-11 flex-1 text-base"
                  disabled={clockBusy}
                  onClick={() => void handleClockOut()}
                >
                  {clockBusy ? <Loader2 className="size-4 animate-spin" /> : "Clock out"}
                </Button>
              </>
            )}
            {payload?.settings.geolocationEnabled ? (
              <p className="flex items-center gap-1 text-xs text-muted-foreground sm:self-center">
                <MapPin className="size-3.5" />
                Location verification enabled
              </p>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {isOperator && payload?.statusCounts ? (
        <div className="flex flex-wrap gap-2">
          {Object.entries(payload.statusCounts).map(([status, count]) => (
            <Badge key={status} variant={STATUS_VARIANT[status] ?? "secondary"}>
              {status}: {count}
            </Badge>
          ))}
        </div>
      ) : null}

      {isOperator ? (
        <div className="flex flex-wrap gap-2">
          {(["all", "clean", "review", "submitted", "disputed"] as const).map((f) => (
            <Button
              key={f}
              size="sm"
              variant={statusFilter === f ? "default" : "outline"}
              onClick={() => setStatusFilter(f)}
            >
              {f === "clean" ? "Clean matches" : f === "review" ? "Needs review" : f}
            </Button>
          ))}
          {selected.size > 0 ? (
            <Button size="sm" onClick={() => void handleBulkApprove()}>
              Approve selected ({selected.size})
            </Button>
          ) : null}
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>{isOperator ? "Team timesheets" : "Your timesheets"}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {entries.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">
              {isOperator
                ? "No timesheet activity this pay period."
                : "No shifts to clock in for. Check with your manager about your roster."}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  {isOperator ? <TableHead className="w-10" /> : null}
                  {isOperator ? <TableHead>Staff</TableHead> : null}
                  <TableHead>Date</TableHead>
                  <TableHead>Rostered</TableHead>
                  <TableHead>Actual</TableHead>
                  <TableHead>Hours</TableHead>
                  <TableHead>Pay</TableHead>
                  <TableHead>Status</TableHead>
                  {isOperator ? <TableHead className="text-right">Actions</TableHead> : null}
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((entry) => (
                  <TableRow key={entry.id}>
                    {isOperator ? (
                      <TableCell>
                        {entry.status !== "approved" && entry.status !== "locked" ? (
                          <input
                            type="checkbox"
                            checked={selected.has(entry.id)}
                            onChange={(e) => {
                              const next = new Set(selected);
                              if (e.target.checked) next.add(entry.id);
                              else next.delete(entry.id);
                              setSelected(next);
                            }}
                          />
                        ) : null}
                      </TableCell>
                    ) : null}
                    {isOperator ? <TableCell className="font-medium">{entry.staffName}</TableCell> : null}
                    <TableCell>{entry.workDate}</TableCell>
                    <TableCell>
                      {formatTime(entry.rosteredStartsAt)} – {formatTime(entry.rosteredEndsAt)}
                    </TableCell>
                    <TableCell>
                      {entry.actualStartsAt
                        ? `${formatTime(entry.actualStartsAt)} – ${formatTime(entry.actualEndsAt)}`
                        : "No clock"}
                    </TableCell>
                    <TableCell>
                      <span
                        className={cn(
                          "rounded px-1.5 py-0.5 text-xs font-medium",
                          VARIANCE_CLASS[entry.varianceTier],
                        )}
                      >
                        {entry.actualHours?.toFixed(2) ?? "—"} / {entry.rosteredHours.toFixed(2)}
                      </span>
                    </TableCell>
                    <TableCell>{formatCurrency(entry.grossPayCents)}</TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANT[entry.status] ?? "secondary"}>{entry.status}</Badge>
                    </TableCell>
                    {isOperator ? (
                      <TableCell className="text-right">
                        {entry.status !== "approved" && entry.status !== "locked" ? (
                          <Button size="sm" variant="ghost" onClick={() => void handleApprove(entry)}>
                            <Check className="size-4" />
                            Approve
                          </Button>
                        ) : null}
                      </TableCell>
                    ) : null}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
