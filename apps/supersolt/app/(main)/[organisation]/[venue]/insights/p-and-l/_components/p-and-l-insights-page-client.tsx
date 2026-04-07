"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  BarChart3,
  DollarSign,
  ExternalLink,
  Receipt,
  ShoppingCart,
  TrendingUp,
  Users,
} from "lucide-react";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@workspace/ui/components/select";

type PAndLInsightsPageClientProps = {
  organisation: string;
  venue: string;
};

type PLPreset =
  | "this-month"
  | "last-month"
  | "this-quarter"
  | "last-quarter"
  | "this-year"
  | "last-year";

type PLRow = {
  label: string;
  value: string;
  emphasis?: "total";
};

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

function startOfMonth(date: Date): Date {
  return startOfDay(new Date(date.getFullYear(), date.getMonth(), 1));
}

function endOfMonth(date: Date): Date {
  return endOfDay(new Date(date.getFullYear(), date.getMonth() + 1, 0));
}

function addMonths(date: Date, months: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + months, date.getDate());
}

function startOfYear(date: Date): Date {
  return startOfDay(new Date(date.getFullYear(), 0, 1));
}

function endOfYear(date: Date): Date {
  return endOfDay(new Date(date.getFullYear(), 11, 31));
}

function quarterForMonth(monthZeroIndex: number): 1 | 2 | 3 | 4 {
  return (Math.floor(monthZeroIndex / 3) + 1) as 1 | 2 | 3 | 4;
}

function startOfQuarter(date: Date): Date {
  const quarter = quarterForMonth(date.getMonth());
  return startOfDay(new Date(date.getFullYear(), (quarter - 1) * 3, 1));
}

function endOfQuarter(date: Date): Date {
  const quarter = quarterForMonth(date.getMonth());
  return endOfDay(new Date(date.getFullYear(), quarter * 3, 0));
}

function getPLDateRange(preset: PLPreset): { start: Date; end: Date; label: string } {
  const now = new Date();
  const monthName = new Intl.DateTimeFormat("en-AU", { month: "long" });

  switch (preset) {
    case "this-month":
      return {
        start: startOfMonth(now),
        end: endOfMonth(now),
        label: `${monthName.format(now)} ${now.getFullYear()}`,
      };
    case "last-month": {
      const lastMonth = addMonths(now, -1);
      return {
        start: startOfMonth(lastMonth),
        end: endOfMonth(lastMonth),
        label: `${monthName.format(lastMonth)} ${lastMonth.getFullYear()}`,
      };
    }
    case "this-quarter":
      return {
        start: startOfQuarter(now),
        end: endOfQuarter(now),
        label: `Q${quarterForMonth(now.getMonth())} ${now.getFullYear()}`,
      };
    case "last-quarter": {
      const previousQuarter = addMonths(now, -3);
      return {
        start: startOfQuarter(previousQuarter),
        end: endOfQuarter(previousQuarter),
        label: `Q${quarterForMonth(previousQuarter.getMonth())} ${previousQuarter.getFullYear()}`,
      };
    }
    case "this-year":
      return {
        start: startOfYear(now),
        end: endOfYear(now),
        label: `FY ${now.getFullYear()}`,
      };
    case "last-year": {
      const previousYear = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
      return {
        start: startOfYear(previousYear),
        end: endOfYear(previousYear),
        label: `FY ${previousYear.getFullYear()}`,
      };
    }
    default: {
      const neverPreset: never = preset;
      return neverPreset;
    }
  }
}

