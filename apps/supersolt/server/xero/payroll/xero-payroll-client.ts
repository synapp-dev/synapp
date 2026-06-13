export type XeroPayrollPushResult =
  | { ok: true; payRunId: string; tenantId: string }
  | { ok: false; code: string; message: string; status?: number };

export type XeroPayrollPushPayload = {
  payRunId: string;
  periodStart: string;
  periodEnd: string;
  payDate: string;
  employees: Array<{
    userProfileId: string;
    grossCents: number;
    superCents: number;
    paygCents: number;
    netCents: number;
    hoursTotal: number;
  }>;
};

/**
 * Xero PayRun client. Uses venue OAuth tokens when payroll scopes are configured.
 * Falls back to mock success in development when XERO_PAYROLL_MOCK=1.
 */
export async function pushPayRunToXero(args: {
  accessToken: string;
  tenantId: string;
  payload: XeroPayrollPushPayload;
}): Promise<XeroPayrollPushResult> {
  if (process.env.XERO_PAYROLL_MOCK === "1") {
    return {
      ok: true,
      payRunId: `mock-xero-${args.payload.payRunId}`,
      tenantId: args.tenantId,
    };
  }

  // TODO: wire Xero Payroll AU PayRun API when OAuth scopes are enabled.
  return {
    ok: false,
    code: "xero_payroll_unavailable",
    message:
      "Xero Payroll API is not configured. Connect Xero with payroll scopes in Settings → Integrations.",
  };
}

export function digestPayload(payload: XeroPayrollPushPayload): string {
  return JSON.stringify({
    payRunId: payload.payRunId,
    periodStart: payload.periodStart,
    periodEnd: payload.periodEnd,
    employeeCount: payload.employees.length,
    grossTotal: payload.employees.reduce((s, e) => s + e.grossCents, 0),
  });
}
