"use client";

import { useEffect, useRef, useState } from "react";
import { AlertTriangle, Check, Loader2 } from "lucide-react";

import { Progress } from "@workspace/ui/components/progress";
import { cn } from "@workspace/ui/lib/utils";

import { AgentBotAvatarVideo } from "@/entities/ai-agent-chat/components/agent-bot-avatar-video";
import { SuperbotSpeechBubble } from "@/entities/inventory-setup/components/wizard/superbot-speech-bubble";
import { XeroThrottleCountdown } from "@/entities/inventory-setup/components/xero-throttle-countdown";
import type {
  ImportJobInvoiceActivity,
  ImportJobRow,
  ImportJobStep,
  ImportJobStepLogEvent,
} from "@/entities/inventory-setup/model/import-job-types";

// Goofy little lines Superbot cycles through while it's heads-down on an invoice.
const READING_PHRASES = [
  "Putting on my reading glasses…",
  "Squinting at the fine print…",
  "Verifying supplier connections…",
  "Crunching the numbers…",
  "Decoding the handwriting…",
  "Counting up the line items…",
  "Sniffing out sneaky fees…",
  "Matching items to your catalog…",
  "Double-checking the totals…",
  "Translating accountant-speak…",
  "Untangling the tax columns…",
  "Following the money…",
] as const;

// Per-step narration for the speech bubble, keyed by the running step id.
const STEP_NARRATION: Record<string, string> = {
  suppliers: "Syncing your suppliers across from Xero…",
  invoices: "Now I'm pulling your invoice history down from Xero — just the headers for now.",
  parse_pdfs:
    "Time to actually read your invoices. I'll open each bill and pull out every line item.",
  raw_items: "Tidying all those lines into one clean supplier item list…",
  delivery: "Last thing — working out which days each supplier delivers.",
};

/** "$1,840" — compact AUD from cents, or null when we don't have an amount. */
function formatAud(cents: number | null): string | null {
  if (cents == null) return null;
  return `$${Math.round(cents / 100).toLocaleString()}`;
}

/** Rough "~3 min left" from elapsed time and how many of N are done. */
function etaText(elapsedMs: number, current: number, total: number): string | null {
  if (!elapsedMs || current <= 0 || current >= total) return null;
  const remainingMs = (elapsedMs / current) * (total - current);
  const seconds = Math.round(remainingMs / 1000);
  if (seconds < 60) return `~${Math.max(1, seconds)}s left`;
  return `~${Math.round(seconds / 60)} min left`;
}

/** Cycles a goofy phrase every ~1.5s while `active`, offset by `seed` so cards desync. */
function useLoopingPhrase(active: boolean, seed: number): string {
  const [i, setI] = useState(() => Math.abs(seed) % READING_PHRASES.length);
  useEffect(() => {
    if (!active) return;
    const id = window.setInterval(
      () => setI((p) => (p + 1) % READING_PHRASES.length),
      1500,
    );
    return () => window.clearInterval(id);
  }, [active]);
  return READING_PHRASES[i] ?? READING_PHRASES[0]!;
}

function activeStep(job: ImportJobRow | null): ImportJobStep | null {
  if (!job) return null;
  return job.steps.find((s) => s.status === "running") ?? null;
}

/** Three trailing dots that pulse in a little wave. */
function PulsingDots() {
  return (
    <span aria-hidden className="inline-flex shrink-0">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="animate-pulse"
          style={{ animationDelay: `${i * 200}ms`, animationDuration: "1s" }}
        >
          .
        </span>
      ))}
    </span>
  );
}

/** One phrase line: strips trailing dots (we render pulsing ones instead) and
 *  slides in from the top / out to the bottom so lines flow downward. */
function PhraseLine({ text, variant }: { text: string; variant: "in" | "out" }) {
  const body = text.replace(/[.…\s]+$/u, "");
  return (
    <span
      className={cn(
        "absolute inset-0 flex items-center",
        variant === "in"
          ? "animate-in fade-in slide-in-from-top-2 duration-300"
          : "animate-out fade-out slide-out-to-bottom-2 duration-300",
      )}
      style={variant === "out" ? { animationFillMode: "forwards" } : undefined}
    >
      <span className="min-w-0 truncate">{body}</span>
      <PulsingDots />
    </span>
  );
}

/**
 * Crossfades between goofy phrases: the outgoing line fades down and away while
 * the incoming line fades down into place, and the trailing dots keep pulsing.
 */
