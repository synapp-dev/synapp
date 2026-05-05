export type ForumActionErrorCode =
  | "UNAUTHORIZED"
  | "VALIDATION"
  | "CATEGORY_NOT_FOUND"
  | "THREAD_NOT_FOUND"
  | "THREAD_SLUG_TAKEN"
  | "PARENT_REPLY_INVALID"
  | "REPLY_DEPTH_EXCEEDED"
  | "FORBIDDEN"
  | "SERVER_ERROR";

export type ForumActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; code: ForumActionErrorCode; message: string };