function PLSection({
  title,
  rows,
  icon: Icon,
}: {
  title: string;
  rows: PLRow[];
  icon: typeof DollarSign;
}) {
  return (
    <Card className="border-border/60">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Icon className="h-4 w-4 text-muted-foreground" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-2">
          {rows.map((row) => (
            <div
              key={row.label}
              className={`flex items-center justify-between rounded-md px-3 py-1.5 ${
                row.emphasis === "total" ? "bg-slate-100 font-semibold dark:bg-slate-800" : ""
              }`}
            >
              <span className="text-sm">{row.label}</span>
              <span className="text-sm tabular-nums">{row.value}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function PAndLInsightsPageClient({ organisation, venue }: PAndLInsightsPageClientProps) {
  const [preset, setPreset] = useState<PLPreset>("this-month");
  const period = useMemo(() => getPLDateRange(preset), [preset]);

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">P&L</h1>
          <p className="text-sm text-muted-foreground">
            Organisation: <span className="font-medium">{organisation}</span> | Venue:{" "}
            <span className="font-medium">{venue}</span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={preset} onValueChange={(value) => setPreset(value as PLPreset)}>
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="this-month">This Month</SelectItem>
              <SelectItem value="last-month">Last Month</SelectItem>
              <SelectItem value="this-quarter">This Quarter</SelectItem>
              <SelectItem value="last-quarter">Last Quarter</SelectItem>
              <SelectItem value="this-year">This Year</SelectItem>
              <SelectItem value="last-year">Last Year</SelectItem>
            </SelectContent>
          </Select>
          <Badge variant="outline">{period.label}</Badge>
        </div>
      </div>

      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/20">
        <div className="flex items-start gap-3">
          <BarChart3 className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-amber-800 dark:text-amber-400">
              P&L data will appear here once Xero is connected
            </p>
            <p className="mt-0.5 text-xs text-amber-700 dark:text-amber-500">
              Connect your Xero account to automatically pull income, COGS, payroll, and expense
              data into your P&L.
            </p>
          </div>
          <Button asChild size="sm" variant="outline" className="shrink-0">
            <Link href={`/${organisation}/${venue}/settings`}>
              <ExternalLink className="mr-1 h-3.5 w-3.5" />
              Connect Xero
            </Link>
          </Button>
        </div>
      </div>

      <PLSection
        title="Revenue"
        icon={TrendingUp}
        rows={[
          { label: "Food Sales", value: "—" },
          { label: "Beverage Sales", value: "—" },
          { label: "Other Revenue", value: "—" },
          { label: "Total Revenue", value: "—", emphasis: "total" },
        ]}
      />

      <PLSection
        title="COGS"
        icon={ShoppingCart}
        rows={[
          { label: "Food COGS", value: "—" },
          { label: "Beverage COGS", value: "—" },
          { label: "Total COGS", value: "—", emphasis: "total" },
        ]}
      />

      <PLSection
        title="Labour"
        icon={Users}
        rows={[
          { label: "Wages", value: "—" },
          { label: "Superannuation", value: "—" },
          { label: "Payroll Tax", value: "—" },
          { label: "Total Labour", value: "—", emphasis: "total" },
        ]}
      />

      <Card className="border-border/60">
        <CardContent className="py-4">
          <div className="flex items-center justify-between rounded-md bg-slate-100 px-3 py-2 dark:bg-slate-800">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-semibold">Gross Profit</span>
            </div>
            <span className="text-sm font-semibold tabular-nums">—</span>
          </div>
        </CardContent>
      </Card>

      <PLSection
        title="Operating Expenses"
        icon={Receipt}
        rows={[
          { label: "Rent & Occupancy", value: "—" },
          { label: "Utilities", value: "—" },
          { label: "Marketing", value: "—" },
          { label: "Insurance", value: "—" },
          { label: "Depreciation", value: "—" },
          { label: "Other Expenses", value: "—" },
          { label: "Total Expenses", value: "—", emphasis: "total" },
        ]}
      />

      <Card className="border-border/60">
        <CardContent className="py-4">
          <div className="flex items-center justify-between rounded-md bg-slate-100 px-3 py-2 dark:bg-slate-800">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-semibold">Net Profit</span>
            </div>
            <span className="text-sm font-semibold tabular-nums">—</span>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
