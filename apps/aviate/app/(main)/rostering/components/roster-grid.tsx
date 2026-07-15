"use client";

import * as React from "react";
import { Plus } from "lucide-react";

import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";

import type {
  RosterPeriodDetail,
  Shift,
  Station,
} from "@/entities/rostering/model/types";
import { datesInRange, formatDayHeading, formatTime } from "@/lib/rostering";
import { CreateShiftDialog } from "./create-shift-dialog";
import { ShiftDialog } from "./shift-dialog";

interface RosterGridProps {
  period: RosterPeriodDetail;
  station: Station;
}

const UNASSIGNED_DEPT = "__none__";

export function RosterGrid({ period, station }: RosterGridProps) {
  const days = datesInRange(period.starts_on, period.ends_on);
  const [selectedShiftId, setSelectedShiftId] = React.useState<string | null>(
    null
  );
  const [createTarget, setCreateTarget] = React.useState<{
    departmentId: string | null;
    date: string;
  } | null>(null);

  const departments = station.departments;
  const hasOrphanShifts = period.shifts.some((s) => !s.department_id);
  const rows: { id: string | null; name: string }[] = [
    ...departments.map((d) => ({ id: d.id as string | null, name: d.name })),
    ...(hasOrphanShifts
      ? [{ id: null, name: "No department" }]
      : []),
  ];

  const shiftsByCell = React.useMemo(() => {
    const map = new Map<string, Shift[]>();
    for (const shift of period.shifts) {
      const key = `${shift.department_id ?? UNASSIGNED_DEPT}|${shift.shift_date}`;
      const list = map.get(key) ?? [];
      list.push(shift);
      map.set(key, list);
    }
    for (const list of map.values()) {
      list.sort((a, b) => a.start_time.localeCompare(b.start_time));
    }
    return map;
  }, [period.shifts]);

  const selectedShift =
    period.shifts.find((s) => s.id === selectedShiftId) ?? null;

  return (
    <>
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-muted/50">
              <th className="sticky left-0 z-10 min-w-[160px] border-b border-r bg-muted/50 p-2 text-left font-medium">
                Department
              </th>
              {days.map((day) => {
                const { day: weekday, date } = formatDayHeading(day);
                return (
                  <th
                    key={day}
                    className="min-w-[130px] border-b p-2 text-left font-medium"
                  >
                    <div>{weekday}</div>
                    <div className="text-xs font-normal text-muted-foreground">
                      {date}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id ?? UNASSIGNED_DEPT} className="align-top">
                <td className="sticky left-0 z-10 border-b border-r bg-background p-2 font-medium">
                  {row.name}
                </td>
                {days.map((day) => {
                  const shifts =
                    shiftsByCell.get(`${row.id ?? UNASSIGNED_DEPT}|${day}`) ??
                    [];
                  return (
                    <td key={day} className="border-b p-1">
                      <div className="flex flex-col gap-1">
                        {shifts.map((shift) => {
                          const assigned = shift.assignments.length;
                          const short = assigned < shift.required_headcount;
                          return (
                            <button
                              key={shift.id}
                              type="button"
                              onClick={() => setSelectedShiftId(shift.id)}
                              className="rounded-md border bg-card p-1.5 text-left transition-colors hover:border-primary/50"
                            >
                              <div className="text-xs font-medium">
                                {formatTime(shift.start_time)}–
                                {formatTime(shift.end_time)}
                              </div>
                              <Badge
                                variant={short ? "destructive" : "secondary"}
                                className="mt-1 text-[10px]"
                              >
                                {assigned}/{shift.required_headcount} crew
                              </Badge>
                            </button>
                          );
                        })}
                        {period.status !== "locked" ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-6 justify-start px-1 text-muted-foreground"
                            onClick={() =>
                              setCreateTarget({ departmentId: row.id, date: day })
                            }
                          >
                            <Plus className="w-3 h-3" />
                          </Button>
                        ) : null}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ShiftDialog
        shift={selectedShift}
        station={station}
        periodId={period.id}
        periodStatus={period.status}
        onClose={() => setSelectedShiftId(null)}
      />

      {createTarget ? (
        <CreateShiftDialog
          periodId={period.id}
          stationId={station.id}
          departmentId={createTarget.departmentId}
          date={createTarget.date}
          onClose={() => setCreateTarget(null)}
        />
      ) : null}
    </>
  );
}
