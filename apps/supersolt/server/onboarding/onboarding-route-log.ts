/**
 * Structured logs for onboarding API routes.
 * Never log SUPABASE_SERVICE_ROLE_KEY, request bodies, ABNs, or other secrets.
 */

type LogDetails = Record<string, string | number | boolean | null | undefined>;

const MAX_ERROR_MESSAGE_LEN = 500;
const MAX_STACK_LEN = 8000;

const namespaces = {
  organisation: "[onboarding:organisation]",
  venue: "[onboarding:venue]",
  finalize: "[onboarding:finalize]",
  state: "[onboarding:state]",
} as const;

type OnboardingRoute = keyof typeof namespaces;

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

function truncateString(value: string, maxLen: number): string {
  if (value.length <= maxLen) return value;
  return `${value.slice(0, maxLen)}…(truncated,len=${value.length})`;
}

function line(
  route: OnboardingRoute,
  level: "error" | "warn",
  event: string,
  details?: LogDetails
): void {
  const ns = namespaces[route];
  const suffix =
    details && Object.keys(compact(details)).length ? ` ${JSON.stringify(compact(details))}` : "";
  const msg = `${ns} ${event}${suffix}`;
  if (level === "warn") {
    console.warn(msg);
  } else {
    console.error(msg);
  }
}

function errorDetailsFromUnknown(e: unknown): { errorMessage: string; stack?: string } {
  if (e instanceof Error) {
    return {
      errorMessage: truncateString(e.message || "Error", MAX_ERROR_MESSAGE_LEN),
      stack: e.stack ? truncateString(e.stack, MAX_STACK_LEN) : undefined,
    };
  }
  return { errorMessage: truncateString(String(e), MAX_ERROR_MESSAGE_LEN) };
}

export function onboardingLogOrganisationError(event: string, details?: LogDetails): void {
  line("organisation", "error", event, details);
}

export function onboardingLogOrganisationWarn(event: string, details?: LogDetails): void {
  line("organisation", "warn", event, details);
}

export function onboardingLogVenueError(event: string, details?: LogDetails): void {
  line("venue", "error", event, details);
}

export function onboardingLogVenueWarn(event: string, details?: LogDetails): void {
  line("venue", "warn", event, details);
}

export function onboardingLogFinalizeError(event: string, details?: LogDetails): void {
  line("finalize", "error", event, details);
}

export function onboardingLogFinalizeWarn(event: string, details?: LogDetails): void {
  line("finalize", "warn", event, details);
}

export function onboardingLogStateError(event: string, details?: LogDetails): void {
  line("state", "error", event, details);
}

export function onboardingLogStateWarn(event: string, details?: LogDetails): void {
  line("state", "warn", event, details);
}

export { errorDetailsFromUnknown };
