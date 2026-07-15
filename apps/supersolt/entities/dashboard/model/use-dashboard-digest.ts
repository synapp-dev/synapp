"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  parseDigestTabs,
  type DigestTab,
} from "@/entities/dashboard/lib/parse-digest-tabs";

export type DashboardDigestStatus =
  | "idle"
  | "streaming"
  | "done"
  | "error"
  | "unavailable";

export type { DigestTab };

/**
 * Streams the Superbot morning digest token-by-token and parses it into
 * tabbed sections as it arrives. Runs once per venue per mount;
 * `regenerate` refreshes on demand.
 */
export function useDashboardDigest(args: {
  organisationSlug: string;
  venueSlug: string;
  enabled: boolean;
}) {
  const [text, setText] = useState("");
  const [status, setStatus] = useState<DashboardDigestStatus>("idle");
  const [fromCache, setFromCache] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const start = useCallback(
    async (options?: { force?: boolean }) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setText("");
      setFromCache(false);
      setStatus("streaming");

      try {
        const response = await fetch(
          `/api/organisations/${args.organisationSlug}/venues/${args.venueSlug}/dashboard/digest`,
          {
            method: "POST",
            signal: controller.signal,
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ force: options?.force === true }),
          },
        );

        if (response.status === 503) {
          setStatus("unavailable");
          return;
        }
        if (!response.ok || !response.body) {
          throw new Error("digest failed");
        }

        setFromCache(response.headers.get("x-digest-cache") === "hit");

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          setText((prev) => prev + decoder.decode(value, { stream: true }));
        }
        setStatus("done");
      } catch {
        if (controller.signal.aborted) return;
        setStatus("error");
      }
    },
    [args.organisationSlug, args.venueSlug],
  );

  useEffect(() => {
    if (!args.enabled || !args.organisationSlug || !args.venueSlug) return;
    void start();
    return () => abortRef.current?.abort();
  }, [args.enabled, args.organisationSlug, args.venueSlug, start]);

  const tabs = useMemo(() => parseDigestTabs(text), [text]);

  const regenerate = useCallback(() => start({ force: true }), [start]);

  return { text, tabs, status, fromCache, regenerate };
}
