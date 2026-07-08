import pLimit from "p-limit";

/**
 * Xero allows ~5 concurrent requests per tenant and returns 429 above that (and
 * above its per-minute limit). Every Xero HTTP call should go through this single
 * process-wide queue so we never have more than {@link XERO_MAX_CONCURRENCY} in
 * flight at once. A call that can't get a slot WAITS for one to free up — it does
 * not jump the queue or get dropped.
 *
 * On a throttle response (429) or transient 5xx/network error, the call holds its
 * slot and retries after a backoff (honouring Retry-After when present), so a
 * throttled request waits its turn and eventually succeeds rather than being
 * silently treated as a failure by the caller.
 */
const XERO_MAX_CONCURRENCY = Math.max(
  1,
  Number(process.env.XERO_MAX_CONCURRENCY) || 5,
);

const limit = pLimit(XERO_MAX_CONCURRENCY);

/** Run an arbitrary Xero request body inside the shared concurrency queue. */
export function runQueuedXeroRequest<T>(fn: () => Promise<T>): Promise<T> {
  return limit(fn);
}

const MAX_RETRIES = 6;
/** Per-minute throttling isn't a failure, it's a wait — give it a much longer
 * leash than network errors before declaring a request dead. */
const MAX_THROTTLE_RETRIES = 15;
const DEFAULT_BACKOFF_MS = 1_000;
const MAX_BACKOFF_MS = 30_000;
/** Xero's minute-limit Retry-After can be a full 60s — honour it completely
 * (capped only against absurd values), or we retry into a still-closed window. */
const MAX_RETRY_AFTER_MS = 120_000;
/** Abort a single attempt that hangs, so it can't occupy a slot indefinitely. */
const REQUEST_TIMEOUT_MS = Math.max(
  5_000,
  Number(process.env.XERO_REQUEST_TIMEOUT_MS) || 45_000,
);

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function retryDelayMs(res: Response | null, attempt: number): number {
  // Xero sends Retry-After (seconds) on 429; respect it fully when present.
  const header = res?.headers.get("Retry-After");
  if (header) {
    const seconds = Number(header);
    if (Number.isFinite(seconds) && seconds > 0) {
      // A second of grace so we don't knock a moment before the window reopens.
      return Math.min(seconds * 1_000 + 1_000, MAX_RETRY_AFTER_MS);
    }
  }
  // Otherwise exponential backoff with a little jitter.
  const base = Math.min(DEFAULT_BACKOFF_MS * 2 ** attempt, MAX_BACKOFF_MS);
  return base + Math.floor(base * 0.2 * Math.random());
}

/**
 * Fleet-wide brake driven by Xero's X-MinLimit-Remaining header: when the
 * minute budget runs low, every worker pauses before its next attempt instead
 * of racing into a 429 storm. Converts bursty throttling into smooth pacing.
 * A 429's Retry-After also arms it, so ONE throttle response pauses the whole
 * fleet for the cooldown instead of four other workers piling into the wall.
 */
let minuteBrakeUntilMs = 0;

/**
 * When the Xero fleet is paused (429 cooldown / minute budget spent), the
 * epoch-ms timestamp attempts resume at — 0 when running freely. Surfaced to
 * import progress so the UI can show "hit Xero's limit, resuming in 0:42".
 */
export function getXeroThrottlePauseUntilMs(): number {
  return minuteBrakeUntilMs > Date.now() ? minuteBrakeUntilMs : 0;
}

function armFleetBrake(untilMs: number): void {
  minuteBrakeUntilMs = Math.max(minuteBrakeUntilMs, untilMs);
}

/**
 * The most recent 429 we absorbed, observable by long-running jobs: the import
 * watcher polls this and turns each hit into a visible event-log line, so a
 * throttle on the very first call shows up in the UI instead of reading as a
 * silent stall. `seq` increments per hit so pollers can detect "new since last
 * look" without timestamps.
 */
export type XeroThrottleEvent = {
  seq: number;
  atMs: number;
  path: string;
  waitSeconds: number;
  untilMs: number;
  attempt: string;
};

