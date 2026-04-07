"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  Calendar,
  ChevronDown,
  ChevronRight,
  Clock,
  Download,
  FileSpreadsheet,
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

type PayrollExportPageClientProps = {
  organisation: string;
  venue: string;
};

type PayrollPeriod = "this-week" | "last-week" | "this-fortnight" | "this-month";
type ExportFormat = "xero" | "keypay" | "myob" | "csv";

type StaffRole = "manager" | "supervisor" | "crew";

type StaffMember = {
  id: string;
  name: string;
  role: StaffRole;
  hourlyRateCents: number;
  status: "active" | "inactive";
};

type TimesheetStatus = "pending" | "approved" | "rejected";

type Timesheet = {
  id: string;
  staffId: string;
  date: string; // yyyy-mm-dd
  totalHours: number;
  grossPayCents: number;
  status: TimesheetStatus;
};

type PenaltyType =
  | "none"
  | "saturday"
  | "sunday"
  | "public_holiday"
  | "evening"
  | "late_night"
  | "early_morning";

type RosterShift = {
  id: string;
  staffId: string;
  date: string; // yyyy-mm-dd
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  breakMins: number;
  totalHours: number;
  status: "confirmed" | "draft" | "cancelled";
  penaltyType: PenaltyType;
  penaltyMultiplier: number;
  baseCostCents: number;
  penaltyCostCents: number;
  totalCostCents: number;
};

type DateRange = { start: Date; end: Date };

