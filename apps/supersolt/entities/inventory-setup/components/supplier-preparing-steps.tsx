"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Loader2 } from "lucide-react";

import { cn } from "@workspace/ui/lib/utils";

import { AgentBotAvatarVideo } from "@/entities/ai-agent-chat/components/agent-bot-avatar-video";

const STEP_MS = 650; // time each task spends "running" before the next starts
const FINISH_HOLD_MS = 550; // beat after the last tick before fading
const FADE_MS = 450;

const TASKS = [
  "Connecting to your Xero account",
  "Fetching your supplier contacts",
  "Fetching your purchase orders",
  "Matching suppliers across both",
] as const;

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, []);
  return reduced;
}

/**
 * The pre-gate "preparing" phase: Superbot says one line while a short checklist
 * of what it's doing ticks off in order. The tasks are paced theatre — the real
 * work is two Xero calls server-side — except the LAST task holds on a spinner
 * until {@link ready} (the supplier list has actually arrived), so a slow
 * purchase-order fetch reads as "still matching" rather than a frozen tick. Once
 * everything's done it fades out and calls {@link onDone}, handing off to the grid.
 */
export function SupplierPreparingSteps({
  ready,
  onDone,
}: {
  ready: boolean;
  onDone: () => void;
}) {
  const reduceMotion = usePrefersReducedMotion();
  const [doneCount, setDoneCount] = useState(0);
  const [fading, setFading] = useState(false);

  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;
  const completingRef = useRef(false);
  const finishTimersRef = useRef<number[]>([]);

  // Advance the checklist up to (but not through) the last task.
  useEffect(() => {
    if (reduceMotion) return;
    if (doneCount >= TASKS.length - 1) return;
    const id = window.setTimeout(() => setDoneCount((c) => c + 1), STEP_MS);
    return () => window.clearTimeout(id);
  }, [doneCount, reduceMotion]);

  // Complete + fade once the data is ready and we've reached the last task.
  useEffect(() => {
    if (completingRef.current || !ready) return;
    if (!reduceMotion && doneCount < TASKS.length - 1) return;
    completingRef.current = true;
    setDoneCount(TASKS.length);
    if (reduceMotion) {
      onDoneRef.current();
      return;
    }
    finishTimersRef.current.push(
      window.setTimeout(() => setFading(true), FINISH_HOLD_MS),
      window.setTimeout(() => onDoneRef.current(), FINISH_HOLD_MS + FADE_MS),
    );
  }, [ready, doneCount, reduceMotion]);

  useEffect(
    () => () => finishTimersRef.current.forEach((id) => window.clearTimeout(id)),
    [],
  );

  return (
    <div
      className={cn(
        "space-y-5 transition-opacity",
        fading ? "opacity-0" : "opacity-100",
      )}
      style={{ transitionDuration: `${FADE_MS}ms` }}
    >
      {/* Superbot + one steady line */}
      <div className="flex items-end gap-3">
        <AgentBotAvatarVideo className="size-16 shrink-0" />
        <div className="bg-muted mb-1 max-w-xl rounded-2xl rounded-bl-sm px-4 py-2.5 text-sm">
          Hmm, let me ask Xero what they&apos;ve got…
        </div>
      </div>

      {/* Checklist card */}
      <div className="bg-card space-y-1 rounded-lg border p-2">
        {TASKS.map((task, i) => {
          const status =
            i < doneCount ? "done" : i === doneCount ? "running" : "pending";
          return (
            <div
              key={task}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                status === "pending" && "text-muted-foreground/50",
                status === "running" && "bg-muted/50",
              )}
            >
              <span className="flex size-5 shrink-0 items-center justify-center">
                {status === "done" ? (
                  <Check className="size-4 text-emerald-600" />
                ) : status === "running" ? (
                  <Loader2 className="text-primary size-4 animate-spin" />
                ) : (
                  <span className="border-muted-foreground/30 size-3.5 rounded-full border" />
                )}
              </span>
              <span className={cn(status === "done" && "text-muted-foreground")}>
                {task}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