let throttleEventSeq = 0;
let lastThrottleEvent: XeroThrottleEvent | null = null;

export function getLastXeroThrottleEvent(): XeroThrottleEvent | null {
  return lastThrottleEvent;
}

function noteRateLimitHeaders(res: Response): void {
  const remaining = Number(res.headers.get("X-MinLimit-Remaining"));
  if (!Number.isFinite(remaining)) return;
  // The window refills each minute; spread the last few calls across it.
  const brakeMs =
    remaining <= 1 ? 20_000 : remaining <= 3 ? 8_000 : remaining <= 6 ? 3_000 : 0;
  if (brakeMs > 0) {
    armFleetBrake(Date.now() + brakeMs);
  }
}

const isTransientStatus = (status: number) => status === 429 || status >= 500;

/**
 * Human-readable explanation of a Xero rate-limit hit, with the actual local
 * reset time worked out from the 429's Retry-After. Pure (takes `nowMs` and the
 * venue `timezone`) so it's testable and timezone-correct for the operator.
 */
export function describeXeroRateLimit(args: {
  retryAfterSeconds: number | null;
  problem: string | null;
  timezone: string;
  nowMs: number;
}): string {
  const which =
    args.problem === "daily"
      ? "daily API limit"
      : args.problem === "minute"
        ? "per-minute API limit"
        : args.problem === "app"
          ? "app-wide API limit"
          : "API limit";

  if (args.retryAfterSeconds == null) {
    return `Xero's ${which} was reached. Please try again shortly.`;
  }

  const resetAt = new Date(args.nowMs + args.retryAfterSeconds * 1000);
  const totalMinutes = Math.round(args.retryAfterSeconds / 60);
  const relative =
    totalMinutes >= 60
      ? `${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60}m`
      : `${Math.max(1, totalMinutes)}m`;

  let clock: string;
  try {
    clock = new Intl.DateTimeFormat("en-AU", {
      timeZone: args.timezone,
      weekday: "short",
      hour: "numeric",
      minute: "2-digit",
    }).format(resetAt);
  } catch {
    clock = resetAt.toISOString();
  }

  return `Xero ${which} reached — resumes ${clock} (in ~${relative}).`;
}

/**
 * Thrown when Xero reports the daily (or app-wide) call limit — retrying within
 * the same day is pointless, so callers should surface this and stop rather than
 * back off for hours. The per-minute limit is NOT this; that just backs off.
 */
export class XeroRateLimitError extends Error {
  constructor(
    readonly problem: "daily" | "app",
    readonly retryAfterSeconds: number | null,
  ) {
    // The daily cap is a rolling 24h window (5000 calls/tenant), so the only
    // honest resume time is Xero's own Retry-After, relayed as "~9h 38m".
    const resumeIn = (() => {
      if (retryAfterSeconds == null || retryAfterSeconds <= 0) return null;
      const totalMinutes = Math.ceil(retryAfterSeconds / 60);
      return totalMinutes >= 60
        ? `~${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60}m`
        : `~${totalMinutes}m`;
    })();
    super(
      problem === "daily"
        ? `Xero's daily API limit is used up${resumeIn ? ` — it frees up in ${resumeIn}` : ""}. Everything already imported is saved; running the import again after that picks up right where it left off.`
        : `Xero's app-wide API limit was reached${resumeIn ? ` — try again in ${resumeIn}` : ""}.`,
    );
    this.name = "XeroRateLimitError";
  }
}

/** One fetch attempt, occupying a queue slot only for the network call itself. */
async function attemptFetch(url: string, init: RequestInit): Promise<Response> {
  return runQueuedXeroRequest(async () => {
    // Fleet-wide brake: when the minute budget is nearly spent, every slot
    // pauses here instead of racing Xero into a 429 storm.
    const brakeMs = minuteBrakeUntilMs - Date.now();
    if (brakeMs > 0) await sleep(brakeMs);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const res = await fetch(url, { ...init, signal: controller.signal });
      noteRateLimitHeaders(res);
      return res;
    } finally {
      clearTimeout(timer);
    }
  });
}

