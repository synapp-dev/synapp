export type AwardErrorCode =
  | "forbidden"
  | "award_not_loaded"
  | "classification_not_found"
  | "rate_not_effective"
  | "penalty_schedule_gap"
  | "validation_error"
  | "awr_already_applied"
  | "internal_error";

export class AwardServiceError extends Error {
  status: number;
  code: AwardErrorCode;

  constructor(status: number, message: string, code: AwardErrorCode = "internal_error") {
    super(message);
    this.status = status;
    this.code = code;
  }
}
