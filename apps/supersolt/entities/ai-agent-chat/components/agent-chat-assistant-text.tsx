"use client";

import { useStreamingText } from "@/entities/dashboard/components/superbot-suggestions-use-streaming-text";
import { cn } from "@workspace/ui/lib/utils";

const CARET_CLASS =
  "ml-px inline-block h-[1.05em] w-px animate-pulse bg-muted-foreground/60 align-middle";

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
  const typewriterEnabled =
    !isLiveStreaming && !wasLiveStreamCompleted;

  const visibleLen = useStreamingText(
    fullText,
    `${messageId}:${partIndex}`,
    reduceMotion,
    typewriterEnabled,
  );

  const typewriterComplete =
    reduceMotion ||
    !typewriterEnabled ||
    visibleLen >= fullText.length;

  if (isLiveStreaming) {
    return (
      <div className={cn("whitespace-pre-wrap", className)} aria-live="polite">
        {fullText}
        {!reduceMotion ? (
          <span className={CARET_CLASS} aria-hidden />
        ) : null}
      </div>
    );
  }

  const shown = typewriterEnabled ? fullText.slice(0, visibleLen) : fullText;

  return (
    <div
      className={cn("whitespace-pre-wrap", className)}
      aria-live={typewriterComplete ? "polite" : "off"}
    >
      {shown}
      {typewriterEnabled &&
      !reduceMotion &&
      visibleLen < fullText.length ? (
        <span className={CARET_CLASS} aria-hidden />
      ) : null}
    </div>
  );
}
