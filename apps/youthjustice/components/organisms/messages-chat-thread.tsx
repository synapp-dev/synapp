"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Send } from "lucide-react";
import ReactTimeago from "react-timeago";

import { Button } from "@workspace/ui/components/button";
import { Textarea } from "@workspace/ui/components/textarea";
import { cn } from "@workspace/ui/lib/utils";
import { useMeStore } from "@/entities/me/model/store";

import { StaggeredAnimation } from "@workspace/ui/components/atoms/staggered-animation";
import { useMessagesDemo } from "@/components/organisms/messages-demo-context";

/** Single-line ~h-9; cap ~6 lines like Messenger. */
const MESSAGE_INPUT_MIN_HEIGHT_PX = 36;
const MESSAGE_INPUT_MAX_HEIGHT_PX = 132;
const TIMEAGO_MIN_PERIOD_SECONDS = 10;
const EMOJI_ONLY_PATTERN = /^[\p{Extended_Pictographic}\p{Emoji_Component}\uFE0F\u200D\s]+$/u;

function compactTimeagoFormatter(
  value: number,
  unit: string,
  suffix: string,
): string {
  const unitMap: Record<string, string> = {
    second: "s",
    minute: "m",
    hour: "h",
    day: "d",
    week: "w",
    month: "mo",
    year: "y",
  };
  const shortUnit = unitMap[unit] ?? unit.charAt(0);
  if (suffix === "from now") {
    return `in ${value}${shortUnit}`;
  }
  return `${value}${shortUnit} ago`;
}

function firstNameFromFullName(fullName: string | null | undefined): string {
  const t = fullName?.trim();
  if (!t) return "You";
  const part = t.split(/\s+/)[0];
  return part || "You";
}

function isEmojiOnlyMessage(text: string): boolean {
  const trimmed = text.trim();
  return (
    Boolean(trimmed) &&
    EMOJI_ONLY_PATTERN.test(trimmed) &&
    /\p{Extended_Pictographic}/u.test(trimmed)
  );
}

function ReplyPreview({
  text,
  role,
  isOwnBubble,
}: {
  text: string;
  role: "user" | "assistant";
  isOwnBubble: boolean;
}) {
  const authorLabel = role === "assistant" ? "Rebecca" : "You";
  return (
    <div
      className={cn(
        "mb-1 rounded-md border-l-2 px-2 py-1 text-xs",
        isOwnBubble
          ? "border-primary-foreground/40 bg-primary-foreground/10 text-primary-foreground/85"
          : "border-muted-foreground/30 bg-background/60 text-muted-foreground",
      )}
    >
      <p className="font-medium">{authorLabel}</p>
      <p className="line-clamp-1">{text}</p>
    </div>
  );
}

