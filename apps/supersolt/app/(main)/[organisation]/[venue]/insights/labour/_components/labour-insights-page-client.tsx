"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, BarChart3, Clock, DollarSign, Download, Percent, Users } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@workspace/ui/components/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@workspace/ui/components/table";
import { cn } from "@workspace/ui/lib/utils";

type LabourInsightsPageClientProps = {
  organisation: string;
  venue: string;
};

type ReportType = "labour-cost" | "labour-percent" | "rostered-vs-actual" | "overtime";
type DatePreset = "today" | "yesterday" | "this-week" | "last-week" | "this-month" | "last-30";

type LabourCostRow = {
  date: string;
  totalHours: number;
  baseCost: number;
  penaltyCost: number;
  totalCost: number;
};

type LabourPercentRow = {
  date: string;
  revenue: number;
  labourCost: number;
  labourPercent: number;
};

type RosteredVsActualRow = {
  staff: string;
  rostered: number;
  actual: number;
  variance: number;
};

type OvertimeRow = {
  staff: string;
  regularHours: number;
  overtimeHours: number;
  overtimeCost: number;
  trigger: string;
};

const TARGET_LABOUR_PERCENT = 30;

const REPORTS: Array<{
  id: ReportType;
  title: string;
  description: string;
  icon: typeof DollarSign;
}> = [
  {
    id: "labour-cost",
    title: "Hours & Cost",
    description: "Ordinary vs penalty cost per day",
    icon: DollarSign,
  },
  {
    id: "labour-percent",
    title: "Labour %",
    description: "Cost as percentage of revenue",
    icon: Percent,
  },
  {
    id: "rostered-vs-actual",
    title: "Rostered vs Actual",
    description: "Scheduled hours against worked hours",
    icon: Clock,
  },
  {
    id: "overtime",
    title: "Overtime",
    description: "Team members above weekly threshold",
    icon: AlertTriangle,
  },
];

const LABOUR_COST_ROWS: LabourCostRow[] = [
  { date: "Mon", totalHours: 62.5, baseCost: 182400, penaltyCost: 21600, totalCost: 204000 },
  { date: "Tue", totalHours: 58.2, baseCost: 169300, penaltyCost: 17400, totalCost: 186700 },
  { date: "Wed", totalHours: 64.8, baseCost: 191700, penaltyCost: 25300, totalCost: 217000 },
  { date: "Thu", totalHours: 71.4, baseCost: 209100, penaltyCost: 36900, totalCost: 246000 },
  { date: "Fri", totalHours: 83.1, baseCost: 242000, penaltyCost: 52000, totalCost: 294000 },
  { date: "Sat", totalHours: 95.3, baseCost: 266500, penaltyCost: 78500, totalCost: 345000 },
  { date: "Sun", totalHours: 78.6, baseCost: 229000, penaltyCost: 61000, totalCost: 290000 },
];

const LABOUR_PERCENT_ROWS: LabourPercentRow[] = [
  { date: "Mon", revenue: 892000, labourCost: 204000, labourPercent: 22.9 },
  { date: "Tue", revenue: 851000, labourCost: 186700, labourPercent: 21.9 },
  { date: "Wed", revenue: 915000, labourCost: 217000, labourPercent: 23.7 },
  { date: "Thu", revenue: 998000, labourCost: 246000, labourPercent: 24.6 },
  { date: "Fri", revenue: 1195000, labourCost: 294000, labourPercent: 24.6 },
  { date: "Sat", revenue: 1324000, labourCost: 345000, labourPercent: 26.1 },
  { date: "Sun", revenue: 1142000, labourCost: 290000, labourPercent: 25.4 },
];

const ROSTERED_VS_ACTUAL_ROWS: RosteredVsActualRow[] = [
  { staff: "Ari Cohen", rostered: 38.0, actual: 39.2, variance: 1.2 },
  { staff: "Mila Santos", rostered: 34.5, actual: 33.0, variance: -1.5 },
  { staff: "Noah Patel", rostered: 41.0, actual: 44.4, variance: 3.4 },
  { staff: "Jai Nguyen", rostered: 29.0, actual: 27.8, variance: -1.2 },
  { staff: "Emma Lee", rostered: 36.5, actual: 38.6, variance: 2.1 },
];

