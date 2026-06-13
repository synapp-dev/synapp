import { apiFetchOrThrow } from "@/lib/api/client-envelope";
import type {
  TimesheetEntryDto,
  TimesheetPagePayload,
} from "@/server/workforce/timesheet.service";

export type { TimesheetEntryDto, TimesheetPagePayload };

export function timesheetsApiBase(organisation: string, venue: string) {
  return `/organisations/${encodeURIComponent(organisation)}/venues/${encodeURIComponent(venue)}/workforce/timesheets`;
}

export const timesheetsApi = {
  async fetchPage(
    organisation: string,
    venue: string,
    payPeriodId?: string,
  ): Promise<TimesheetPagePayload> {
    const qs = payPeriodId ? `?payPeriodId=${encodeURIComponent(payPeriodId)}` : "";
    return apiFetchOrThrow<TimesheetPagePayload>(`${timesheetsApiBase(organisation, venue)}${qs}`);
  },

  async clockIn(
    organisation: string,
    venue: string,
    body: { shiftId?: string; lat?: number; lng?: number; at?: string } = {},
  ) {
    return apiFetchOrThrow<{ timesheetId: string; clockedInAt: string }>(
      `${timesheetsApiBase(organisation, venue)}/clock-in`,
      {
        method: "POST",
        body: JSON.stringify(body),
      },
    );
  },

  async clockOut(
    organisation: string,
    venue: string,
    body: { lat?: number; lng?: number; at?: string } = {},
  ) {
    return apiFetchOrThrow<{ timesheetId: string; clockedOutAt: string; hoursWorked: number }>(
      `${timesheetsApiBase(organisation, venue)}/clock-out`,
      {
        method: "POST",
        body: JSON.stringify(body),
      },
    );
  },

  async breakStart(organisation: string, venue: string) {
    return apiFetchOrThrow<{ ok: boolean }>(
      `${timesheetsApiBase(organisation, venue)}/break-start`,
      { method: "POST" },
    );
  },

  async breakEnd(organisation: string, venue: string) {
    return apiFetchOrThrow<{ ok: boolean }>(
      `${timesheetsApiBase(organisation, venue)}/break-end`,
      { method: "POST" },
    );
  },

  async approve(organisation: string, venue: string, timesheetId: string) {
    return apiFetchOrThrow<{ ok: boolean }>(
      `${timesheetsApiBase(organisation, venue)}/entries/${encodeURIComponent(timesheetId)}/approve`,
      { method: "POST" },
    );
  },

  async bulkApprove(organisation: string, venue: string, ids: string[]) {
    return apiFetchOrThrow<{ approved: number }>(
      `${timesheetsApiBase(organisation, venue)}/entries/bulk-approve`,
      {
        method: "POST",
        body: JSON.stringify({ ids }),
      },
    );
  },

  async edit(
    organisation: string,
    venue: string,
    timesheetId: string,
    body: {
      actualStartsAt?: string;
      actualEndsAt?: string;
      actualBreakMinutes?: number;
      reason: string;
    },
  ) {
    return apiFetchOrThrow<{ ok: boolean }>(
      `${timesheetsApiBase(organisation, venue)}/entries/${encodeURIComponent(timesheetId)}`,
      {
        method: "PATCH",
        body: JSON.stringify(body),
      },
    );
  },

  async dispute(
    organisation: string,
    venue: string,
    timesheetId: string,
    body: { claimNotes: string; claimedStartsAt?: string; claimedEndsAt?: string },
  ) {
    return apiFetchOrThrow<{ ok: boolean }>(
      `${timesheetsApiBase(organisation, venue)}/entries/${encodeURIComponent(timesheetId)}/dispute`,
      {
        method: "POST",
        body: JSON.stringify(body),
      },
    );
  },
};
