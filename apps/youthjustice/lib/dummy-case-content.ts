import type { DummyCase } from "@/lib/dummy-cases";

export type CorrespondenceRow = {
  id: string;
  channel: string;
  summary: string;
  date: string;
  worker: string;
};

const correspondenceBySlug: Record<string, CorrespondenceRow[]> = {
  "alex-mendez": [
    {
      id: "1",
      channel: "Email",
      summary: "Court update forwarded to legal aid",
      date: "2026-04-22",
      worker: "A. Patel",
    },
    {
      id: "2",
      channel: "Phone",
      summary: "Check-in after school program",
      date: "2026-04-18",
      worker: "A. Patel",
    },
    {
      id: "3",
      channel: "In-app",
      summary: "Youth confirmed attendance for next meeting",
      date: "2026-04-15",
      worker: "M. Chen",
    },
  ],
  "sam-nguyen": [
    {
      id: "1",
      channel: "SMS",
      summary: "Reminder: appointment tomorrow 10am",
      date: "2026-04-21",
      worker: "M. Chen",
    },
    {
      id: "2",
      channel: "Email",
      summary: "Case plan amendments circulated",
      date: "2026-04-10",
      worker: "J. Okafor",
    },
  ],
  "jordan-williams": [
    {
      id: "1",
      channel: "In-app",
      summary: "Youth requested callback",
      date: "2026-04-23",
      worker: "J. Okafor",
    },
    {
      id: "2",
      channel: "Phone",
      summary: "Spoke with carer re transport",
      date: "2026-04-19",
      worker: "A. Patel",
    },
  ],
};

export function getDummyCorrespondence(slug: DummyCase["slug"]): CorrespondenceRow[] {
  return correspondenceBySlug[slug] ?? correspondenceBySlug["alex-mendez"]!;
}

export type CalendarRow = {
  id: string;
  title: string;
  /** Calendar day (YYYY-MM-DD); should match local date of `startsAt` when set. */
  date: string;
  type: string;
  /** Local wall time, ISO without offset (e.g. 2026-04-28T10:30:00). */
  startsAt?: string;
};

const calendarBySlug: Record<string, CalendarRow[]> = {
  "alex-mendez": [
    {
      id: "0",
      title: "Weekend check-in call",
      date: "2026-04-26",
      type: "Appointment",
      startsAt: "2026-04-26T10:15:00",
    },
    {
      id: "1",
      title: "Children's Court mention",
      date: "2026-05-02",
      type: "Court",
      startsAt: "2026-05-02T09:30:00",
    },
    {
      id: "2",
      title: "Case plan review",
      date: "2026-04-28",
      type: "Meeting",
      startsAt: "2026-04-28T10:30:00",
    },
    {
      id: "2b",
      title: "Carer phone check-in (same day)",
      date: "2026-04-28",
      type: "Appointment",
      startsAt: "2026-04-28T14:00:00",
    },
    {
      id: "3",
      title: "Youth health appointment",
      date: "2026-04-30",
      type: "Appointment",
      startsAt: "2026-04-30T11:45:00",
    },
  ],
  "sam-nguyen": [
    {
      id: "1",
      title: "Legal aid conference",
      date: "2026-05-05",
      type: "Meeting",
      startsAt: "2026-05-05T15:00:00",
    },
    {
      id: "2",
      title: "Community program intake",
      date: "2026-04-27",
      type: "Appointment",
      startsAt: "2026-04-27T09:00:00",
    },
  ],
  "jordan-williams": [
    {
      id: "1",
      title: "Supervision check-in",
      date: "2026-04-26",
      type: "Meeting",
      startsAt: "2026-04-26T16:00:00",
    },
    {
      id: "2",
      title: "Court diversion session",
      date: "2026-05-08",
      type: "Court",
      startsAt: "2026-05-08T10:00:00",
    },
  ],
};

export function getDummyCalendar(slug: DummyCase["slug"]): CalendarRow[] {
  return calendarBySlug[slug] ?? calendarBySlug["alex-mendez"]!;
}
