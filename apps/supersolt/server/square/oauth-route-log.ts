/**
 * Structured logs for Square OAuth API routes.
 * Never log access tokens, refresh tokens, cookie values, client_secret, or full authorization codes.
 */

function compact(
  details: Record<string, string | number | boolean | null | undefined>
): Record<string, string | number | boolean> {
  const out: Record<string, string | number | boolean> = {};
  for (const [k, v] of Object.entries(details)) {
    if (v === undefined || v === null) continue;
    if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") {
      out[k] = v;
    }
  }
  return out;
}

function line(ns: string, event: string, details?: Record<string, string | number | boolean>): void {
  const suffix = details && Object.keys(details).length ? ` ${JSON.stringify(details)}` : "";
  console.info(`${ns} ${event}${suffix}`);
}

const authorizeNs = "[square-oauth:authorize]";
const callbackNs = "[square-oauth:callback]";

/** First few chars of auth code for correlation only (not secret enough to replay). */
export function oauthAuthCodeHint(code: string): string {
  if (code.length <= 8) return "(short)";
  return `${code.slice(0, 6)}…(len=${code.length})`;
}

export function oauthLogAuthorize(
  event: string,
  details?: Record<string, string | number | boolean | null | undefined>
): void {
  line(authorizeNs, event, details ? compact(details) : undefined);
}

export function oauthLogCallback(
  event: string,
  details?: Record<string, string | number | boolean | null | undefined>
): void {
  line(callbackNs, event, details ? compact(details) : undefined);
}

export function oauthWarnAuthorize(
  event: string,
  details?: Record<string, string | number | boolean | null | undefined>
): void {
  const suffix =
    details && Object.keys(compact(details)).length ? ` ${JSON.stringify(compact(details))}` : "";
  console.warn(`${authorizeNs} ${event}${suffix}`);
}

export function oauthWarnCallback(
  event: string,
  details?: Record<string, string | number | boolean | null | undefined>
): void {
  const suffix =
    details && Object.keys(compact(details)).length ? ` ${JSON.stringify(compact(details))}` : "";
  console.warn(`${callbackNs} ${event}${suffix}`);
}