function UserMessageBody({
  workerFirstName,
  at,
  text,
}: {
  workerFirstName: string;
  at: number;
  text: string;
}) {
  const bodyRef = useRef<HTMLParagraphElement>(null);
  const [multiline, setMultiline] = useState(false);
  const isEmojiOnly = isEmojiOnlyMessage(text);

  useLayoutEffect(() => {
    const el = bodyRef.current;
    if (!el) return;

    const measure = () => {
      const style = getComputedStyle(el);
      let lineHeight = parseFloat(style.lineHeight);
      if (Number.isNaN(lineHeight) || lineHeight <= 0) {
        const fontSize = parseFloat(style.fontSize) || 14;
        lineHeight = fontSize * 1.375;
      }
      setMultiline(el.scrollHeight > lineHeight * 1.12);
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [text]);

  return (
    <>
      <div className="flex items-baseline justify-between gap-2 text-[0.65rem] font-medium opacity-90">
        <span className="truncate">{workerFirstName}</span>
        <span className="shrink-0 tabular-nums text-primary-foreground/75">
          <ReactTimeago
            date={new Date(at)}
            minPeriod={TIMEAGO_MIN_PERIOD_SECONDS}
            formatter={compactTimeagoFormatter}
          />
        </span>
      </div>
      <p
        ref={bodyRef}
        className={cn(
          "min-w-0 w-full whitespace-pre-wrap break-words",
          isEmojiOnly && "text-3xl leading-none",
          multiline ? "text-left" : "text-right",
        )}
      >
        {text}
      </p>
    </>
  );
}

function UserMessageContent({
  workerFirstName,
  at,
  text,
  replyToText,
  replyToRole,
}: {
  workerFirstName: string;
  at: number;
  text: string;
  replyToText?: string;
  replyToRole?: "user" | "assistant";
}) {
  return (
    <>
      {replyToText && replyToRole ? (
        <ReplyPreview text={replyToText} role={replyToRole} isOwnBubble />
      ) : null}
      <UserMessageBody workerFirstName={workerFirstName} at={at} text={text} />
    </>
  );
}

function AssistantMessageContent({
  displayName,
  at,
  text,
  replyToText,
  replyToRole,
}: {
  displayName: string;
  at: number;
  text: string;
  replyToText?: string;
  replyToRole?: "user" | "assistant";
}) {
  const isEmojiOnly = isEmojiOnlyMessage(text);
  return (
    <>
      {replyToText && replyToRole ? (
        <ReplyPreview text={replyToText} role={replyToRole} isOwnBubble={false} />
      ) : null}
      <div className="text-muted-foreground flex items-baseline justify-between gap-2 text-[0.65rem] font-medium">
        <span className="min-w-0 truncate">{displayName}</span>
        <span className="shrink-0 tabular-nums opacity-80">
          <ReactTimeago
            date={new Date(at)}
            minPeriod={TIMEAGO_MIN_PERIOD_SECONDS}
            formatter={compactTimeagoFormatter}
          />
        </span>
      </div>
      <p
        className={cn(
          "whitespace-pre-wrap break-words",
          isEmojiOnly && "text-3xl leading-none",
        )}
      >
        {text}
      </p>
    </>
  );
}

type MessagesChatThreadProps = {
  caseSlug: string;
  displayName: string;
  subtitle: string;
};

export function MessagesChatThread({
  caseSlug,
  displayName,
  subtitle,
}: MessagesChatThreadProps) {
  const { threads, sendMessage, assistantTypingForSlug } = useMessagesDemo();
  const currentUser = useMeStore((s) => s.currentUser);
  const workerFirstName = useMemo(
    () => firstNameFromFullName(currentUser?.fullName),
    [currentUser?.fullName],
  );
  const [draft, setDraft] = useState("");
  const listRef = useRef<HTMLDivElement>(null);
  const draftRef = useRef<HTMLTextAreaElement>(null);
  /** Stagger only the initial message ids seen for this thread; new sends/replies use no cumulative delay. */
  const introSlugRef = useRef<string | null>(null);
  const introMessageIdsRef = useRef<Set<string> | null>(null);

  useLayoutEffect(() => {
    const el = draftRef.current;
    if (!el) return;
    el.style.height = "0px";
    const next = Math.min(
      Math.max(el.scrollHeight, MESSAGE_INPUT_MIN_HEIGHT_PX),
      MESSAGE_INPUT_MAX_HEIGHT_PX,
    );
    el.style.height = `${next}px`;
  }, [draft]);

  const messages = useMemo(
    () => threads[caseSlug] ?? [],
    [threads, caseSlug],
  );

  if (introSlugRef.current !== caseSlug) {
    introSlugRef.current = caseSlug;
    introMessageIdsRef.current = null;
  }
  if (introMessageIdsRef.current === null) {
    introMessageIdsRef.current = new Set(messages.map((x) => x.id));
  }

  /** Chronological index among intro snapshot ids only (used for stagger delay). */
  const introStaggerIndexById = useMemo(() => {
    const intro = introMessageIdsRef.current;
    const map = new Map<string, number>();
    if (!intro) {
      return map;
    }
    let i = 0;
    for (const x of messages) {
      if (intro.has(x.id)) {
        map.set(x.id, i);
        i += 1;
      }
    }
    return map;
  }, [messages, caseSlug]);

  const showTypingIndicator = assistantTypingForSlug === caseSlug;
  const hasDraft = draft.trim().length > 0;

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, caseSlug, showTypingIndicator]);

  function onSend() {
    const text = draft.trim();
    if (!text) return;
    setDraft("");
    sendMessage(caseSlug, text);
  }

  return (
    <section className="flex min-h-0 min-w-0 flex-1 flex-col overflow-x-hidden">
      <header className="sticky top-0 z-10 shrink-0 border-b bg-muted px-4 py-3 md:px-6">
        <div className="mx-auto flex max-w-7xl items-start gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground -ml-1 shrink-0 md:hidden"
            asChild
          >
            <Link href="/messages" aria-label="Back to messages">
              <ArrowLeft className="size-5" />
            </Link>
          </Button>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-baseline gap-2">
              <h2 className="text-base font-semibold tracking-tight">
                {displayName}
              </h2>
            </div>
            <p className="text-muted-foreground truncate text-xs">{subtitle}</p>
          </div>
        </div>
      </header>

      <div
        ref={listRef}
        className="mx-auto flex min-h-0 w-full max-w-7xl flex-1 flex-col gap-3 overflow-y-auto px-4 py-3 md:px-6"
        role="log"
        aria-live="polite"
        aria-relevant="additions"
      >
        {messages.map((m) => {
          const introStaggerIndex = introStaggerIndexById.get(m.id);
          const isIntroMessage = introStaggerIndex !== undefined;
          const isEmojiOnly = isEmojiOnlyMessage(m.text);
          return (
            <StaggeredAnimation
              key={m.id}
              index={isIntroMessage ? introStaggerIndex : 0}
              baseDelay={0}
              incrementDelay={isIntroMessage ? 0.03 : 0}
              fadeDirection={m.role === "user" ? "right" : "left"}
              className="w-full"
            >
              <div
                className={cn(
                  "flex w-fit max-w-[80%] flex-col gap-1 rounded-2xl px-3 py-2 text-sm",
                  m.role === "user"
                    ? "ml-auto self-end bg-primary text-primary-foreground"
                    : "mr-auto self-start bg-muted text-foreground",
                )}
              >
                {m.role === "user" ? (
                  <UserMessageContent
                    workerFirstName={workerFirstName}
                    at={m.at}
                    text={m.text}
                    replyToText={m.replyToText}
                    replyToRole={m.replyToRole}
                  />
                ) : (
                  <AssistantMessageContent
                    displayName={displayName}
                    at={m.at}
                    text={m.text}
                    replyToText={m.replyToText}
                    replyToRole={m.replyToRole}
                  />
                )}
              </div>
            </StaggeredAnimation>
          );
        })}
        {showTypingIndicator ? (
          <div
            className="text-muted-foreground mr-auto flex w-fit max-w-[80%] items-center gap-2 self-start rounded-2xl bg-muted px-3 py-2.5 text-sm"
            aria-live="polite"
            aria-label={`${displayName} is typing`}
          >
            <span className="text-[0.65rem] font-medium opacity-80">
              {displayName}
            </span>
            <span className="flex items-center gap-1" aria-hidden>
              <span className="bg-muted-foreground/70 size-1.5 animate-bounce rounded-full [animation-delay:-0.3s]" />
              <span className="bg-muted-foreground/70 size-1.5 animate-bounce rounded-full [animation-delay:-0.15s]" />
              <span className="bg-muted-foreground/70 size-1.5 animate-bounce rounded-full" />
            </span>
          </div>
        ) : null}
      </div>

      <form
        className="shrink-0 border-t bg-background py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
        onSubmit={(e) => {
          e.preventDefault();
          onSend();
        }}
      >
        <div className="mx-auto flex w-full max-w-7xl flex-row items-end gap-2 px-4 md:px-6">
          <Textarea
            ref={draftRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Message…"
            rows={1}
            aria-label="Message text. Shift+Enter for a new line."
            className={cn(
              "[field-sizing:fixed] min-h-9 max-h-[8.25rem] min-w-0 flex-1 resize-none overflow-y-auto py-2 leading-snug md:text-sm",
            )}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                onSend();
              }
            }}
          />
          {hasDraft ? (
            <Button type="submit" size="icon" className="shrink-0" aria-label="Send">
              <Send className="size-4" />
            </Button>
          ) : null}
        </div>
      </form>
    </section>
  );
}