const OVERTIME_ROWS: OvertimeRow[] = [
  {
    staff: "Noah Patel",
    regularHours: 38,
    overtimeHours: 6.4,
    overtimeCost: 36100,
    trigger: "38h weekly threshold",
  },
  {
    staff: "Emma Lee",
    regularHours: 38,
    overtimeHours: 0.6,
    overtimeCost: 3200,
    trigger: "38h weekly threshold",
  },
];

function formatCurrency(cents: number): string {
  return `$${(cents / 100).toLocaleString("en-AU", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function startOfDay(date: Date): Date {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function endOfDay(date: Date): Date {
  const next = new Date(date);
  next.setHours(23, 59, 59, 999);
  return next;
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function startOfWeekMonday(date: Date): Date {
  const day = date.getDay();
  const delta = day === 0 ? -6 : 1 - day;
  return startOfDay(addDays(date, delta));
}

function endOfWeekMonday(date: Date): Date {
  return endOfDay(addDays(startOfWeekMonday(date), 6));
}

function startOfMonth(date: Date): Date {
  return startOfDay(new Date(date.getFullYear(), date.getMonth(), 1));
}

function endOfMonth(date: Date): Date {
  return endOfDay(new Date(date.getFullYear(), date.getMonth() + 1, 0));
}

function getDateRange(preset: DatePreset): { start: Date; end: Date } {
  const now = new Date();
  switch (preset) {
    case "today":
      return { start: startOfDay(now), end: endOfDay(now) };
    case "yesterday": {
      const yesterday = addDays(now, -1);
      return { start: startOfDay(yesterday), end: endOfDay(yesterday) };
    }
    case "this-week":
      return { start: startOfWeekMonday(now), end: endOfWeekMonday(now) };
    case "last-week": {
      const lastWeek = addDays(now, -7);
      return { start: startOfWeekMonday(lastWeek), end: endOfWeekMonday(lastWeek) };
    }
    case "this-month":
      return { start: startOfMonth(now), end: endOfMonth(now) };
    case "last-30":
      return { start: startOfDay(addDays(now, -30)), end: endOfDay(now) };
    default: {
      const neverPreset: never = preset;
      return neverPreset;
    }
  }
}

function formatDateRange(start: Date, end: Date): string {
  const fmt = new Intl.DateTimeFormat("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  return `${fmt.format(start)} - ${fmt.format(end)}`;
}

function downloadCsv(filename: string, header: string[], rows: Array<Array<string | number>>) {
  const escapedHeader = header.join(",");
  const escapedRows = rows.map((row) =>
    row
      .map((value) => {
        const text = String(value);
        if (text.includes(",") || text.includes("\"")) {
          return `"${text.replaceAll("\"", "\"\"")}"`;
        }
        return text;
      })
      .join(",")
  );

  const csv = [escapedHeader, ...escapedRows].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function LabourInsightsPageClient({ organisation, venue }: LabourInsightsPageClientProps) {
  const [selectedReport, setSelectedReport] = useState<ReportType>("labour-cost");
  const [datePreset, setDatePreset] = useState<DatePreset>("last-week");

  const dateRange = useMemo(() => getDateRange(datePreset), [datePreset]);

  const costSummary = useMemo(() => {
    const totalHours = LABOUR_COST_ROWS.reduce((sum, row) => sum + row.totalHours, 0);
    const totalCost = LABOUR_COST_ROWS.reduce((sum, row) => sum + row.totalCost, 0);
    const totalBase = LABOUR_COST_ROWS.reduce((sum, row) => sum + row.baseCost, 0);
    const totalPenalty = LABOUR_COST_ROWS.reduce((sum, row) => sum + row.penaltyCost, 0);
    return { totalHours, totalCost, totalBase, totalPenalty };
  }, []);

  const labourPercentSummary = useMemo(() => {
    const totalRevenue = LABOUR_PERCENT_ROWS.reduce((sum, row) => sum + row.revenue, 0);
    const totalLabour = LABOUR_PERCENT_ROWS.reduce((sum, row) => sum + row.labourCost, 0);
    const labourPercent = totalRevenue === 0 ? 0 : (totalLabour / totalRevenue) * 100;
    return { totalRevenue, totalLabour, labourPercent };
  }, []);

  const rosterSummary = useMemo(() => {
    const totalRostered = ROSTERED_VS_ACTUAL_ROWS.reduce((sum, row) => sum + row.rostered, 0);
    const totalActual = ROSTERED_VS_ACTUAL_ROWS.reduce((sum, row) => sum + row.actual, 0);
    return { totalRostered, totalActual, variance: totalActual - totalRostered };
  }, []);

  const overtimeSummary = useMemo(() => {
    const staffCount = OVERTIME_ROWS.length;
    const totalOvertimeHours = OVERTIME_ROWS.reduce((sum, row) => sum + row.overtimeHours, 0);
    const totalOvertimeCost = OVERTIME_ROWS.reduce((sum, row) => sum + row.overtimeCost, 0);
    return { staffCount, totalOvertimeHours, totalOvertimeCost };
  }, []);

  function handleExport() {
    const rangeToken = `${datePreset}-${venue}`;

    switch (selectedReport) {
      case "labour-cost":
        downloadCsv(
          `labour-cost-${rangeToken}.csv`,
          ["Day", "Total Hours", "Base Cost", "Penalty Cost", "Total Cost"],
          LABOUR_COST_ROWS.map((row) => [
            row.date,
            row.totalHours.toFixed(1),
            (row.baseCost / 100).toFixed(2),
            (row.penaltyCost / 100).toFixed(2),
            (row.totalCost / 100).toFixed(2),
          ])
        );
        break;
      case "labour-percent":
        downloadCsv(
          `labour-percent-${rangeToken}.csv`,
          ["Day", "Revenue", "Labour Cost", "Labour %"],
          LABOUR_PERCENT_ROWS.map((row) => [
            row.date,
            (row.revenue / 100).toFixed(2),
            (row.labourCost / 100).toFixed(2),
            row.labourPercent.toFixed(1),
          ])
        );
        break;
      case "rostered-vs-actual":
        downloadCsv(
          `rostered-vs-actual-${rangeToken}.csv`,
          ["Staff", "Rostered Hours", "Actual Hours", "Variance Hours"],
          ROSTERED_VS_ACTUAL_ROWS.map((row) => [
            row.staff,
            row.rostered.toFixed(1),
            row.actual.toFixed(1),
            row.variance.toFixed(1),
          ])
        );
        break;
      case "overtime":
        downloadCsv(
          `overtime-${rangeToken}.csv`,
          ["Staff", "Regular Hours", "Overtime Hours", "Overtime Cost", "Trigger"],
          OVERTIME_ROWS.map((row) => [
            row.staff,
            row.regularHours.toFixed(1),
            row.overtimeHours.toFixed(1),
            (row.overtimeCost / 100).toFixed(2),
            row.trigger,
          ])
        );
        break;
      default: {
        const neverReport: never = selectedReport;
        return neverReport;
      }
    }

    toast.success("Report exported");
  }

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Labour Insights</h1>
          <p className="text-sm text-muted-foreground">
            Organisation: <span className="font-medium">{organisation}</span> | Venue:{" "}
            <span className="font-medium">{venue}</span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={datePreset} onValueChange={(value) => setDatePreset(value as DatePreset)}>
            <SelectTrigger className="w-[148px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="yesterday">Yesterday</SelectItem>
              <SelectItem value="this-week">This Week</SelectItem>
              <SelectItem value="last-week">Last Week</SelectItem>
              <SelectItem value="this-month">This Month</SelectItem>
              <SelectItem value="last-30">Last 30 Days</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-xs text-muted-foreground">
            {formatDateRange(dateRange.start, dateRange.end)}
          </span>
          <Button onClick={handleExport} className="gap-2">
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        {REPORTS.map((report) => {
          const Icon = report.icon;
          const active = selectedReport === report.id;
          return (
            <button
              key={report.id}
              type="button"
              onClick={() => setSelectedReport(report.id)}
              className={cn(
                "rounded-lg border bg-card p-4 text-left transition-colors",
                active ? "border-primary/60 bg-primary/5" : "hover:border-primary/30 hover:bg-primary/5"
              )}
            >
              <Icon className={cn("mb-2 h-5 w-5", active ? "text-primary" : "text-muted-foreground")} />
              <p className="text-sm font-semibold leading-tight">{report.title}</p>
              <p className="mt-1 text-xs text-muted-foreground">{report.description}</p>
            </button>
          );
        })}
      </div>

      {selectedReport === "labour-cost" ? (
        <div className="space-y-4">
          <div className="grid gap-3 md:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription className="text-xs uppercase tracking-wider">Total Hours</CardDescription>
                <CardTitle className="text-2xl">{costSummary.totalHours.toFixed(1)}h</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription className="text-xs uppercase tracking-wider">Total Cost</CardDescription>
                <CardTitle className="text-2xl">{formatCurrency(costSummary.totalCost)}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription className="text-xs uppercase tracking-wider">Base Pay</CardDescription>
                <CardTitle className="text-2xl">{formatCurrency(costSummary.totalBase)}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription className="text-xs uppercase tracking-wider">Penalty</CardDescription>
                <CardTitle className="text-2xl">{formatCurrency(costSummary.totalPenalty)}</CardTitle>
              </CardHeader>
            </Card>
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Daily Labour Cost</CardTitle>
              <CardDescription>Base vs penalty cost split by day</CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Day</TableHead>
                    <TableHead className="text-right">Hours</TableHead>
                    <TableHead className="text-right">Base Cost</TableHead>
                    <TableHead className="text-right">Penalty Cost</TableHead>
                    <TableHead className="text-right">Total Cost</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {LABOUR_COST_ROWS.map((row) => (
                    <TableRow key={row.date}>
                      <TableCell className="font-medium">{row.date}</TableCell>
                      <TableCell className="text-right">{row.totalHours.toFixed(1)}h</TableCell>
                      <TableCell className="text-right">{formatCurrency(row.baseCost)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(row.penaltyCost)}</TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(row.totalCost)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {selectedReport === "labour-percent" ? (
        <div className="space-y-4">
          <div className="grid gap-3 md:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription className="text-xs uppercase tracking-wider">Revenue</CardDescription>
                <CardTitle className="text-2xl">
                  {formatCurrency(labourPercentSummary.totalRevenue)}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription className="text-xs uppercase tracking-wider">Labour Cost</CardDescription>
                <CardTitle className="text-2xl">{formatCurrency(labourPercentSummary.totalLabour)}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription className="text-xs uppercase tracking-wider">Labour %</CardDescription>
                <CardTitle className="text-2xl">
                  {labourPercentSummary.labourPercent.toFixed(1)}%
                </CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription className="text-xs uppercase tracking-wider">Target</CardDescription>
                <CardTitle className="text-2xl">{TARGET_LABOUR_PERCENT}%</CardTitle>
              </CardHeader>
            </Card>
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Daily Labour %</CardTitle>
              <CardDescription>Rows over target are highlighted</CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Day</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                    <TableHead className="text-right">Labour Cost</TableHead>
                    <TableHead className="text-right">Labour %</TableHead>
                    <TableHead className="text-right">Target</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {LABOUR_PERCENT_ROWS.map((row) => (
                    <TableRow
                      key={row.date}
                      className={row.labourPercent > TARGET_LABOUR_PERCENT ? "bg-red-50/40 dark:bg-red-950/15" : ""}
                    >
                      <TableCell className="font-medium">{row.date}</TableCell>
                      <TableCell className="text-right">{formatCurrency(row.revenue)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(row.labourCost)}</TableCell>
                      <TableCell className="text-right font-medium">{row.labourPercent.toFixed(1)}%</TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {TARGET_LABOUR_PERCENT}%
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {selectedReport === "rostered-vs-actual" ? (
        <div className="space-y-4">
          <div className="grid gap-3 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription className="text-xs uppercase tracking-wider">Rostered</CardDescription>
                <CardTitle className="text-2xl">{rosterSummary.totalRostered.toFixed(1)}h</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription className="text-xs uppercase tracking-wider">Actual</CardDescription>
                <CardTitle className="text-2xl">{rosterSummary.totalActual.toFixed(1)}h</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription className="text-xs uppercase tracking-wider">Variance</CardDescription>
                <CardTitle className="text-2xl">
                  {rosterSummary.variance >= 0 ? "+" : ""}
                  {rosterSummary.variance.toFixed(1)}h
                </CardTitle>
              </CardHeader>
            </Card>
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Per-Staff Breakdown</CardTitle>
              <CardDescription>Variance greater than +/-2h is flagged</CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Staff</TableHead>
                    <TableHead className="text-right">Rostered</TableHead>
                    <TableHead className="text-right">Actual</TableHead>
                    <TableHead className="text-right">Variance</TableHead>
                    <TableHead className="text-right">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ROSTERED_VS_ACTUAL_ROWS.map((row) => (
                    <TableRow key={row.staff}>
                      <TableCell className="font-medium">{row.staff}</TableCell>
                      <TableCell className="text-right">{row.rostered.toFixed(1)}h</TableCell>
                      <TableCell className="text-right">{row.actual.toFixed(1)}h</TableCell>
                      <TableCell className="text-right">
                        {row.variance >= 0 ? "+" : ""}
                        {row.variance.toFixed(1)}h
                      </TableCell>
                      <TableCell className="text-right">
                        {Math.abs(row.variance) <= 2 ? (
                          <Badge variant="secondary">Healthy</Badge>
                        ) : (
                          <Badge variant="destructive">Review</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {selectedReport === "overtime" ? (
        <div className="space-y-4">
          <div className="grid gap-3 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription className="text-xs uppercase tracking-wider">Staff With OT</CardDescription>
                <CardTitle className="text-2xl">{overtimeSummary.staffCount}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription className="text-xs uppercase tracking-wider">Total OT Hours</CardDescription>
                <CardTitle className="text-2xl">{overtimeSummary.totalOvertimeHours.toFixed(1)}h</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription className="text-xs uppercase tracking-wider">Estimated OT Cost</CardDescription>
                <CardTitle className="text-2xl">
                  {formatCurrency(overtimeSummary.totalOvertimeCost)}
                </CardTitle>
              </CardHeader>
            </Card>
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Overtime Detail</CardTitle>
              <CardDescription>Weekly threshold overages</CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Staff</TableHead>
                    <TableHead className="text-right">Regular Hours</TableHead>
                    <TableHead className="text-right">OT Hours</TableHead>
                    <TableHead className="text-right">OT Cost</TableHead>
                    <TableHead>Trigger</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {OVERTIME_ROWS.map((row) => (
                    <TableRow key={row.staff}>
                      <TableCell className="font-medium">{row.staff}</TableCell>
                      <TableCell className="text-right">{row.regularHours.toFixed(1)}h</TableCell>
                      <TableCell className="text-right text-orange-600">
                        {row.overtimeHours.toFixed(1)}h
                      </TableCell>
                      <TableCell className="text-right">{formatCurrency(row.overtimeCost)}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          <Users className="mr-1 h-3 w-3" />
                          {row.trigger}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      ) : null}

      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
            Data Source
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          This labour page currently mirrors the reference layout with seeded demo data while API
          endpoints are being wired for production.
        </CardContent>
      </Card>
    </section>
  );
}
