"use client";

import Link from "next/link";
import { BellRing, CalendarDays } from "lucide-react";
import { Card, CardContent } from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";
import { Badge } from "@workspace/ui/components/badge";
import { Switch } from "@workspace/ui/components/switch";
import { Input } from "@workspace/ui/components/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import {
  usePrograms,
  useSchedule,
  useSetScheduleDay,
  useSetTrainingReminder,
} from "@/hooks/gym/use-gym";

// Monday-first display order; Sunday (0) sits last as the usual rest day.
const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];
const DAY_LABELS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const REST = "rest";

export default function GymSchedulePage() {
  const { data: programs } = usePrograms();
  const { data: schedule } = useSchedule();
  const setDay = useSetScheduleDay();
  const setReminder = useSetTrainingReminder();

  const programOptions = programs ?? [];
  const noPrograms = programs != null && programOptions.length === 0;

  const trainingDays = (schedule?.days ?? []).filter((d) => d.programId).length;
  const reminderOn = schedule?.reminderActive ?? false;
  const reminderTime = schedule?.reminderTime ?? "17:00";

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <div className="flex items-center gap-2">
        <CalendarDays className="h-5 w-5 text-muted-foreground" />
        <div>
          <h2 className="text-lg font-medium tracking-tight">Weekly schedule</h2>
          <p className="text-sm text-muted-foreground">
            Map each day to a program. A program can repeat across days — e.g.
            Push on Monday and Thursday.
          </p>
        </div>
      </div>

      {noPrograms ? (
        <Card>
          <CardContent className="flex items-center justify-between gap-3 p-4">
            <p className="text-sm text-muted-foreground">
              Create your Push / Pull / Legs programs first, then assign them to days.
            </p>
            <Button size="sm" asChild>
              <Link href="/health/gym/programs">Programs</Link>
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {/* ── Training reminder ────────────────────────────────────────────── */}
      <Card>
        <CardContent className="space-y-3 p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <BellRing className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Training reminders</p>
                <p className="text-xs text-muted-foreground">
                  A daily “Gym” task on your {trainingDays || 0} training day
                  {trainingDays === 1 ? "" : "s"}, so it shows in tasks and scoring.
                </p>
              </div>
            </div>
            <Switch
              checked={reminderOn}
              disabled={setReminder.isPending}
              onCheckedChange={(enabled) =>
                setReminder.mutate({ enabled, remindTime: reminderTime })
              }
            />
          </div>
          {reminderOn ? (
            <div className="flex items-center gap-2 pl-6">
              <span className="text-xs text-muted-foreground">Remind me at</span>
              <Input
                type="time"
                className="h-8 w-28"
                defaultValue={reminderTime}
                onBlur={(e) =>
                  e.target.value &&
                  e.target.value !== reminderTime &&
                  setReminder.mutate({ enabled: true, remindTime: e.target.value })
                }
              />
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* ── Day → program rows ───────────────────────────────────────────── */}
      <Card>
        <CardContent className="p-2">
          {DAY_ORDER.map((dow) => {
            const day = schedule?.days[dow];
            const value = day?.programId ?? REST;
            return (
              <div
                key={dow}
                className="flex items-center justify-between gap-3 border-b px-2 py-3 last:border-b-0"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium">{DAY_LABELS[dow]}</p>
                  {day?.muscleGroups && day.muscleGroups.length > 0 ? (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {day.muscleGroups.slice(0, 4).map((m) => (
                        <Badge key={m} variant="secondary" className="text-[10px]">
                          {m}
                        </Badge>
                      ))}
                    </div>
                  ) : null}
                </div>
                <Select
                  value={value}
                  disabled={setDay.isPending || noPrograms}
                  onValueChange={(v) =>
                    setDay.mutate({ dayOfWeek: dow, programId: v === REST ? null : v })
                  }
                >
                  <SelectTrigger className="w-44">
                    <SelectValue placeholder="Rest" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={REST}>Rest</SelectItem>
                    {programOptions.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