function PhraseTicker({
  phrase,
  className,
}: {
  phrase: string;
  className?: string;
}) {
  const [current, setCurrent] = useState(phrase);
  const [prev, setPrev] = useState<string | null>(null);
  const prevRef = useRef(phrase);

  useEffect(() => {
    if (phrase === prevRef.current) return;
    setPrev(prevRef.current);
    prevRef.current = phrase;
    setCurrent(phrase);
    const id = window.setTimeout(() => setPrev(null), 400);
    return () => window.clearTimeout(id);
  }, [phrase]);

  return (
    <span className={cn("relative block h-4 overflow-hidden", className)}>
      {prev != null ? <PhraseLine key={`out-${prev}`} text={prev} variant="out" /> : null}
      <PhraseLine key={`in-${current}`} text={current} variant="in" />
    </span>
  );
}

/** "14:32:05" — local wall-clock time of a log event, for at-a-glance diagnosis. */
function eventClock(atIso: string): string {
  const d = new Date(atIso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString([], { hour12: false });
}

/**
 * The step's live diagnostic log: what the import is actually doing right now —
 * connection checks, pages fetched from Xero, rate-limit hits with their wait
 * time, save milestones. Newest first, straight from the server via the job row.
 */
export function StepEventLog({
  events,
}: {
  events?: ImportJobStepLogEvent[] | null;
}) {
  if (!events || events.length === 0) return null;
  return (
    <div className="bg-muted/30 space-y-1 rounded-lg border px-3 py-2">
      {events.map((event, index) => (
        <div
          key={`${event.at}-${index}`}
          className="flex items-baseline gap-2 text-xs"
        >
          <span
            aria-hidden
            className={cn(
              "size-1.5 shrink-0 self-center rounded-full",
              event.kind === "throttle"
                ? "bg-amber-500"
                : event.kind === "error"
                  ? "bg-destructive"
                  : "bg-muted-foreground/40",
            )}
          />
          <span
            className={cn(
              "min-w-0 flex-1 truncate",
              event.kind === "throttle"
                ? "text-amber-600 dark:text-amber-400"
                : event.kind === "error"
                  ? "text-destructive"
                  : "text-muted-foreground",
            )}
          >
            {event.text}
          </span>
          <span className="text-muted-foreground/60 shrink-0 tabular-nums">
            {eventClock(event.at)}
          </span>
        </div>
      ))}
    </div>
  );
}

/**
 * A real, just-read invoice in the live feed: supplier name with the invoice
 * number, amount, and how many line items we pulled out of it. Amber when a bill
 * couldn't be read.
 */
function ReadInvoiceCard({ invoice }: { invoice: ImportJobInvoiceActivity }) {
  // Invoice-first import: how the supplier was resolved off the invoice header.
  const supplierAction =
    invoice.supplierAction === "created"
      ? "✦ new supplier"
      : invoice.supplierAction === "matched_abn"
        ? "matched by ABN"
        : invoice.supplierAction === "matched_name"
          ? "matched by name"
          : null;
  const meta = [
    invoice.number,
    formatAud(invoice.amountCents),
    supplierAction,
    invoice.ok
      ? invoice.items > 0
        ? `${invoice.items} item${invoice.items === 1 ? "" : "s"}`
        : "no line items"
      : "couldn't read",
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div
      className={cn(
        "bg-card flex items-center gap-3 rounded-xl border px-4 py-2.5",
        "animate-in fade-in slide-in-from-top-1 duration-300",
        invoice.ok
          ? "border-emerald-500/30 bg-emerald-500/5"
          : "border-amber-500/30 bg-amber-500/5",
      )}
    >
      <span
        className={cn(
          "flex size-8 shrink-0 items-center justify-center rounded-full",
          invoice.ok ? "bg-emerald-500/15" : "bg-amber-500/15",
        )}
      >
        {invoice.ok ? (
          <Check className="size-4 text-emerald-600 dark:text-emerald-400" />
        ) : (
          <AlertTriangle className="size-4 text-amber-600 dark:text-amber-400" />
        )}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium leading-tight">
          {invoice.supplier ?? "Unknown supplier"}
        </p>
        {meta ? (
          <p className="text-muted-foreground truncate text-xs">{meta}</p>
        ) : null}
      </div>
    </div>
  );
}

/**
 * The invoice-reading phase: a live count + ETA, a spinner card narrating the
 * current work, and a feed of the actual invoices just read — real supplier,
 * number, amount, and extracted line-item count, newest on top. The feed and ETA
 * come straight from the server's progress payload, so it's real, not animated.
 */
function InvoiceReadingStack({ step }: { step: ImportJobStep }) {
  const total = step.progress?.total ?? 0;
  const current = step.progress?.current ?? 0;
  const elapsedMs = step.progress?.elapsedMs ?? 0;
  const recent = step.progress?.recent ?? [];
  const complete = step.status === "complete";
  const phrase = useLoopingPhrase(!complete, 7);

  const pct = total > 0 ? Math.round((current / total) * 100) : 0;
  const eta = complete ? null : etaText(elapsedMs, current, total);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">
          Reading invoice {Math.min(current + 1, total)} of {total}
          {eta ? <span className="text-muted-foreground/70"> · {eta}</span> : null}
        </span>
        <span className="text-muted-foreground tabular-nums">{pct}%</span>
      </div>
      <Progress value={pct} className="h-1.5" />

      <XeroThrottleCountdown throttledUntilMs={step.progress?.throttledUntilMs} />

      {/* Throttle/error lines only — the invoice cards below ARE the info feed. */}
      <StepEventLog
        events={step.progress?.events?.filter((e) => e.kind !== "info")}
      />

      <div className="space-y-2">
        {!complete ? (
          <div className="bg-card flex items-center gap-3 rounded-xl border px-4 py-2.5">
            <span className="bg-muted flex size-8 shrink-0 items-center justify-center rounded-full">
              <Loader2 className="text-primary size-4 animate-spin" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium leading-tight">
                Reading the next few bills
              </p>
              <PhraseTicker phrase={phrase} className="text-muted-foreground text-xs" />
            </div>
          </div>
        ) : null}

        {recent.map((invoice, index) => (
          // Prefer the stable invoice id; fall back to position so a job still
          // emitting id-less activity items (e.g. pre-update in-flight runs)
          // never collides or renders without a key.
          <ReadInvoiceCard key={invoice.id ?? `row-${index}`} invoice={invoice} />
        ))}
      </div>
    </div>
  );
}

