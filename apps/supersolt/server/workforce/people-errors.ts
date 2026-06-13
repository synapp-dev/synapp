export type PeopleErrorCode =
  | "forbidden"
  | "not_found"
  | "duplicate_email"
  | "award_minimum_override_required"
  | "invalid_tax_treatment_code"
  | "onboard_token_expired"
  | "onboard_token_invalid"
  | "internal_error";

export class PeopleServiceError extends Error {
  status: number;
  code: PeopleErrorCode;

  constructor(
    status: number,
    message: string,
    code: PeopleErrorCode = "internal_error",
  ) {
    super(message);
    this.status = status;
    this.code = code;
  }
}
