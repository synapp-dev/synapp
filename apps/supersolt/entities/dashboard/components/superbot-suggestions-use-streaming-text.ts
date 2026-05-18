import * as React from "react";

import {
  STREAM_CHARS_PER_TICK,
  STREAM_TICK_MS,
} from "@/entities/dashboard/components/superbot-suggestions-carousel-constants";

export function useStreamingText(
  fullText: string,
  runKey: string,
  reduceMotion: boolean,
  enabled: boolean,
): number {
  const [visibleLen, setVisibleLen] = React.useState(0);

  React.useEffect(() => {
    if (!enabled) {
      setVisibleLen(0);
      return;
    }
    if (reduceMotion) {
      setVisibleLen(fullText.length);
      return;
    }
    setVisibleLen(0);
    let n = 0;
    const id = window.setInterval(() => {
      n = Math.min(fullText.length, n + STREAM_CHARS_PER_TICK);
      setVisibleLen(n);
      if (n >= fullText.length) {
        window.clearInterval(id);
      }
    }, STREAM_TICK_MS);
    return () => window.clearInterval(id);
  }, [enabled, fullText, runKey, reduceMotion]);

  return visibleLen;
}
