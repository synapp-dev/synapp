"use client";

import Link from "next/link";
import { format } from "date-fns";
import { ArrowRight, Target } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { Button } from "@workspace/ui/components/button";
import { cn } from "@workspace/ui/lib/utils";
import { formatDate } from "@/lib/format";
import { useIdentityEntries } from "@/hooks/identity/use-identity";

/** Open identity goals with target dates; overdue ones get flagged. */
export function GoalsSnapshot() {
  const { data: goals, isLoading } = useIdentityEntries("goals");
  const today = format(new Date(), "yyyy-MM-dd");

  const open = (goals ?? [])
    .filter((goal) => !goal.extras.done)
    .sort((a, b) => {
      const aDate = a.extras.targetDate ?? "9999-99-99";
      const bDate = b.extras.targetDate ?? "9999-99-99";
      return aDate === bDate ? a.orderIndex - b.orderIndex : aDate < bDate ? -1 : 1;
    });

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Target className="h-4 w-4 text-muted-foreground" />
          Goals on the horizon
        </CardTitle>
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="gap-1 text-muted-foreground"
        >
          <Link href="/identity">
            Identity
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : open.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border/60 px-4 py-6 text-center text-sm text-muted-foreground">
            No open goals yet. Set them in Identity to track them here.
          </p>
        ) : (
          <ul className="space-y-2">
            {open.map((goal) => {
              const target = goal.extras.targetDate ?? null;
              const overdue = target !== null && target < today;
              return (
                <li
                  key={goal.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border/60 px-3 py-2"
                >
                  <span className="min-w-0 truncate text-sm">{goal.title}</span>
                  <span className="flex shrink-0 items-center gap-2">
                    {overdue ? (
                      <span className="rounded-full bg-rose-500/10 px-2 py-0.5 text-[11px] font-medium text-rose-500">
                        Overdue
                      </span>
                    ) : null}
                    <span
                      className={cn(
                        "text-xs tabular-nums",
                        overdue ? "text-rose-500" : "text-muted-foreground"
                      )}
                    >
                      {target ? formatDate(target, "short") : "No date"}
                    </span>
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
