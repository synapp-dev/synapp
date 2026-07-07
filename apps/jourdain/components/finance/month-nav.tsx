"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import { monthKey, monthLabel, shiftMonth } from "@/lib/finance/stats";

export function MonthNav({
  month,
  onChange,
  earliest,
}: {
  month: string;
  onChange: (month: string) => void;
  earliest?: string;
}) {
  const current = monthKey(new Date());
  const atLatest = month >= current;
  const atEarliest = earliest !== undefined && month <= earliest;

  return (
    <div className="flex items-center gap-1">
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        disabled={atEarliest}
        onClick={() => onChange(shiftMonth(month, -1))}
        aria-label="Previous month"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <span className="min-w-32 text-center text-sm font-medium tabular-nums">
        {monthLabel(month, "long")}
      </span>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        disabled={atLatest}
        onClick={() => onChange(shiftMonth(month, 1))}
        aria-label="Next month"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
