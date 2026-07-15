"use client";

import * as React from "react";
import { addDays, format, getISOWeek, startOfWeek } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { Card } from "@workspace/ui/components/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { cn } from "@workspace/ui/lib/utils";

import {
  ROLE_DOT,
  ROLE_LABELS,
  ROLE_PILL,
  ROSTER_DEPARTMENTS,
  ROSTER_LOCATIONS,
  ROSTER_STAFF,
  STATION,
  WEEKDAYS,
  type CrewRole,
} from "@/lib/aviate-demo";
import { PageHeader } from "@/components/molecules/page-header";

// Anchor the demo roster to the week the design shows (06–12 Jul 2026).
const BASE_WEEK = startOfWeek(new Date(2026, 6, 6), { weekStartsOn: 1 });

const LEGEND_ROLES: CrewRole[] = ["ramp", "cargo", "passenger"];

export function DutyRoster() {
  const [department, setDepartment] = React.useState<string>(
    ROSTER_DEPARTMENTS[0]
  );
  const [location, setLocation] = React.useState<string>(ROSTER_LOCATIONS[0]);
  const [weekOffset, setWeekOffset] = React.useState(0);

  const weekStart = React.useMemo(
    () => addDays(BASE_WEEK, weekOffset * 7),
    [weekOffset]
  );
  const weekEnd = addDays(weekStart, 6);
  const days = React.useMemo(
    () => WEEKDAYS.map((_, i) => addDays(weekStart, i)),
    [weekStart]
  );

  const weekLabel = `Week ${getISOWeek(weekStart)} (${format(
    weekStart,
    "dd MMM"
  )} – ${format(weekEnd, "dd MMM yyyy")})`;

  return (
    <div className="space-y-4 py-6">
      <PageHeader
        title="Weekly Duty Roster"
        subtitle="Manage and view ground crew shift assignments"
      />

      {/* Filters + week selector */}
      <Card className="flex flex-wrap items-center gap-3 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <Select value={department} onValueChange={setDepartment}>
            <SelectTrigger className="w-[220px]" size="sm">
              <span className="text-muted-foreground">Department:</span>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ROSTER_DEPARTMENTS.map((d) => (
                <SelectItem key={d} value={d}>
                  {d}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={location} onValueChange={setLocation}>
            <SelectTrigger className="w-[200px]" size="sm">
              <span className="text-muted-foreground">Location:</span>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ROSTER_LOCATIONS.map((l) => (
                <SelectItem key={l} value={l}>
                  {l}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            aria-label="Previous week"
            onClick={() => setWeekOffset((o) => o - 1)}
            className="inline-flex size-8 items-center justify-center rounded-md border bg-background text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <ChevronLeft className="size-4" />
          </button>
          <span className="min-w-[210px] text-center text-sm font-medium tabular-nums">
            {weekLabel}
          </span>
          <button
            type="button"
            aria-label="Next week"
            onClick={() => setWeekOffset((o) => o + 1)}
            className="inline-flex size-8 items-center justify-center rounded-md border bg-background text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
      </Card>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 px-1 text-sm">
        <span className="font-medium text-muted-foreground">
          Role Color Codes:
        </span>
        {LEGEND_ROLES.map((role) => (
          <span key={role} className="inline-flex items-center gap-2">
            <span className={cn("size-3 rounded-sm", ROLE_DOT[role])} />
            {ROLE_LABELS[role]}
          </span>
        ))}
      </div>

      {/* Roster grid */}
      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="sticky left-0 z-10 bg-muted/40 px-4 py-3 text-left font-medium text-muted-foreground">
                  Staff Member
                </th>
                {days.map((day) => (
                  <th
                    key={day.toISOString()}
                    className="px-3 py-3 text-left font-medium text-muted-foreground"
                  >
                    {format(day, "EEE dd")}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ROSTER_STAFF.map((staff) => (
                <tr
                  key={staff.id}
                  className="border-b transition-colors last:border-0 hover:bg-muted/30"
                >
                  <td className="sticky left-0 z-10 bg-background px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <span
                        className={cn(
                          "size-2.5 shrink-0 rounded-full",
                          ROLE_DOT[staff.role]
                        )}
                        aria-hidden
                      />
                      <div className="min-w-0">
                        <div className="truncate font-medium">{staff.name}</div>
                        <div className="truncate text-xs text-muted-foreground">
                          {staff.jobTitle}
                        </div>
                      </div>
                    </div>
                  </td>
                  {staff.shifts.map((shift, i) => (
                    <td key={i} className="px-3 py-2.5">
                      <ShiftCell shift={shift} role={staff.role} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <p className="px-1 text-xs text-muted-foreground">
        {ROSTER_STAFF.length} crew · {department} · {location} · {STATION.iata}
      </p>
    </div>
  );
}

function ShiftCell({
  shift,
  role,
}: {
  shift: string | null;
  role: CrewRole;
}) {
  if (!shift) {
    return (
      <span className="flex h-8 items-center justify-center rounded-md bg-muted text-xs font-medium tracking-wide text-muted-foreground">
        OFF
      </span>
    );
  }
  return (
    <span
      className={cn(
        "flex h-8 items-center justify-center rounded-md text-xs font-semibold tabular-nums",
        ROLE_PILL[role]
      )}
    >
      {shift}
    </span>
  );
}
