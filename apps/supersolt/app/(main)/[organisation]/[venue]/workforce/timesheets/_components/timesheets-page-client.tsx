"use client";

import { useMemo, useState } from "react";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  DollarSign,
  FileCheck,
  MoreVertical,
  X,
} from "lucide-react";
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

type TimesheetsPageClientProps = {
  organisation: string;
  venue: string;
};

type TimesheetStatus = "pending" | "approved" | "rejected";
type StatusFilter = "all" | TimesheetStatus;

type TimesheetEntry = {
  id: string;
  staffName: string;
  date: string;
  dayLabel: string;
  clockIn: string;
  clockOut: string;
  breakMins: number;
  totalHours: number;
  scheduled: string;
  scheduledHours: number;
  grossPay: number;
  status: TimesheetStatus;
};

const STATUS_BADGE: Record<TimesheetStatus, { label: string; variant: "default" | "secondary" | "destructive" }> = {
  pending: { label: "Pending", variant: "secondary" },
  approved: { label: "Approved", variant: "default" },
  rejected: { label: "Rejected", variant: "destructive" },
};

const SEED_TIMESHEETS: TimesheetEntry[] = [
  { id: "ts1", staffName: "Alex Chen", date: "2026-03-16", dayLabel: "Mon, 16 Mar", clockIn: "6:02 AM", clockOut: "2:15 PM", breakMins: 30, totalHours: 7.72, scheduled: "06:00–14:00", scheduledHours: 7.5, grossPay: 27020, status: "approved" },
  { id: "ts2", staffName: "Sam Taylor", date: "2026-03-16", dayLabel: "Mon, 16 Mar", clockIn: "6:58 AM", clockOut: "3:05 PM", breakMins: 30, totalHours: 7.62, scheduled: "07:00–15:00", scheduledHours: 7.5, grossPay: 24384, status: "approved" },
  { id: "ts3", staffName: "Olivia Kim", date: "2026-03-16", dayLabel: "Mon, 16 Mar", clockIn: "7:55 AM", clockOut: "4:10 PM", breakMins: 30, totalHours: 7.75, scheduled: "08:00–16:00", scheduledHours: 7.5, grossPay: 31000, status: "approved" },
  { id: "ts4", staffName: "Jordan Lee", date: "2026-03-16", dayLabel: "Mon, 16 Mar", clockIn: "10:05 AM", clockOut: "6:00 PM", breakMins: 30, totalHours: 7.42, scheduled: "10:00–18:00", scheduledHours: 7.5, grossPay: 20776, status: "approved" },
  { id: "ts5", staffName: "Noah Patel", date: "2026-03-16", dayLabel: "Mon, 16 Mar", clockIn: "2:10 PM", clockOut: "10:25 PM", breakMins: 30, totalHours: 7.75, scheduled: "14:00–22:00", scheduledHours: 7.5, grossPay: 21700, status: "pending" },
  { id: "ts6", staffName: "Alex Chen", date: "2026-03-17", dayLabel: "Tue, 17 Mar", clockIn: "5:55 AM", clockOut: "2:30 PM", breakMins: 30, totalHours: 8.08, scheduled: "06:00–14:00", scheduledHours: 7.5, grossPay: 28280, status: "pending" },
  { id: "ts7", staffName: "Sam Taylor", date: "2026-03-17", dayLabel: "Tue, 17 Mar", clockIn: "1:50 PM", clockOut: "10:20 PM", breakMins: 30, totalHours: 8.0, scheduled: "14:00–22:00", scheduledHours: 7.5, grossPay: 25600, status: "pending" },
  { id: "ts8", staffName: "Olivia Kim", date: "2026-03-17", dayLabel: "Tue, 17 Mar", clockIn: "8:00 AM", clockOut: "4:00 PM", breakMins: 30, totalHours: 7.5, scheduled: "08:00–16:00", scheduledHours: 7.5, grossPay: 30000, status: "pending" },
  { id: "ts9", staffName: "Mia Roberts", date: "2026-03-17", dayLabel: "Tue, 17 Mar", clockIn: "11:00 AM", clockOut: "3:10 PM", breakMins: 0, totalHours: 4.17, scheduled: "11:00–15:00", scheduledHours: 4.0, grossPay: 10842, status: "pending" },
  { id: "ts10", staffName: "Alex Chen", date: "2026-03-18", dayLabel: "Wed, 18 Mar", clockIn: "6:00 AM", clockOut: "2:00 PM", breakMins: 30, totalHours: 7.5, scheduled: "06:00–14:00", scheduledHours: 7.5, grossPay: 26250, status: "pending" },
  { id: "ts11", staffName: "Jordan Lee", date: "2026-03-18", dayLabel: "Wed, 18 Mar", clockIn: "10:10 AM", clockOut: "6:30 PM", breakMins: 30, totalHours: 7.83, scheduled: "10:00–18:00", scheduledHours: 7.5, grossPay: 21924, status: "pending" },
  { id: "ts12", staffName: "Olivia Kim", date: "2026-03-18", dayLabel: "Wed, 18 Mar", clockIn: "8:05 AM", clockOut: "4:00 PM", breakMins: 30, totalHours: 7.42, scheduled: "08:00–16:00", scheduledHours: 7.5, grossPay: 29680, status: "pending" },
  { id: "ts13", staffName: "Mia Roberts", date: "2026-03-18", dayLabel: "Wed, 18 Mar", clockIn: "5:00 PM", clockOut: "10:15 PM", breakMins: 0, totalHours: 5.25, scheduled: "17:00–22:00", scheduledHours: 5.0, grossPay: 13650, status: "rejected" },
];

