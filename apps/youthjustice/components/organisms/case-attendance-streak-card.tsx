import { Flame } from "lucide-react";

import type { CaseProfile } from "@/lib/dummy-case-profile";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Separator } from "@workspace/ui/components/separator";
import { cn } from "@workspace/ui/lib/utils";

type CaseAttendanceStreakCardProps = {
  firstName: string;
  attendance: CaseProfile["attendance"];
  className?: string;
};

export function CaseAttendanceStreakCard({
  firstName,
  attendance,
  className,
}: CaseAttendanceStreakCardProps) {
  const { streakCount, bestStreak, attendedLast90, scheduledLast90, recent } =
    attendance;
  const onFire = streakCount >= 3;

  return (
    <Card className={cn("gap-3", className)}>
      <CardHeader className="pb-0">
        <div className="flex items-center gap-2">
          <Flame
            className={cn(
              "h-4 w-4",
              onFire ? "text-amber-500" : "text-muted-foreground",
            )}
          />
          <CardTitle className="text-base">Attendance streak</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-3">
        <div className="flex items-baseline gap-2">
          <span
            className={cn(
              "text-4xl font-bold tabular-nums tracking-tight",
              onFire && "text-amber-600 dark:text-amber-400",
            )}
          >
            {streakCount}
          </span>
          <span className="text-sm text-muted-foreground">
            {streakCount === 1 ? "appointment" : "appointments"} in a row
          </span>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5">
            {recent.map((entry, index) => (
              <span
                key={index}
                title={entry.attended ? "Attended" : "Missed"}
                className={cn(
                  "h-2.5 flex-1 rounded-full",
                  entry.attended
                    ? "bg-emerald-500/80"
                    : "bg-destructive/50",
                  index === recent.length - 1 &&
                    "ring-2 ring-offset-1 ring-offset-background",
                  index === recent.length - 1 &&
                    (entry.attended
                      ? "ring-emerald-500/50"
                      : "ring-destructive/40"),
                )}
              />
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            Last {recent.length} scheduled, oldest to newest
          </p>
        </div>

        <Separator className="mt-auto" />
        <dl className="space-y-1 text-sm">
          <div className="flex items-center justify-between gap-3">
            <dt className="text-muted-foreground">Last 90 days</dt>
            <dd className="font-medium tabular-nums">
              {attendedLast90} of {scheduledLast90} attended
            </dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="text-muted-foreground">Best streak</dt>
            <dd className="font-medium tabular-nums">{bestStreak}</dd>
          </div>
        </dl>
        <p className="text-xs text-muted-foreground">
          {streakCount === 0
            ? `The next appointment starts a new streak for ${firstName}.`
            : `${firstName} is building a solid attendance record.`}
        </p>
      </CardContent>
    </Card>
  );
}