function formatCurrency(cents: number): string {
  return `$${(cents / 100).toLocaleString("en-AU", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function toIsoDate(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function parseIsoDate(s: string): Date {
  const parts = s.split("-").map((v) => Number(v));
  const y = parts[0] ?? 0;
  const m = parts[1] ?? 1;
  const d = parts[2] ?? 1;
  return new Date(y, m - 1, d);
}

function startOfWeekMonday(d: Date): Date {
  const day = d.getDay(); // 0=Sun
  const diff = day === 0 ? -6 : 1 - day;
  const out = new Date(d);
  out.setHours(0, 0, 0, 0);
  out.setDate(out.getDate() + diff);
  return out;
}

function endOfWeekMonday(d: Date): Date {
  const start = startOfWeekMonday(d);
  const out = new Date(start);
  out.setDate(out.getDate() + 6);
  out.setHours(23, 59, 59, 999);
  return out;
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0);
}

function endOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
}

function addDays(d: Date, days: number): Date {
  const out = new Date(d);
  out.setDate(out.getDate() + days);
  return out;
}

function isWithinInterval(d: Date, r: DateRange): boolean {
  return d.getTime() >= r.start.getTime() && d.getTime() <= r.end.getTime();
}

function formatRangeLabel(r: DateRange): string {
  const fmt = new Intl.DateTimeFormat("en-AU", { day: "numeric", month: "short" });
  const fmtEnd = new Intl.DateTimeFormat("en-AU", { day: "numeric", month: "short", year: "numeric" });
  return `${fmt.format(r.start)} - ${fmtEnd.format(r.end)}`;
}

function downloadCsv(filename: string, content: string): void {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const PENALTY_LABELS: Record<PenaltyType, string> = {
  none: "Base Rate",
  saturday: "Saturday Loading (125%)",
  sunday: "Sunday Loading (150%)",
  public_holiday: "Public Holiday (250%)",
  evening: "Evening Loading (115%)",
  late_night: "Late Night Loading (125%)",
  early_morning: "Early Morning Loading (115%)",
};

const SEED_STAFF: StaffMember[] = [
  { id: "s1", name: "Alex Chen", role: "manager", hourlyRateCents: 3800, status: "active" },
  { id: "s2", name: "Olivia Kim", role: "supervisor", hourlyRateCents: 4000, status: "active" },
  { id: "s3", name: "Sam Taylor", role: "crew", hourlyRateCents: 3200, status: "active" },
  { id: "s4", name: "Jordan Lee", role: "crew", hourlyRateCents: 2800, status: "active" },
  { id: "s5", name: "Mia Roberts", role: "crew", hourlyRateCents: 2600, status: "active" },
  { id: "s6", name: "Noah Patel", role: "crew", hourlyRateCents: 2800, status: "active" },
];

// Seed data spans late Feb → mid March so period selector has content.
const SEED_TIMESHEETS: Timesheet[] = [
  { id: "t1", staffId: "s1", date: "2026-03-10", totalHours: 7.5, grossPayCents: 28500, status: "approved" },
  { id: "t2", staffId: "s1", date: "2026-03-11", totalHours: 7.6, grossPayCents: 28880, status: "approved" },
  { id: "t3", staffId: "s2", date: "2026-03-10", totalHours: 7.5, grossPayCents: 30000, status: "approved" },
  { id: "t4", staffId: "s2", date: "2026-03-12", totalHours: 7.9, grossPayCents: 31600, status: "approved" },
  { id: "t5", staffId: "s3", date: "2026-03-10", totalHours: 7.5, grossPayCents: 24000, status: "approved" },
  { id: "t6", staffId: "s3", date: "2026-03-14", totalHours: 8.0, grossPayCents: 25600, status: "pending" },
  { id: "t7", staffId: "s4", date: "2026-03-11", totalHours: 7.5, grossPayCents: 21000, status: "approved" },
  { id: "t8", staffId: "s5", date: "2026-03-12", totalHours: 5.0, grossPayCents: 13000, status: "approved" },
  { id: "t9", staffId: "s6", date: "2026-03-13", totalHours: 7.5, grossPayCents: 21000, status: "approved" },
  { id: "t10", staffId: "s6", date: "2026-02-27", totalHours: 7.5, grossPayCents: 21000, status: "approved" },
];

const SEED_ROSTER_SHIFTS: RosterShift[] = [
  {
    id: "r1",
    staffId: "s1",
    date: "2026-03-10",
    startTime: "06:00",
    endTime: "14:00",
    breakMins: 30,
    totalHours: 7.5,
    status: "confirmed",
    penaltyType: "none",
    penaltyMultiplier: 1,
    baseCostCents: 28500,
    penaltyCostCents: 0,
    totalCostCents: 28500,
  },
  {
    id: "r2",
    staffId: "s2",
    date: "2026-03-12",
    startTime: "16:00",
    endTime: "00:00",
    breakMins: 30,
    totalHours: 7.5,
    status: "confirmed",
    penaltyType: "late_night",
    penaltyMultiplier: 1.25,
    baseCostCents: 30000,
    penaltyCostCents: 7500,
    totalCostCents: 37500,
  },
  {
    id: "r3",
    staffId: "s3",
    date: "2026-03-14",
    startTime: "14:00",
    endTime: "22:00",
    breakMins: 30,
    totalHours: 7.5,
    status: "confirmed",
    penaltyType: "saturday",
    penaltyMultiplier: 1.25,
    baseCostCents: 24000,
    penaltyCostCents: 6000,
    totalCostCents: 30000,
  },
  {
    id: "r4",
    staffId: "s4",
    date: "2026-03-11",
    startTime: "10:00",
    endTime: "18:00",
    breakMins: 30,
    totalHours: 7.5,
    status: "confirmed",
    penaltyType: "none",
    penaltyMultiplier: 1,
    baseCostCents: 21000,
    penaltyCostCents: 0,
    totalCostCents: 21000,
  },
  {
    id: "r5",
    staffId: "s5",
    date: "2026-03-12",
    startTime: "11:00",
    endTime: "16:30",
    breakMins: 30,
    totalHours: 5.0,
    status: "confirmed",
    penaltyType: "evening",
    penaltyMultiplier: 1.15,
    baseCostCents: 13000,
    penaltyCostCents: 1950,
    totalCostCents: 14950,
  },
  {
    id: "r6",
    staffId: "s6",
    date: "2026-02-27",
    startTime: "06:00",
    endTime: "14:00",
    breakMins: 30,
    totalHours: 7.5,
    status: "confirmed",
    penaltyType: "none",
    penaltyMultiplier: 1,
    baseCostCents: 21000,
    penaltyCostCents: 0,
    totalCostCents: 21000,
  },
];

type PenaltyLine = {
  type: PenaltyType;
  label: string;
  hours: number;
  baseCostCents: number;
  penaltyCostCents: number;
  totalCostCents: number;
  multiplier: number;
};

function makeScopedPath(organisation: string, venue: string, suffix: string): string {
  const clean = suffix.startsWith("/") ? suffix.slice(1) : suffix;
  return `/${organisation}/${venue}/${clean}`;
}

export function PayrollExportPageClient({ organisation, venue }: PayrollExportPageClientProps) {
  const [period, setPeriod] = useState<PayrollPeriod>("this-week");
  const [exportFormat, setExportFormat] = useState<ExportFormat>("csv");
  const [expandedStaff, setExpandedStaff] = useState<Set<string>>(() => new Set());

  const dateRange = useMemo<DateRange>(() => {
    const now = new Date();
    switch (period) {
      case "this-week": {
        return { start: startOfWeekMonday(now), end: endOfWeekMonday(now) };
      }
      case "last-week": {
        const lastWeek = addDays(now, -7);
        return { start: startOfWeekMonday(lastWeek), end: endOfWeekMonday(lastWeek) };
      }
      case "this-fortnight": {
        const twoWeeksAgo = addDays(now, -7);
        return { start: startOfWeekMonday(twoWeeksAgo), end: endOfWeekMonday(now) };
      }
      case "this-month": {
        return { start: startOfMonth(now), end: endOfMonth(now) };
      }
      default: {
        const _exhaustive: never = period;
        return _exhaustive;
      }
    }
  }, [period]);

  const approvedTimesheets = useMemo(() => {
    return SEED_TIMESHEETS.filter((ts) => {
      if (ts.status !== "approved") return false;
      const tsDate = parseIsoDate(ts.date);
      return isWithinInterval(tsDate, dateRange);
    });
  }, [dateRange]);

  const pendingCount = useMemo(() => {
    return SEED_TIMESHEETS.filter((ts) => {
      if (ts.status !== "pending") return false;
      const tsDate = parseIsoDate(ts.date);
      return isWithinInterval(tsDate, dateRange);
    }).length;
  }, [dateRange]);

  const staffBreakdown = useMemo(() => {
    const activeStaff = SEED_STAFF.filter((s) => s.status === "active");

    return activeStaff
      .map((s) => {
        const staffTimesheets = approvedTimesheets.filter((ts) => ts.staffId === s.id);
        const actualHours = staffTimesheets.reduce((sum, ts) => sum + ts.totalHours, 0);
        const grossPayCents = staffTimesheets.reduce((sum, ts) => sum + ts.grossPayCents, 0);

        const rosteredShifts = SEED_ROSTER_SHIFTS.filter((shift) => {
          const shiftDate = parseIsoDate(shift.date);
          return (
            shift.staffId === s.id &&
            shift.status !== "cancelled" &&
            isWithinInterval(shiftDate, dateRange)
          );
        });
        const rosteredHours = rosteredShifts.reduce((sum, shift) => sum + shift.totalHours, 0);

        const penaltyMap: Partial<Record<PenaltyType, PenaltyLine>> = {};
        let totalBaseCostCents = 0;
        let totalPenaltyCostCents = 0;

        for (const shift of rosteredShifts) {
          totalBaseCostCents += shift.baseCostCents;
          totalPenaltyCostCents += shift.penaltyCostCents;

          const key = shift.penaltyType;
          const existing = penaltyMap[key];
          if (!existing) {
            penaltyMap[key] = {
              type: key,
              label: PENALTY_LABELS[key],
              hours: 0,
              baseCostCents: 0,
              penaltyCostCents: 0,
              totalCostCents: 0,
              multiplier: shift.penaltyMultiplier,
            };
          }

          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          const line = penaltyMap[key]!;
          line.hours += shift.totalHours;
          line.baseCostCents += shift.baseCostCents;
          line.penaltyCostCents += shift.penaltyCostCents;
          line.totalCostCents += shift.totalCostCents;
        }

        const penaltyLines = Object.values(penaltyMap)
          .filter((v): v is PenaltyLine => Boolean(v))
          .sort((a, b) => {
            if (a.type === "none") return -1;
            if (b.type === "none") return 1;
            return b.totalCostCents - a.totalCostCents;
          });

        const superAmountCents = Math.round(grossPayCents * 0.115);
        const variance = actualHours - rosteredHours;

        return {
          id: s.id,
          name: s.name,
          role: s.role,
          hourlyRateCents: s.hourlyRateCents,
          rosteredHours,
          actualHours,
          variance,
          grossPayCents,
          baseCostCents: totalBaseCostCents,
          penaltyCostCents: totalPenaltyCostCents,
          penaltyLines,
          superAmountCents,
          totalCents: grossPayCents + superAmountCents,
          entryCount: staffTimesheets.length,
        };
      })
      .filter((row) => row.entryCount > 0 || row.rosteredHours > 0)
      .sort((a, b) => b.actualHours - a.actualHours);
  }, [approvedTimesheets, dateRange]);

  const totals = useMemo(() => {
    return {
      rosteredHours: staffBreakdown.reduce((sum, s) => sum + s.rosteredHours, 0),
      actualHours: staffBreakdown.reduce((sum, s) => sum + s.actualHours, 0),
      grossPayCents: staffBreakdown.reduce((sum, s) => sum + s.grossPayCents, 0),
      superAmountCents: staffBreakdown.reduce((sum, s) => sum + s.superAmountCents, 0),
      totalCents: staffBreakdown.reduce((sum, s) => sum + s.totalCents, 0),
      staffCount: staffBreakdown.length,
      penaltyCostCents: staffBreakdown.reduce((sum, s) => sum + s.penaltyCostCents, 0),
    };
  }, [staffBreakdown]);

  function toggleExpand(id: string): void {
    setExpandedStaff((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleExport(): void {
    if (staffBreakdown.length === 0) {
      toast.error("No approved timesheets to export");
      return;
    }

    const periodLabel = `${toIsoDate(dateRange.start)}_${toIsoDate(dateRange.end)}`;
    const startIso = toIsoDate(dateRange.start);
    const endIso = toIsoDate(dateRange.end);

    let csvContent = "";
    switch (exportFormat) {
      case "xero": {
        csvContent = [
          "Employee Name,Pay Period Start,Pay Period End,Ordinary Hours,Gross Pay,Superannuation",
          ...staffBreakdown.map(
            (s) =>
              `"${s.name}",${startIso},${endIso},${s.actualHours.toFixed(2)},${(s.grossPayCents / 100).toFixed(
                2
              )},${(s.superAmountCents / 100).toFixed(2)}`
          ),
        ].join("\n");
        break;
      }
      case "keypay": {
        csvContent = [
          "Employee,Hours,Rate,Gross,Super",
          ...staffBreakdown.map(
            (s) =>
              `"${s.name}",${s.actualHours.toFixed(2)},${(s.hourlyRateCents / 100).toFixed(2)},${(
                s.grossPayCents / 100
              ).toFixed(2)},${(s.superAmountCents / 100).toFixed(2)}`
          ),
        ].join("\n");
        break;
      }
      case "myob": {
        const fmt = new Intl.DateTimeFormat("en-AU", { day: "2-digit", month: "2-digit", year: "numeric" });
        csvContent = [
          "Co./Last Name,First Name,Pay Period,Hours,Gross Pay,Super Guarantee",
          ...staffBreakdown.map((s) => {
            const parts = s.name.split(" ");
            const lastName = parts.slice(-1).join(" ");
            const firstName = parts.slice(0, -1).join(" ");
            const period = `${fmt.format(dateRange.start)} - ${fmt.format(dateRange.end)}`;
            return `"${lastName}","${firstName}","${period}",${s.actualHours.toFixed(2)},${(s.grossPayCents / 100).toFixed(
              2
            )},${(s.superAmountCents / 100).toFixed(2)}`;
          }),
        ].join("\n");
        break;
      }
      case "csv": {
        csvContent = [
          "Staff Name,Role,Rostered Hours,Actual Hours,Variance,Hourly Rate,Base Pay,Penalty Loading,Gross Pay,Super (11.5%),Total",
          ...staffBreakdown.map(
            (s) =>
              `"${s.name}","${s.role}",${s.rosteredHours.toFixed(2)},${s.actualHours.toFixed(2)},${s.variance.toFixed(
                2
              )},${(s.hourlyRateCents / 100).toFixed(2)},${(s.baseCostCents / 100).toFixed(2)},${(
                s.penaltyCostCents / 100
              ).toFixed(2)},${(s.grossPayCents / 100).toFixed(2)},${(s.superAmountCents / 100).toFixed(2)},${(
                s.totalCents / 100
              ).toFixed(2)}`
          ),
        ].join("\n");
        break;
      }
      default: {
        const _exhaustive: never = exportFormat;
        csvContent = _exhaustive;
      }
    }

    downloadCsv(`payroll-${exportFormat}-${periodLabel}.csv`, csvContent);
    toast.success(`Exported ${staffBreakdown.length} staff to ${exportFormat.toUpperCase()} format`);
  }

  const scopedTimesheetsHref = makeScopedPath(organisation, venue, "workforce/timesheets");

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Payroll</h1>
          <p className="text-sm text-muted-foreground">
            {organisation} &middot; {venue}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2">
            <Select value={period} onValueChange={(v) => setPeriod(v as PayrollPeriod)}>
              <SelectTrigger className="h-8 w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="this-week">This Week</SelectItem>
                <SelectItem value="last-week">Last Week</SelectItem>
                <SelectItem value="this-fortnight">Fortnight</SelectItem>
                <SelectItem value="this-month">This Month</SelectItem>
              </SelectContent>
            </Select>
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <Calendar className="h-3.5 w-3.5" />
              {formatRangeLabel(dateRange)}
            </span>
          </div>

          <Button className="h-8 gap-1.5" onClick={handleExport}>
            <Download className="h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase tracking-wider">Total Hours</CardDescription>
            <CardTitle className="text-3xl">{totals.actualHours.toFixed(1)}h</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase tracking-wider">Gross Pay</CardDescription>
            <CardTitle className="text-3xl">{formatCurrency(totals.grossPayCents)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase tracking-wider">Staff</CardDescription>
            <CardTitle className="text-3xl">{totals.staffCount}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <div className="flex flex-wrap gap-2">
        {totals.penaltyCostCents > 0 ? (
          <Badge variant="outline" className="text-xs">
            Penalty Loading: {formatCurrency(totals.penaltyCostCents)}
          </Badge>
        ) : null}
        <Badge variant="outline" className="text-xs">
          Super (11.5%): {formatCurrency(totals.superAmountCents)}
        </Badge>
        <Badge variant="outline" className="text-xs">
          Total Cost: {formatCurrency(totals.totalCents)}
        </Badge>
      </div>

      {pendingCount > 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-amber-50 px-4 py-2 text-amber-900 dark:bg-amber-950 dark:text-amber-100">
          <div className="flex items-center gap-2 text-sm">
            <Clock className="h-4 w-4" />
            <span>{pendingCount} pending timesheets need approval before export</span>
          </div>
          <Button asChild variant="ghost" size="sm" className="h-7 text-xs">
            <Link href={scopedTimesheetsHref}>Approve Timesheets</Link>
          </Button>
        </div>
      ) : null}

      <Card>
        <CardHeader className="pb-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <CardTitle className="text-base">Payroll Breakdown</CardTitle>
              <CardDescription>Export-ready view based on approved timesheets and rostered penalty loadings.</CardDescription>
            </div>

            <div className="flex items-center gap-2">
              <Select value={exportFormat} onValueChange={(v) => setExportFormat(v as ExportFormat)}>
                <SelectTrigger className="h-8 w-[160px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="csv">Generic CSV</SelectItem>
                  <SelectItem value="xero">Xero</SelectItem>
                  <SelectItem value="keypay">KeyPay</SelectItem>
                  <SelectItem value="myob">MYOB</SelectItem>
                </SelectContent>
              </Select>
              <span className="text-xs text-muted-foreground">Export format</span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Staff Member</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="text-right">Rostered</TableHead>
                <TableHead className="text-right">Actual</TableHead>
                <TableHead className="text-right">Variance</TableHead>
                <TableHead className="text-right">Rate</TableHead>
                <TableHead className="text-right">Gross Pay</TableHead>
                <TableHead className="text-right">Super</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {staffBreakdown.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="h-32 text-center text-muted-foreground">
                    <FileSpreadsheet className="mx-auto mb-3 h-10 w-10 opacity-50" />
                    <p className="font-medium">No payroll data for this period</p>
                    <p className="mt-1 text-sm">Approve timesheets to generate payroll.</p>
                  </TableCell>
                </TableRow>
              ) : (
                <>
                  {staffBreakdown.map((s) => {
                    const isExpanded = expandedStaff.has(s.id);
                    const hasPenalties =
                      s.penaltyLines.length > 1 ||
                      (s.penaltyLines.length === 1 && s.penaltyLines[0]?.type !== "none");

                    const varianceClass =
                      Math.abs(s.variance) <= 0.5
                        ? "text-green-600"
                        : Math.abs(s.variance) <= 1
                          ? "text-amber-600"
                          : "text-red-600";

                    return (
                      <tbody key={s.id}>
                        <TableRow
                          className={cn(hasPenalties ? "cursor-pointer hover:bg-muted/50" : undefined)}
                          onClick={() => (hasPenalties ? toggleExpand(s.id) : undefined)}
                        >
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-1.5">
                              {hasPenalties ? (
                                isExpanded ? (
                                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                                ) : (
                                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                                )
                              ) : null}
                              <span>{s.name}</span>
                              {s.penaltyCostCents > 0 ? (
                                <Badge
                                  variant="outline"
                                  className="ml-1.5 border-orange-200 bg-orange-50 px-1 py-0 text-[9px] text-orange-700 dark:border-orange-900/40 dark:bg-orange-950/40 dark:text-orange-200"
                                >
                                  +{formatCurrency(s.penaltyCostCents)}
                                </Badge>
                              ) : null}
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">{s.role}</TableCell>
                          <TableCell className="text-right">{s.rosteredHours.toFixed(1)}h</TableCell>
                          <TableCell className="text-right">{s.actualHours.toFixed(1)}h</TableCell>
                          <TableCell className="text-right">
                            <span className={cn("text-xs font-medium", varianceClass)}>
                              {s.variance >= 0 ? "+" : ""}
                              {s.variance.toFixed(1)}h
                            </span>
                          </TableCell>
                          <TableCell className="text-right">{formatCurrency(s.hourlyRateCents)}/hr</TableCell>
                          <TableCell className="text-right">{formatCurrency(s.grossPayCents)}</TableCell>
                          <TableCell className="text-right text-muted-foreground">
                            {formatCurrency(s.superAmountCents)}
                          </TableCell>
                          <TableCell className="text-right font-medium">{formatCurrency(s.totalCents)}</TableCell>
                        </TableRow>

                        {hasPenalties && isExpanded
                          ? s.penaltyLines.map((line) => {
                              const isBase = line.type === "none";
                              return (
                                <TableRow key={`${s.id}-${line.type}`} className="bg-muted/30">
                                  <TableCell className="pl-10 text-xs text-muted-foreground" colSpan={2}>
                                    {line.label}
                                    {line.multiplier > 1 ? (
                                      <Badge variant="outline" className="ml-1.5 px-1 py-0 text-[9px]">
                                        {Math.round(line.multiplier * 100)}%
                                      </Badge>
                                    ) : null}
                                  </TableCell>
                                  <TableCell className="text-right text-xs text-muted-foreground">
                                    {line.hours.toFixed(1)}h
                                  </TableCell>
                                  <TableCell />
                                  <TableCell />
                                  <TableCell />
                                  <TableCell className="text-right text-xs">
                                    {isBase ? (
                                      formatCurrency(line.baseCostCents)
                                    ) : (
                                      <span className="text-orange-700 dark:text-orange-200">
                                        {formatCurrency(line.baseCostCents)} + {formatCurrency(line.penaltyCostCents)}
                                      </span>
                                    )}
                                  </TableCell>
                                  <TableCell />
                                  <TableCell className="text-right text-xs font-medium">
                                    {formatCurrency(line.totalCostCents)}
                                  </TableCell>
                                </TableRow>
                              );
                            })
                          : null}
                      </tbody>
                    );
                  })}
                  <TableRow className="bg-muted/50 font-medium">
                    <TableCell>Totals</TableCell>
                    <TableCell className="text-muted-foreground">{totals.staffCount} staff</TableCell>
                    <TableCell className="text-right">{totals.rosteredHours.toFixed(1)}h</TableCell>
                    <TableCell className="text-right">{totals.actualHours.toFixed(1)}h</TableCell>
                    <TableCell className="text-right">
                      <span
                        className={cn(
                          "text-xs font-medium",
                          Math.abs(totals.actualHours - totals.rosteredHours) <= 2
                            ? "text-green-600"
                            : "text-amber-600"
                        )}
                      >
                        {totals.actualHours - totals.rosteredHours >= 0 ? "+" : ""}
                        {(totals.actualHours - totals.rosteredHours).toFixed(1)}h
                      </span>
                    </TableCell>
                    <TableCell />
                    <TableCell className="text-right">{formatCurrency(totals.grossPayCents)}</TableCell>
                    <TableCell className="text-right text-muted-foreground">{formatCurrency(totals.superAmountCents)}</TableCell>
                    <TableCell className="text-right font-bold">{formatCurrency(totals.totalCents)}</TableCell>
                  </TableRow>
                </>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="text-xs text-muted-foreground">
        Tip: penalty rows expand when rostered shifts in the period include loadings (e.g. Saturday/Sunday/late night).
      </div>
    </section>
  );
}

