"use client";

import { Checkbox } from "@workspace/ui/components/checkbox";
import { Card } from "@workspace/ui/components/card";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@workspace/ui/components/select";
import type { DeliveryScheduleEntry } from "@/entities/suppliers/model/schedule-types";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
const DAY_FULL_LABELS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

type DeliveryScheduleGridProps = {
  schedule: DeliveryScheduleEntry[];
  onChange: (schedule: DeliveryScheduleEntry[]) => void;
  disabled?: boolean;
};

export function DeliveryScheduleGrid({
  schedule,
  onChange,
  disabled = false,
}: DeliveryScheduleGridProps) {
  const entries = schedule.length === 7 ? schedule : schedule.slice(0, 7);

  const updateEntry = (dayIndex: number, updates: Partial<DeliveryScheduleEntry>) => {
    const base =
      entries.length === 7
        ? entries
        : Array.from({ length: 7 }, (_, i) => entries[i] ?? { day: i, is_order_day: false, order_by_time: null, delivery_day: null });
    const updated = base.map((entry, i) => (i === dayIndex ? { ...entry, ...updates } : entry));
    onChange(updated);
  };

  return (
    <Card className="p-4">
      <Label className="mb-3 block text-sm font-semibold">Delivery schedule</Label>
      <div className="-mx-2 overflow-x-auto px-2">
        <div className="grid min-w-[700px] grid-cols-7 gap-2">
          {Array.from({ length: 7 }, (_, idx) => {
            const entry = entries[idx] ?? {
              day: idx,
              is_order_day: false,
              order_by_time: null,
              delivery_day: null,
            };
            return (
              <div
                key={idx}
                className={`space-y-3 rounded-lg border p-3 ${
                  entry.is_order_day ? "border-primary/40 bg-primary/5" : "border-muted"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Checkbox
                    id={`order-day-${idx}`}
                    checked={entry.is_order_day}
                    disabled={disabled}
                    onCheckedChange={(checked) =>
                      updateEntry(idx, {
                        is_order_day: checked === true,
                        order_by_time: checked ? (entry.order_by_time || "14:00") : null,
                        delivery_day: checked ? entry.delivery_day : null,
                      })
                    }
                  />
                  <Label htmlFor={`order-day-${idx}`} className="cursor-pointer text-sm font-semibold">
                    {DAY_LABELS[idx]}
                  </Label>
                </div>

                {entry.is_order_day ? (
                  <>
                    <div>
                      <Label className="text-[10px] text-muted-foreground">Order by</Label>
                      <Input
                        type="time"
                        value={entry.order_by_time || "14:00"}
                        disabled={disabled}
                        className="mt-1 h-8 text-xs"
                        onChange={(e) => updateEntry(idx, { order_by_time: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label className="text-[10px] text-muted-foreground">Delivery day</Label>
                      <Select
                        value={entry.delivery_day?.toString() ?? ""}
                        disabled={disabled}
                        onValueChange={(v) => updateEntry(idx, { delivery_day: Number.parseInt(v, 10) })}
                      >
                        <SelectTrigger className="mt-1 h-8 text-xs">
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                        <SelectContent>
                          {DAY_FULL_LABELS.map((label, i) => (
                            <SelectItem key={i} value={String(i)}>
                              {label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
      <p className="mt-2 text-[10px] text-muted-foreground">
        Check days when orders can be placed. Set cut-off time and expected delivery day for each.
      </p>
    </Card>
  );
}
