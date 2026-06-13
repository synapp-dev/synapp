import { apiFetchOrThrow } from "@/lib/api/client-envelope";
import type { PayrollPagePayload, PayRunSummaryDto } from "@/server/workforce/payroll-export/payroll.service";

export type { PayrollPagePayload, PayRunSummaryDto };

export function payrollApiBase(organisation: string) {
  return `/organisations/${encodeURIComponent(organisation)}/workforce/payroll-export`;
}

export const payrollApi = {
  async fetchPage(organisation: string, venue: string): Promise<PayrollPagePayload> {
    const q = new URLSearchParams({ venue });
    return apiFetchOrThrow<PayrollPagePayload>(`${payrollApiBase(organisation)}?${q}`);
  },

  async prepare(organisation: string, payPeriodId: string): Promise<PayRunSummaryDto> {
    return apiFetchOrThrow<PayRunSummaryDto>(`${payrollApiBase(organisation)}/runs/prepare`, {
      method: "POST",
      body: JSON.stringify({ payPeriodId }),
    });
  },

  async preflight(organisation: string, payRunId: string) {
    return apiFetchOrThrow<unknown>(
      `${payrollApiBase(organisation)}/runs/${payRunId}/preflight`,
      { method: "POST" },
    );
  },

  async calculate(organisation: string, payRunId: string): Promise<PayRunSummaryDto> {
    return apiFetchOrThrow<PayRunSummaryDto>(
      `${payrollApiBase(organisation)}/runs/${payRunId}/calculate`,
      { method: "POST" },
    );
  },

  async submit(organisation: string, payRunId: string): Promise<PayRunSummaryDto> {
    return apiFetchOrThrow<PayRunSummaryDto>(
      `${payrollApiBase(organisation)}/runs/${payRunId}/submit`,
      { method: "POST" },
    );
  },

  async approve(organisation: string, payRunId: string): Promise<PayRunSummaryDto> {
    return apiFetchOrThrow<PayRunSummaryDto>(
      `${payrollApiBase(organisation)}/runs/${payRunId}/approve`,
      { method: "POST" },
    );
  },

  async returnToManager(
    organisation: string,
    payRunId: string,
    notes: string,
  ): Promise<PayRunSummaryDto> {
    return apiFetchOrThrow<PayRunSummaryDto>(
      `${payrollApiBase(organisation)}/runs/${payRunId}/return`,
      {
        method: "POST",
        body: JSON.stringify({ notes }),
      },
    );
  },

  async execute(
    organisation: string,
    payRunId: string,
    venue: string,
  ): Promise<PayRunSummaryDto> {
    return apiFetchOrThrow<PayRunSummaryDto>(
      `${payrollApiBase(organisation)}/runs/${payRunId}/execute`,
      {
        method: "POST",
        body: JSON.stringify({ venue }),
      },
    );
  },

  async retryXero(
    organisation: string,
    payRunId: string,
    venue: string,
  ): Promise<PayRunSummaryDto> {
    return apiFetchOrThrow<PayRunSummaryDto>(
      `${payrollApiBase(organisation)}/runs/${payRunId}/retry-xero`,
      {
        method: "POST",
        body: JSON.stringify({ venue }),
      },
    );
  },
};