function formatCurrency(cents: number): string {
  return `$${(cents / 100).toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function getWeekLabel(offset: number): string {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diff + offset * 7);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const fmt = new Intl.DateTimeFormat("en-AU", { day: "numeric", month: "short" });
  return `${fmt.format(monday)} – ${fmt.format(sunday)}`;
}

export function TimesheetsPageClient({ organisation, venue }: TimesheetsPageClientProps) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [weekOffset, setWeekOffset] = useState(0);

  const weekLabel = useMemo(() => getWeekLabel(weekOffset), [weekOffset]);

  const filtered = useMemo(() => {
    if (statusFilter === "all") return SEED_TIMESHEETS;
    return SEED_TIMESHEETS.filter((ts) => ts.status === statusFilter);
  }, [statusFilter]);

  const metrics = useMemo(() => {
    const pending = SEED_TIMESHEETS.filter((ts) => ts.status === "pending");
    const approved = SEED_TIMESHEETS.filter((ts) => ts.status === "approved");
    const totalHours = SEED_TIMESHEETS.reduce((sum, ts) => sum + ts.totalHours, 0);
    const totalPay = approved.reduce((sum, ts) => sum + ts.grossPay, 0);
    return {
      totalCount: SEED_TIMESHEETS.length,
      pendingCount: pending.length,
      approvedCount: approved.length,
      totalHours,
      totalPay,
    };
  }, []);

  return (
    <section className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Timesheets</h1>
          <p className="text-sm text-muted-foreground">
            {organisation} &middot; {venue}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => setWeekOffset((w) => w - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 min-w-[180px] text-xs font-medium"
              onClick={() => setWeekOffset(0)}
            >
              {weekLabel}
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => setWeekOffset((w) => w + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
            <SelectTrigger className="h-8 w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
          {metrics.pendingCount > 0 ? (
            <Button
              size="sm"
              className="gap-1.5"
              onClick={() => toast.info(`Approve all ${metrics.pendingCount} pending`)}
            >
              <FileCheck className="h-3.5 w-3.5" />
              Approve All ({metrics.pendingCount})
            </Button>
          ) : null}
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid gap-3 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase tracking-wider">Total Hours</CardDescription>
            <CardTitle className="text-3xl">{metrics.totalHours.toFixed(1)}h</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase tracking-wider">Total Pay</CardDescription>
            <CardTitle className="text-3xl">{formatCurrency(metrics.totalPay)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase tracking-wider">Entries</CardDescription>
            <CardTitle className="text-3xl">{metrics.totalCount}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Secondary stats */}
      <div className="flex flex-wrap gap-2">
        <Badge variant="outline" className="gap-1 text-xs">
          Pending: {metrics.pendingCount}
        </Badge>
        <Badge variant="outline" className="gap-1 text-xs">
          Approved: {metrics.approvedCount}
        </Badge>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-2 py-12 text-center">
            <Clock className="h-10 w-10 text-muted-foreground/50" />
            <p className="font-semibold">No timesheet entries found</p>
            <p className="text-sm text-muted-foreground">
              {SEED_TIMESHEETS.length === 0
                ? "Time entries will appear when staff clock in."
                : "Adjust filters to see more entries."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="px-0 py-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="text-xs font-medium uppercase tracking-wider">Staff</TableHead>
                  <TableHead className="text-xs font-medium uppercase tracking-wider">Date</TableHead>
                  <TableHead className="text-xs font-medium uppercase tracking-wider">Clock In</TableHead>
                  <TableHead className="text-xs font-medium uppercase tracking-wider">Clock Out</TableHead>
                  <TableHead className="text-xs font-medium uppercase tracking-wider">Break</TableHead>
                  <TableHead className="text-right text-xs font-medium uppercase tracking-wider">Hours</TableHead>
                  <TableHead className="text-xs font-medium uppercase tracking-wider">Scheduled</TableHead>
                  <TableHead className="text-xs font-medium uppercase tracking-wider">Variance</TableHead>
                  <TableHead className="text-right text-xs font-medium uppercase tracking-wider">Pay</TableHead>
                  <TableHead className="text-xs font-medium uppercase tracking-wider">Status</TableHead>
                  <TableHead className="w-[80px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((ts) => {
                  const variance = ts.totalHours - ts.scheduledHours;
                  return (
                    <TableRow key={ts.id}>
                      <TableCell className="font-medium">{ts.staffName}</TableCell>
                      <TableCell>{ts.dayLabel}</TableCell>
                      <TableCell>{ts.clockIn}</TableCell>
                      <TableCell>{ts.clockOut}</TableCell>
                      <TableCell>{ts.breakMins}m</TableCell>
                      <TableCell className="text-right font-medium tabular-nums">
                        {ts.totalHours.toFixed(2)}h
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{ts.scheduled}</TableCell>
                      <TableCell>
                        <span
                          className={cn(
                            "text-xs font-medium",
                            Math.abs(variance) <= 0.25
                              ? "text-green-600"
                              : Math.abs(variance) <= 0.75
                                ? "text-amber-600"
                                : "text-red-600"
                          )}
                        >
                          {variance >= 0 ? "+" : ""}
                          {variance.toFixed(1)}h
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-semibold tabular-nums">
                        {formatCurrency(ts.grossPay)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={STATUS_BADGE[ts.status].variant}>
                          {STATUS_BADGE[ts.status].label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {ts.status === "pending" ? (
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-green-600 hover:bg-green-50 hover:text-green-700"
                              onClick={() => toast.success(`${ts.staffName} approved`)}
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-red-600 hover:bg-red-50 hover:text-red-700"
                              onClick={() => toast.success(`${ts.staffName} rejected`)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => toast.info("Actions menu")}
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </section>
  );
}
