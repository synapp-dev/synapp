import type { calendar_v3 } from "googleapis";
import type { CalendarEvent } from "@/entities/calendar/model/types";

export function mapEvent(event: calendar_v3.Schema$Event): CalendarEvent {
  return {
    id: event.id ?? "",
    title: event.summary ?? "(untitled)",
    start: event.start?.dateTime ?? event.start?.date ?? "",
    end: event.end?.dateTime ?? event.end?.date ?? "",
    allDay: !event.start?.dateTime,
    location: event.location ?? null,
    htmlLink: event.htmlLink ?? null,
  };
}
