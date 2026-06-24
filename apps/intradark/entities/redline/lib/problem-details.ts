import type { RedlineProblemDetails } from "./types";

/**
 * Decode a Redline RFC 7807 Problem Details out of an arbitrary response.
 *
 * Client-safe (no `server-only`) so the test console can use it. Our proxy
 * routes wrap panel errors as `{ error, status, body }` where `body` is the
 * ProblemDetails; raw panel responses carry it at the top level. This handles
 * both, plus the occasional double-nesting, and ignores anything else.
 */

/** A ProblemDetails always has a string `code` (its only required field). */
export function isProblemDetails(x: unknown): x is RedlineProblemDetails {
  return (
    typeof x === "object" &&
    x !== null &&
    typeof (x as { code?: unknown }).code === "string"
  );
}

/** Pull the ProblemDetails from a response, or `null` if there isn't one. */
export function extractProblemDetails(data: unknown): RedlineProblemDetails | null {
  if (isProblemDetails(data)) return data;
  if (typeof data === "object" && data !== null) {
    const body = (data as { body?: unknown }).body;
    if (isProblemDetails(body)) return body;
  }
  return null;
}

/** Compact one-line summary for logging / toasts. */
export function summarizeProblem(p: RedlineProblemDetails): string {
  const bits = [p.code];
  if (p.detail) bits.push(p.detail);
  if (p.correlation_id) bits.push(`(corr ${p.correlation_id})`);
  return bits.join(" — ");
}
