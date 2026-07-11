"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type OrderGuideReasoningStatus =
  | "idle"
  | "streaming"
  | "done"
  | "error"
  | "unavailable";

/**
 * Streams the Superbot order-run briefing token-by-token from the
 * reasoning endpoint. Re-runs whenever `runKey` changes (guide recompute,
 * period switch); `enabled: false` keeps it idle.
 */
export function useOrderGuideReasoning(args: {
  organisation: string;
  venue: string;
  periodPreset: string;
  runKey: string | null;
  enabled: boolean;
}) {
  const [text, setText] = useState("");
  const [status, setStatus] = useState<OrderGuideReasoningStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const start = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setText("");
    setError(null);
    setStatus("streaming");

    try {
      const response = await fetch(
        `/api/organisations/${args.organisation}/venues/${args.venue}/order-guide/reasoning`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ periodPreset: args.periodPreset }),
          signal: controller.signal,
        },
      );

      if (response.status === 503) {
        setStatus("unavailable");
        return;
      }
      if (!response.ok || !response.body) {
        const payload = (await response.json().catch(() => null)) as {
          error?: { message?: string };
        } | null;
        throw new Error(payload?.error?.message ?? "Reasoning failed");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        setText((prev) => prev + decoder.decode(value, { stream: true }));
      }
      setStatus("done");
    } catch (err) {
      if (controller.signal.aborted) return;
      setError(err instanceof Error ? err.message : "Reasoning failed");
      setStatus("error");
    }
  }, [args.organisation, args.venue, args.periodPreset]);

  useEffect(() => {
    if (!args.enabled || !args.runKey) return;
    void start();
    return () => abortRef.current?.abort();
    // runKey is the trigger: a new computedAt/period means a fresh briefing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [args.enabled, args.runKey, start]);

  return { text, status, error, regenerate: start };
}
