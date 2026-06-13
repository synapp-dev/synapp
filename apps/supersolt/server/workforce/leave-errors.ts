export type LeaveErrorCode =
  | "forbidden"
  | "insufficient_balance"
  | "negative_balance_not_allowed"
  | "owner_approval_required"
  | "lsl_insufficient_balance"
  | "invalid_status_transition"
  | "leave_type_not_applicable"
  | "leave_type_not_found"
  | "request_not_found"
  | "invalid_date_range"
  | "internal_error";

export class LeaveServiceError extends Error {
  status: number;
  code: LeaveErrorCode;

  constructor(status: number, message: string, code: LeaveErrorCode = "internal_error") {
    super(message);
    this.status = status;
    this.code = code;
  }
}
