import type { Json } from "@/utils/supabase/types";
import {
  getDefaultDeliverySchedule,
  type DeliveryScheduleEntry,
  type ScheduleOverrideEntry,
} from "@/entities/suppliers/model/schedule-types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function parseDeliverySchedule(value: Json): DeliveryScheduleEntry[] {
  if (!Array.isArray(value) || value.length === 0) {
    return getDefaultDeliverySchedule();
  }
  const out: DeliveryScheduleEntry[] = [];
  for (let i = 0; i < 7; i++) {
    const raw = value[i];
    if (!isRecord(raw)) {
      out.push({
        day: i,
        is_order_day: false,
        order_by_time: null,
        delivery_day: null,
      });
      continue;
    }
    out.push({
      day: typeof raw.day === "number" ? raw.day : i,
      is_order_day: Boolean(raw.is_order_day),
      order_by_time: typeof raw.order_by_time === "string" ? raw.order_by_time : null,
      delivery_day: typeof raw.delivery_day === "number" ? raw.delivery_day : null,
    });
  }
  return out;
}

export function serializeDeliverySchedule(entries: DeliveryScheduleEntry[]): Json {
  return entries as unknown as Json;
}

export function parseScheduleOverrides(value: Json): ScheduleOverrideEntry[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((raw) => {
      if (!isRecord(raw)) {
        return null;
      }
      const id = typeof raw.id === "string" ? raw.id : "";
      const name = typeof raw.name === "string" ? raw.name : "";
      const start_date = typeof raw.start_date === "string" ? raw.start_date : "";
      const end_date = typeof raw.end_date === "string" ? raw.end_date : "";
      const note = typeof raw.note === "string" ? raw.note : "";
      if (!id || !name) {
        return null;
      }
      return { id, name, start_date, end_date, note };
    })
    .filter((x): x is ScheduleOverrideEntry => x !== null);
}

export function serializeScheduleOverrides(entries: ScheduleOverrideEntry[]): Json {
  return entries as unknown as Json;
}