/** A clean single-activity card for the non-parsing steps (sync, build, delivery). */
function SingleActivityCard({ step }: { step: ImportJobStep }) {
  const phrase = useLoopingPhrase(true, step.id.length);
  const pct =
    step.progress && step.progress.total > 0
      ? Math.round((step.progress.current / step.progress.total) * 100)
      : null;

  return (
    <div className="bg-card rounded-xl border p-4">
      <div className="flex items-center gap-3">
        <span className="bg-primary/10 flex size-10 shrink-0 items-center justify-center rounded-full">
          <Loader2 className="text-primary size-5 animate-spin" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium leading-tight">{step.label}</p>
          {step.detail ? (
            <p className="text-muted-foreground text-xs">{step.detail}</p>
          ) : (
            <PhraseTicker phrase={phrase} className="text-muted-foreground text-xs" />
          )}
        </div>
      </div>
      {pct != null && step.progress && step.progress.total > 0 ? (
        <Progress value={pct} className="mt-3 h-1.5" />
      ) : null}
      <div className="mt-3 space-y-3 empty:hidden">
        <XeroThrottleCountdown throttledUntilMs={step.progress?.throttledUntilMs} />
        <StepEventLog events={step.progress?.events} />
      </div>
    </div>
  );
}

/**
 * The post-selection import activity: Superbot narrating the current step at the
 * top, then either the looping invoice-reading stack (while reading PDFs) or a
 * single activity card for the other steps. Replaces the old raw console log.
 */
export function ImportActivityView({ job }: { job: ImportJobRow | null }) {
  const failed = job?.status === "failed";
  const completed = job?.status === "completed";
  const step = activeStep(job);
  const isParsing = step?.id === "parse_pdfs";

  const narration = failed
    ? "Hmm — something went wrong while I was importing. Take a look below."
    : completed
      ? "All done! Taking you to your suppliers…"
      : step
        ? (STEP_NARRATION[step.id] ?? "Working through your import…")
        : "Getting your import going…";

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-4">
        <AgentBotAvatarVideo aria-hidden className="size-16 shrink-0" />
        <SuperbotSpeechBubble tail="left" className="flex-1">
          <p className="text-sm leading-relaxed" aria-live="polite">
            {narration}
          </p>
        </SuperbotSpeechBubble>
      </div>

      {!failed && !completed ? (
        isParsing && step ? (
          <InvoiceReadingStack step={step} />
        ) : step ? (
          <SingleActivityCard step={step} />
        ) : null
      ) : null}

      {failed ? (
        <div className="space-y-3">
          {job?.errorMessage ? (
            <p className="text-destructive text-sm">{job.errorMessage}</p>
          ) : null}
          {/* The failed step keeps its diagnostic log — show the trail that led
              up to the failure so the user can see exactly where it died. */}
          <StepEventLog
            events={
              job?.steps.find((s) => s.status === "failed")?.progress?.events
            }
          />
        </div>
      ) : null}
    </div>
  );
}
