"use client";

import { Fragment, useMemo, type ReactNode } from "react";

import { useStreamingText } from "@/entities/dashboard/components/superbot-suggestions-use-streaming-text";
import {
  parseInlineBoldSegments,
  type InlineTextSegment,
} from "@/entities/ai-agent-chat/lib/assistant-inline-markdown";
import { cn } from "@workspace/ui/lib/utils";

const CARET_CLASS =
  "ml-px inline-block h-[1.05em] w-px animate-pulse bg-muted-foreground/60 align-middle";

/** Render segments up to a visible-character budget (over marker-stripped text). */
function renderSegments(
  segments: InlineTextSegment[],
  limit: number,
): ReactNode[] {
  const out: ReactNode[] = [];
  let used = 0;
  for (let i = 0; i < segments.length && used < limit; i++) {
    const segment = segments[i]!;
    const take = Math.min(segment.text.length, limit - used);
    const text = segment.text.slice(0, take);
    used += take;
    out.push(
      segment.bold ? (
        <strong key={i} className="font-semibold">
          {text}
        </strong>
      ) : (
        <Fragment key={i}>{text}</Fragment>
      ),
    );
  }
  return out;
}

export type AgentChatAssistantTextProps = {
  fullText: string;
  messageId: string;
  partIndex: number;
  reduceMotion: boolean;
  /** True while the model is streaming tokens into this assistant message. */
  isLiveStreaming: boolean;
  /** True once this message finished via live stream (skip typewriter replay). */
  wasLiveStreamCompleted: boolean;
  className?: string;
};

export function AgentChatAssistantText({
  fullText,
  messageId,
  partIndex,
  reduceMotion,
  isLiveStreaming,
  wasLiveStreamCompleted,
  className,
}: AgentChatAssistantTextProps) {
  const segments = useMemo(
    () => parseInlineBoldSegments(fullText),
    [fullText],
  );
  const displayText = useMemo(
    () => segments.map((s) => s.text).join(""),
    [segments],
  );

  const typewriterEnabled =
    !isLiveStreaming && !wasLiveStreamCompleted;

  const visibleLen = useStreamingText(
    displayText,
    `${messageId}:${partIndex}`,
    reduceMotion,
    typewriterEnabled,
  );

  const typewriterComplete =
    reduceMotion ||
    !typewriterEnabled ||
    visibleLen >= displayText.length;

  if (isLiveStreaming) {
    return (
      <div className={cn("whitespace-pre-wrap", className)} aria-live="polite">
        {renderSegments(segments, displayText.length)}
        {!reduceMotion ? (
          <span className={CARET_CLASS} aria-hidden />
        ) : null}
      </div>
    );
  }

  const shownLen = typewriterEnabled ? visibleLen : displayText.length;

  return (
    <div
      className={cn("whitespace-pre-wrap", className)}
      aria-live={typewriterComplete ? "polite" : "off"}
    >
      {renderSegments(segments, shownLen)}
      {typewriterEnabled &&
      !reduceMotion &&
      visibleLen < displayText.length ? (
        <span className={CARET_CLASS} aria-hidden />
      ) : null}
    </div>
  );
}
