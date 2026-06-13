export type PayrollErrorCode =
  | "forbidden"
  | "pay_run_not_found"
  | "pay_period_not_found"
  | "pay_period_not_found"
  | "invalid_status_transition"
  | "pay_run_locked"
  | "preflight_required"
  | "preflight_hard_block"
  | "wage_theft_block"
  | "no_approved_timesheets"
  | "xero_not_connected"
  | "xero_payroll_unavailable"
  | "xero_push_failed"
  | "xero_validation_error"
  | "reason_required"
  | "internal_error";

export class PayrollServiceError extends Error {
  status: number;
  code: PayrollErrorCode;

  constructor(status: number, message: string, code: PayrollErrorCode = "internal_error") {
    super(message);
    this.status = status;
    this.code = code;
  }
}
