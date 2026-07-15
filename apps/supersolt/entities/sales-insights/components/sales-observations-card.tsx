"use client";

import { Sparkles, Trophy } from "lucide-react";
import { Badge } from "@workspace/ui/components/badge";
import { Card, CardContent } from "@workspace/ui/components/card";
import type {
  SalesRecordsPayload,
} from "@/entities/sales-insights/model/intelligence-types";

type SalesObservationsCardProps = {
  observations: string[];
  records: SalesRecordsPayload | null;
};

/**
 * Narrative strip: the server distils the period into a handful of plain
 * sentences (records, weather effects, peak windows, pairings, menu verdicts)
 * so the owner reads conclusions before charts.
 */
export function SalesObservationsCard({
  observations,
  records,
}: SalesObservationsCardProps) {
  if (observations.length === 0) {
    return null;
  }

  const recordItems = records?.records ?? [];

  return (
    <Card className="border-emerald-500/25 bg-emerald-50/40 dark:border-emerald-400/20 dark:bg-emerald-950/20">
      <CardContent className="space-y-3 py-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-900 dark:text-emerald-200">
            <Sparkles className="h-4 w-4" />
            What Superbot noticed
          </span>
          {recordItems.map((record) => (
            <Badge
              key={`${record.kind}-${record.date}`}
              variant="outline"
              className="gap-1 border-emerald-500/40 text-[11px] text-emerald-800 dark:text-emerald-300"
            >
              <Trophy className="h-3 w-3" />
              {record.kind === "best_day_ever"
                ? "Best day ever"
                : record.kind === "best_weekday_ever"
                  ? "Weekday record"
                  : "Top 10% day"}
            </Badge>
          ))}
        </div>
        <ul className="space-y-1.5">
          {observations.map((observation) => (
            <li
              key={observation}
              className="flex items-start gap-2 text-sm leading-relaxed"
            >
              <span
                aria-hidden
                className="mt-[7px] size-1.5 shrink-0 rounded-full bg-emerald-500"
              />
              <span>{observation}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