/**
 * `fetch` a Xero endpoint through the shared queue, retrying on throttle/transient
 * errors. Crucially, the concurrency slot is held ONLY for each network attempt —
 * the backoff wait happens with the slot released, so a throttled request never
 * blocks the other four slots (which is what caused the importer to stall when
 * all five were sleeping on Retry-After at once). Per-minute throttling has its
 * own, much larger retry budget than network errors: being asked to wait is
 * normal during a bulk import and must not surface as a failed bill.
 */
export async function fetchXero(
  url: string,
  init: RequestInit,
): Promise<Response> {
  let errorAttempts = 0;
  let throttleAttempts = 0;
  for (;;) {
    let res: Response;
    try {
      res = await attemptFetch(url, init);
    } catch (error) {
      // Network blip or per-attempt timeout — retry unless we're out of attempts.
      errorAttempts += 1;
      if (errorAttempts > MAX_RETRIES) throw error;
      await sleep(retryDelayMs(null, errorAttempts));
      continue;
    }
    if (res.status === 429) {
      // A daily/app-wide limit won't clear by backing off within the run — bail
      // now with a clear error instead of burning the remaining retries. Xero
      // doesn't reliably send X-Rate-Limit-Problem (observed live: a spent day
      // budget answered with no problem header, Retry-After 34656s and a FULL
      // minute window), so infer it too: an hours-long Retry-After or an
      // exhausted day counter cannot be minute throttling.
      const problem = res.headers.get("X-Rate-Limit-Problem")?.toLowerCase();
      const retryAfterSeconds = Number(res.headers.get("Retry-After"));
      const dayRemaining = Number(res.headers.get("X-DayLimit-Remaining"));
      const looksDaily =
        problem === "daily" ||
        (Number.isFinite(dayRemaining) && dayRemaining <= 0) ||
        (Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 300);
      if (looksDaily || problem === "app") {
        await res.text().catch(() => undefined);
        throw new XeroRateLimitError(
          problem === "app" ? "app" : "daily",
          Number.isFinite(retryAfterSeconds) ? retryAfterSeconds : null,
        );
      }
      throttleAttempts += 1;
      if (throttleAttempts > MAX_THROTTLE_RETRIES) return res;
      // Drain the body so the connection frees up, pause the WHOLE fleet for
      // the cooldown (one 429 means everyone waits, not just this request),
      // then wait it out and re-acquire a slot for the retry.
      await res.text().catch(() => undefined);
      const delay = retryDelayMs(res, throttleAttempts);
      armFleetBrake(Date.now() + delay);
      const path = (() => {
        try {
          return new URL(url).pathname;
        } catch {
          return url;
        }
      })();
      throttleEventSeq += 1;
      lastThrottleEvent = {
        seq: throttleEventSeq,
        atMs: Date.now(),
        path,
        waitSeconds: Math.round(delay / 1_000),
        untilMs: Date.now() + delay,
        attempt: `${throttleAttempts}/${MAX_THROTTLE_RETRIES}`,
      };
      console.warn("[xero] throttled — waiting out the cooldown", {
        path,
        waitSeconds: Math.round(delay / 1_000),
        attempt: `${throttleAttempts}/${MAX_THROTTLE_RETRIES}`,
        retryAfter: res.headers.get("Retry-After"),
        problem: res.headers.get("X-Rate-Limit-Problem"),
        minuteRemaining: res.headers.get("X-MinLimit-Remaining"),
        dayRemaining: res.headers.get("X-DayLimit-Remaining"),
      });
      await sleep(delay);
      continue;
    }
    if (isTransientStatus(res.status)) {
      errorAttempts += 1;
      if (errorAttempts > MAX_RETRIES) return res;
      await res.text().catch(() => undefined);
      await sleep(retryDelayMs(res, errorAttempts));
      continue;
    }
    return res;
  }
}
