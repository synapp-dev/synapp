export type TeamActionErrorCode =
  | "VALIDATION"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "DUPLICATE_SLUG"
  | "STEAM_REQUIRED"
  | "UNAUTHORIZED"
  | "UNKNOWN";

export type TeamActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; code: TeamActionErrorCode; message: string };
