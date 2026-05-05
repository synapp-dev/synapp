export type NewsActionErrorCode =
  | "VALIDATION"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "DUPLICATE_SLUG"
  | "OVERSIZE_BODY"
  | "UNKNOWN";

export type NewsActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; code: NewsActionErrorCode; message: string };
