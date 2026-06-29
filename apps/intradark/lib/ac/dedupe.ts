import { createHash } from "node:crypto";

/**
 * Composite dedupe key for ac_events. The AC client supplies no trustworthy event id
 * (same lesson as MatchZy / match_events — see pug-match-loop-build-decisions.md §5.1),
 * so idempotency keys on a deterministic hash of the event's identifying content.
 *
 * Stable across key ordering: object keys are sorted before serialization so two
 * logically-identical findings always produce the same key.
 */

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`).join(",")}}`;
}

/**
 * Build the dedupe key from the event's stable identifying parts.
 *
 * @param userId  the owning account (scopes the key per player)
 * @param kind    event kind (e.g. "signature_match")
 * @param parts   the identifying fields (e.g. { signatureValue, matchId }) — NOT
 *                volatile fields like timestamps or full inventories
 */
export function buildEventDedupKey(
  userId: string,
  kind: string,
  parts: Record<string, unknown>,
): string {
  const canonical = `${userId}|${kind}|${stableStringify(parts)}`;
  return createHash("sha256").update(canonical).digest("hex");
}
