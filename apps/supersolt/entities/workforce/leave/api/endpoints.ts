import { apiFetchOrThrow } from "@/lib/api/client-envelope";
import type { LeaveBalanceDto, LeavePagePayload, LeaveRequestDto } from "@/server/workforce/leave.service";

export type { LeaveBalanceDto, LeavePagePayload, LeaveRequestDto };

export function leaveApiBase(organisation: string, venue: string) {
  return `/organisations/${encodeURIComponent(organisation)}/venues/${encodeURIComponent(venue)}/workforce/leave`;
}

export const leaveApi = {
  async fetchPage(organisation: string, venue: string): Promise<LeavePagePayload> {
    return apiFetchOrThrow<LeavePagePayload>(leaveApiBase(organisation, venue));
  },

  async createRequest(
    organisation: string,
    venue: string,
    body: {
      leaveTypeId: string;
      startDate: string;
      endDate: string;
      reason?: string;
      commentsToManager?: string;
    },
  ): Promise<LeaveRequestDto> {
    return apiFetchOrThrow<LeaveRequestDto>(leaveApiBase(organisation, venue), {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  async decide(
    organisation: string,
    venue: string,
    requestId: string,
    body: { approved: boolean; reason?: string; rosterResolution?: { mode: "unassign_all" | "keep_all" } },
  ) {
    return apiFetchOrThrow<{ ok: boolean }>(
      `${leaveApiBase(organisation, venue)}/requests/${encodeURIComponent(requestId)}/decision`,
      {
        method: "POST",
        body: JSON.stringify(body),
      },
    );
  },

  async withdraw(organisation: string, venue: string, requestId: string) {
    return apiFetchOrThrow<{ ok: boolean }>(
      `${leaveApiBase(organisation, venue)}/requests/${encodeURIComponent(requestId)}/withdraw`,
      { method: "POST" },
    );
  },

  async cancel(organisation: string, venue: string, requestId: string, reason?: string) {
    return apiFetchOrThrow<{ ok: boolean }>(
      `${leaveApiBase(organisation, venue)}/requests/${encodeURIComponent(requestId)}/cancel`,
      {
        method: "POST",
        body: JSON.stringify({ reason }),
      },
    );
  },
};
