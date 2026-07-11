"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type DashboardDigestStatus =
  | "idle"
  | "streaming"
  | "done"
  | "error"
  | "unavailable";

/**
 * Streams the Superbot morning digest token-by-token. Runs once per
 * venue per mount; `regenerate` refreshes on demand.
 */
export function useDashboardDigest(args: {
  organisationSlug: string;
  venueSlug: string;
  enabled: boolean;
}) {
  const [text, setText] = useState("");
  const [status, setStatus] = useState<DashboardDigestStatus>("idle");
  const abortRef = useRef<AbortController | null>(null);

  const start = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setText("");
    setStatus("streaming");

    try {
      const response = await fetch(
        `/api/organisations/${args.organisationSlug}/venues/${args.venueSlug}/dashboard/digest`,
        { method: "POST", signal: controller.signal },
      );

      if (response.status === 503) {
        setStatus("unavailable");
        return;
      }
      if (!response.ok || !response.body) {
        throw new Error("digest failed");
      }

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
  }, [args.organisationSlug, args.venueSlug]);

  useEffect(() => {
    if (!args.enabled || !args.organisationSlug || !args.venueSlug) return;
    void start();
    return () => abortRef.current?.abort();
  }, [args.enabled, args.organisationSlug, args.venueSlug, start]);

  return { text, status, regenerate: start };
}
