import { apiFetch, type ApiResult } from "@/lib/api/fetcher.client";
import type {
  CalendarEvent,
  CreateEventInput,
  GoogleStatus,
} from "@/entities/calendar/model/types";

export const calendarApi = {
  get: {
    status(): Promise<ApiResult<GoogleStatus>> {
      return apiFetch<GoogleStatus>("/google/status");
    },
    events(startISO: string, endISO: string): Promise<ApiResult<CalendarEvent[]>> {
      const qs = new URLSearchParams({ start: startISO, end: endISO });
      return apiFetch<CalendarEvent[]>(`/calendar/events?${qs.toString()}`);
    },
  },
  post: {
    createEvent(input: CreateEventInput): Promise<ApiResult<CalendarEvent>> {
      return apiFetch<CalendarEvent>("/calendar/events", {
        method: "POST",
        body: JSON.stringify(input),
      });
    },
    disconnect(): Promise<ApiResult<{ disconnected: boolean }>> {
      return apiFetch<{ disconnected: boolean }>("/google/disconnect", {
        method: "POST",
      });
    },
  },
  delete: {
    event(eventId: string): Promise<ApiResult<{ id: string }>> {
      return apiFetch<{ id: string }>(`/calendar/events/${eventId}`, {
        method: "DELETE",
      });
    },
  },
};
