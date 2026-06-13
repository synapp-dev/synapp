export type TimesheetErrorCode =
  | "forbidden"
  | "timesheet_not_found"
  | "timesheet_locked"
  | "invalid_status_transition"
  | "already_clocked_in"
  | "no_active_clock"
  | "no_roster_review_required"
  | "owner_approval_required"
  | "reason_required"
  | "dispute_pending"
  | "bulk_not_eligible"
  | "period_closed"
  | "internal_error";

export class TimesheetServiceError extends Error {
  status: number;
  code: TimesheetErrorCode;

  constructor(status: number, message: string, code: TimesheetErrorCode = "internal_error") {
    super(message);
    this.status = status;
    this.code = code;
  }
}
