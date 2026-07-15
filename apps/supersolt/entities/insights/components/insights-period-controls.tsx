"use client";

import { Check, ChevronDown } from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
import { Input } from "@workspace/ui/components/input";
import {
  Popover,
  PopoverAnchor,
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
import { cn } from "@workspace/ui/lib/utils";
import type { InsightsDatePreset } from "@/entities/insights/model/types";
import { fromDateInputValue, toDateInputValue } from "@/entities/insights/lib/period";
import { useInsightsPeriod } from "@/entities/insights/model/insights-period-provider";

const PRESET_OPTIONS: Array<{ value: InsightsDatePreset; label: string }> = [
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "last-7-days", label: "Last 7 Days" },
  { value: "this-week", label: "This Week" },
  { value: "last-week", label: "Last Week" },
  { value: "this-month", label: "This Month" },
  { value: "last-month", label: "Last Month" },
  { value: "custom", label: "Custom Range" },
];

type InsightsPeriodControlsProps = {
  /** "onHero" restyles the controls as a minimal text dropdown for a dark insights hero card. */
  tone?: "default" | "onHero";
  /** Accent hue for the onHero tone, matching the hero card's module colour. */
  heroAccent?: "emerald" | "indigo";
};

const HERO_ACCENT_CLASSES = {
  emerald: {
    trigger: "text-emerald-100",
    label: "text-emerald-200/80",
  },
  indigo: {
    trigger: "text-indigo-100",
    label: "text-indigo-200/80",
  },
} as const;

export function InsightsPeriodControls({
  tone = "default",
  heroAccent = "emerald",
}: InsightsPeriodControlsProps = {}) {
  const onHero = tone === "onHero";
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

  function handlePresetChange(nextPreset: InsightsDatePreset) {
    setPreset(nextPreset);
    if (nextPreset === "custom") {
      setTimeout(() => setPickerOpen(true), 50);
    }
  }

  const customRangeFields = (
    <>
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
    </>
  );

  if (onHero) {
    const presetLabel =
      PRESET_OPTIONS.find((option) => option.value === preset)?.label ??
      "Period";

    return (
      <div className="flex flex-wrap items-center gap-2.5">
        <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
          <DropdownMenu>
            <PopoverAnchor asChild>
              <DropdownMenuTrigger
                aria-label="Period"
                className={cn(
                  "inline-flex items-center gap-1 rounded text-xs font-medium uppercase tracking-wider outline-none transition-colors",
                  "underline-offset-4 hover:text-white hover:underline focus-visible:underline",
                  HERO_ACCENT_CLASSES[heroAccent].trigger,
                  "dark:text-slate-700 dark:hover:text-slate-900",
                )}
              >
                {presetLabel}
                <ChevronDown className="size-3" aria-hidden />
              </DropdownMenuTrigger>
            </PopoverAnchor>
            <DropdownMenuContent align="start" className="min-w-40">
              {PRESET_OPTIONS.map((option) => (
                <DropdownMenuItem
                  key={option.value}
                  onSelect={() => handlePresetChange(option.value)}
                  className="text-xs"
                >
                  {option.label}
                  {option.value === preset ? (
                    <Check className="ml-auto size-3.5" aria-hidden />
                  ) : null}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <PopoverContent align="start" className="w-[300px] space-y-3">
            {customRangeFields}
          </PopoverContent>
        </Popover>

        <span
          className={cn(
            "whitespace-nowrap text-xs dark:text-slate-600",
            HERO_ACCENT_CLASSES[heroAccent].label,
          )}
        >
          {rangeLabel}
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select
        value={preset}
        onValueChange={(value) => handlePresetChange(value as InsightsDatePreset)}
      >
        <SelectTrigger className="w-[148px]" aria-label="Period">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {PRESET_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.value === "custom" ? "Custom..." : option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" className="h-9">
            Custom Range
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-[300px] space-y-3">
          {customRangeFields}
        </PopoverContent>
      </Popover>

      <span className="whitespace-nowrap text-xs text-muted-foreground">
        {rangeLabel}
      </span>
    </div>
  );
}
