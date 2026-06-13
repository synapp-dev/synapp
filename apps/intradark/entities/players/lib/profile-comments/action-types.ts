export type ProfileCommentActionErrorCode =
  | "UNAUTHORIZED"
  | "STEAM_NOT_LINKED"
  | "VALIDATION"
  | "PARENT_INVALID"
  | "DEPTH_EXCEEDED"
  | "SELF_VOTE_NOT_ALLOWED"
  | "FORBIDDEN"
  | "RATE_LIMIT_COMMENTS"
  | "RATE_LIMIT_TRUST_VOTE"
  | "COMMENT_NOT_FOUND"
  | "SERVER_ERROR";

export type ProfileCommentActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; code: ProfileCommentActionErrorCode; message: string };
