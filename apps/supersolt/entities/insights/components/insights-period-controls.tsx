"use client";

import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@workspace/ui/components/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import type { InsightsDatePreset } from "@/entities/insights/model/types";
import { fromDateInputValue, toDateInputValue } from "@/entities/insights/lib/period";
import { useInsightsPeriod } from "@/entities/insights/model/insights-period-provider";

export function InsightsPeriodControls() {
  const {
    preset,
    dateRange,
    rangeLabel,
    customFrom,
    customTo,
    pickerOpen,
    setPickerOpen,
    setPreset,
    setCustomFrom,
    setCustomTo,
    applyCustomRange,
  } = useInsightsPeriod();

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select
        value={preset}
        onValueChange={(value) => {
          const nextPreset = value as InsightsDatePreset;
          setPreset(nextPreset);
          if (nextPreset === "custom") {
            setTimeout(() => setPickerOpen(true), 50);
          }
        }}
      >
        <SelectTrigger className="w-[148px]" aria-label="Period">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="today">Today</SelectItem>
          <SelectItem value="yesterday">Yesterday</SelectItem>
          <SelectItem value="this-week">This Week</SelectItem>
          <SelectItem value="last-week">Last Week</SelectItem>
          <SelectItem value="this-month">This Month</SelectItem>
          <SelectItem value="last-month">Last Month</SelectItem>
          <SelectItem value="custom">Custom...</SelectItem>
        </SelectContent>
      </Select>

      <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" className="h-9">
            Custom Range
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-[300px] space-y-3">
          <div className="space-y-1">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              From
            </p>
            <Input
              type="date"
              value={toDateInputValue(customFrom ?? dateRange.start)}
              onChange={(event) => {
                const value = fromDateInputValue(event.target.value, false);
                setCustomFrom(value);
                setPreset("custom");
              }}
            />
          </div>
          <div className="space-y-1">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              To
            </p>
            <Input
              type="date"
              value={toDateInputValue(customTo ?? dateRange.end)}
              onChange={(event) => {
                const value = fromDateInputValue(event.target.value, true);
                setCustomTo(value);
                setPreset("custom");
              }}
            />
          </div>
          <div className="flex justify-end">
            <Button size="sm" onClick={applyCustomRange}>
              Apply
            </Button>
          </div>
        </PopoverContent>
      </Popover>

      <span className="text-xs text-muted-foreground whitespace-nowrap">
        {rangeLabel}
      </span>
    </div>
  );
}
