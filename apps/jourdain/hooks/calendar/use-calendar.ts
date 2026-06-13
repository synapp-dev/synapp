"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { calendarApi } from "@/entities/calendar/api/endpoints";
import type {
  CalendarEvent,
  CreateEventInput,
  GoogleStatus,
} from "@/entities/calendar/model/types";

export const googleStatusQueryKey = ["google-status"] as const;
export const calendarEventsQueryKey = ["calendar-events"] as const;

export function useGoogleStatus() {
  return useQuery({
    queryKey: googleStatusQueryKey,
    queryFn: async (): Promise<GoogleStatus> => {
      const result = await calendarApi.get.status();
      if (result.error) throw new Error(result.error.message);
      return result.data;
    },
  });
}

export function useCalendarEvents(
  startISO: string,
  endISO: string,
  enabled: boolean
) {
  return useQuery({
    queryKey: [...calendarEventsQueryKey, startISO, endISO],
    queryFn: async (): Promise<CalendarEvent[]> => {
      const result = await calendarApi.get.events(startISO, endISO);
      if (result.error) throw new Error(result.error.message);
      return result.data;
    },
    enabled,
    staleTime: 60_000,
  });
}

export function useCreateEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateEventInput): Promise<CalendarEvent> => {
      const result = await calendarApi.post.createEvent(input);
      if (result.error) throw new Error(result.error.message);
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: calendarEventsQueryKey });
    },
  });
}

export function useDeleteEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (eventId: string): Promise<void> => {
      const result = await calendarApi.delete.event(eventId);
      if (result.error) throw new Error(result.error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: calendarEventsQueryKey });
    },
  });
}

export function useDisconnectGoogle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (): Promise<void> => {
      const result = await calendarApi.post.disconnect();
      if (result.error) throw new Error(result.error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: googleStatusQueryKey });
      queryClient.invalidateQueries({ queryKey: calendarEventsQueryKey });
    },
  });
}
