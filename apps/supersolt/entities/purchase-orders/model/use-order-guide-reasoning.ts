"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export type OrderGuideReasoningStatus =
  | "idle"
  | "loading"
  | "done"
  | "error"
  | "unavailable";

export type OrderGuideSupplierRead = {
  supplierId: string;
  headline: string;
  points: string[];
  watchouts: string[];
};

export type OrderGuideReasoning = {
  runHeadline: string;
  suppliers: OrderGuideSupplierRead[];
};

/**
 * Fetches Superbot's structured read on the order run — a run-level headline
 * plus a per-supplier read keyed by supplierId — and exposes a lookup map so
 * each supplier's dashboard can render its own briefing inline. Re-runs
 * whenever `runKey` changes (guide recompute, period switch); `enabled: false`
 * keeps it idle.
 */
export function useOrderGuideReasoning(args: {
  organisation: string;
  venue: string;
  periodPreset: string;
  runKey: string | null;
  enabled: boolean;
}) {
  const [data, setData] = useState<OrderGuideReasoning | null>(null);
  const [status, setStatus] = useState<OrderGuideReasoningStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const start = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setError(null);
    setStatus("loading");

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
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          error?: { message?: string };
        } | null;
        throw new Error(payload?.error?.message ?? "Reasoning failed");
      }

      const payload = (await response.json()) as OrderGuideReasoning;
      setData(payload);
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

  const bySupplier = useMemo(() => {
    const map = new Map<string, OrderGuideSupplierRead>();
    for (const read of data?.suppliers ?? []) {
      map.set(read.supplierId, read);
    }
    return map;
  }, [data]);

  return {
    runHeadline: data?.runHeadline ?? null,
    bySupplier,
    status,
    error,
    regenerate: start,
  };
}
