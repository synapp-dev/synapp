import { timingSafeEqual } from "node:crypto";

/**
 * Shared bearer-token check for the CS2 ingest routes. Two hard rules (P0 audit debt,
 * see docs/pug-match-loop-build-decisions.md §1 / §6b):
 *
 *   1. **Fail closed.** If the secret env var is unset, the route is *closed* (500) — it
 *      NEVER falls back to a known default like the old `?? "dev-secret"`. A missing secret
 *      is a misconfiguration, not an open door.
 *   2. **Constant-time compare.** Avoid leaking the secret via response timing.
 *
 * Returns `{ ok: true }` on success, or a `{ ok: false, status, error }` the caller turns
 * into a response. 500 = server misconfigured (no secret); 401 = bad/missing token.
 */
export type BearerResult =
  | { ok: true }
  | { ok: false; status: 401 | 500; error: string };

export function checkBearer(
  authHeader: string | null,
  secret: string | undefined,
): BearerResult {
  if (!secret) {
    // Fail closed — never accept a request when no secret is configured.
    return { ok: false, status: 500, error: "Ingest secret not configured" };
  }
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return { ok: false, status: 401, error: "Unauthorized" };
  }

  const provided = Buffer.from(authHeader.slice("Bearer ".length));
  const expected = Buffer.from(secret);
  // timingSafeEqual throws on length mismatch; the length check itself is not secret.
  if (
    provided.length !== expected.length ||
    !timingSafeEqual(provided, expected)
  ) {
    return { ok: false, status: 401, error: "Unauthorized" };
  }
  return { ok: true };
}
