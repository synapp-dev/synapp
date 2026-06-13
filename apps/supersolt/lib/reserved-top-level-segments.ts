/** Top-level path segments that are not organisation slugs. */
export const RESERVED_TOP_LEVEL_SEGMENTS = new Set([
  "auth",
  "agent",
  "dashboard",
  "about",
  "support",
  "settings",
  "logout",
  "setup",
  "api",
  "_next",
  "images",
]);

export function isReservedTopLevelSegment(segment: string): boolean {
  return RESERVED_TOP_LEVEL_SEGMENTS.has(segment);
}
