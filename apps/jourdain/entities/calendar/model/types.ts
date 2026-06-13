export type CalendarEvent = {
  id: string;
  title: string;
  /** ISO datetime for timed events, YYYY-MM-DD for all-day events. */
  start: string;
  /** ISO datetime for timed events; for all-day events the (exclusive) end date. */
  end: string;
  allDay: boolean;
  location: string | null;
  htmlLink: string | null;
};

export type CreateEventInput = {
  title: string;
  date: string; // YYYY-MM-DD
  allDay: boolean;
  startTime?: string; // HH:mm — required when not allDay
  endTime?: string; // HH:mm — defaults to startTime + 1h
  timeZone?: string; // IANA zone from the browser
};

export type GoogleStatus = {
  configured: boolean;
  connected: boolean;
  email: string | null;
};
