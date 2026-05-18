"use client";

import {
  ArrowRightCircle,
  Bot,
  Boxes,
  CalendarDays,
  ChevronDown,
  ChevronUp,
  CircleHelp,
  Loader2,
  Mic,
  Send,
  Square,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { useTheme } from "next-themes";
import {
  Fragment,
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";

import type { UIMessage } from "ai";

import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { ScrollArea } from "@workspace/ui/components/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip";
import { cn } from "@workspace/ui/lib/utils";
import { useRightSidebar } from "@workspace/ui/components/right-sidebar-provider";
import { StaggeredAnimation } from "@/components/atoms/staggered-animation";
import { AgentChatAssistantText } from "@/entities/ai-agent-chat/components/agent-chat-assistant-text";
import { useAgentChat } from "@/entities/ai-agent-chat/components/agent-chat-provider";
import { AgentNavDestinationCards } from "@/entities/ai-agent-chat/components/agent-nav-destination-cards";
import { AgentTenantScopeDropdowns } from "@/entities/ai-agent-chat/components/agent-tenant-scope-dropdowns";
import { getSuccessfulAppNavigationCardsFromParts } from "@/entities/ai-agent-chat/lib/assistant-message-app-navigation";
import {
  isSuggestAppNavigationError,
  isSuggestAppNavigationSuccessPayload,
} from "@/entities/ai-agent-chat/lib/app-navigation-tool-schema";
import type { NavLogEntry } from "@/entities/ai-agent-chat/lib/nav-log-entry";
import type { PageWelcome } from "@/entities/ai-agent-chat/lib/page-welcome";

const QUICK_ACTIONS: { label: string; icon: LucideIcon; prompt: string }[] = [
  {
    label: "Sales Insights",
    icon: TrendingUp,
    prompt:
      "I’m on the Sales insights area in Supersolt. What should I look at first, which metrics usually matter for a venue week-over-week, and what questions should I ask if numbers look off?",
  },
  {
    label: "Inventory",
    icon: Boxes,
    prompt:
      "In Supersolt’s Inventory section (overview, order guide, stock counts, waste, suppliers), how do those pieces fit together in a weekly workflow? What order do you recommend I review them?",
  },
  {
    label: "Roster & People",
    icon: CalendarDays,
    prompt:
      "For Workforce in Supersolt (people, roster, availability, leave, timesheets), what should I double-check before I publish or change a roster so I don’t create coverage gaps?",
  },
];

/** Cap mount-time stagger so long threads stay performant; tail is usually in view. */
const INITIAL_TIMELINE_STAGGER_MAX = 15;

export type AgentChatPanelVariant = "full" | "sidebar";

export function AgentChatPanel({
  variant = "full",
}: {
  variant?: AgentChatPanelVariant;
}) {
  const { resolvedTheme } = useTheme();
  const {
    messages,
    sendMessage,
    status,
    stop,
    error,
    clearError,
    organisations,
    venuesLoading,
    tenantScope,
    setTenantScope,
    userNameLabel,
    userFirstName,
    scopeReady,
    navLogEntries,
    messageSeenAt,
    pageWelcome,
    archivedPageWelcome,
  } = useAgentChat();

  const reduceMotion = usePrefersReducedMotion();
  const prevChatStatusRef = useRef<typeof status | null>(null);
  const liveStreamCompletedAssistantIdsRef = useRef(new Set<string>());
  useLayoutEffect(() => {
    prevChatStatusRef.current = status;
  }, [status]);

  if (
    prevChatStatusRef.current === "streaming" &&
    status !== "streaming"
  ) {
    const last = messages.at(-1);
    if (last?.role === "assistant") {
      liveStreamCompletedAssistantIdsRef.current.add(last.id);
    }
  }

  const isSidebar = variant === "sidebar";
  const { open, openMobile, isMobile } = useRightSidebar();
  const sidebarShellExpanded = isMobile ? openMobile : open;

  /** Match `right-sidebar.tsx` width transition (200ms); mobile sheet open is slower. */
  const RIGHT_SIDEBAR_EXPAND_MS_DESKTOP = 200;
  const RIGHT_SIDEBAR_EXPAND_MS_MOBILE = 500;

  const [sidebarStaggerReady, setSidebarStaggerReady] = useState(
    () => !isSidebar,
  );
  const [sidebarStaggerEpoch, setSidebarStaggerEpoch] = useState(0);
  const prevSidebarShellExpandedRef = useRef<boolean | null>(null);

  /** Bumped on each user send from the right sidebar to play a short border pulse. */
  const [sidebarSendPulseTick, setSidebarSendPulseTick] = useState(0);

  const bumpSidebarSendBorderPulse = useCallback(() => {
    if (!isSidebar) return;
    setSidebarSendPulseTick((t) => t + 1);
  }, [isSidebar]);

  useLayoutEffect(() => {
    if (!isSidebar) {
      setSidebarStaggerReady(true);
      return;
    }
    if (!sidebarShellExpanded) {
      setSidebarStaggerReady(false);
      prevSidebarShellExpandedRef.current = false;
      return;
    }

    const prev = prevSidebarShellExpandedRef.current;
    const expandMs = isMobile
      ? RIGHT_SIDEBAR_EXPAND_MS_MOBILE
      : RIGHT_SIDEBAR_EXPAND_MS_DESKTOP;

    if (prev === null) {
      prevSidebarShellExpandedRef.current = true;
      setSidebarStaggerReady(true);
      setSidebarStaggerEpoch((e) => e + 1);
      return;
    }

    if (prev === true) {
      return;
    }

    prevSidebarShellExpandedRef.current = true;
    setSidebarStaggerReady(false);
    const id = globalThis.window.setTimeout(() => {
      setSidebarStaggerReady(true);
      setSidebarStaggerEpoch((e) => e + 1);
    }, expandMs);
    return () => globalThis.window.clearTimeout(id);
  }, [isSidebar, isMobile, sidebarShellExpanded]);

  const showSidebarAnimatedContent = !isSidebar || sidebarStaggerReady;

  const pageWelcomeTailRef = useRef<HTMLDivElement | null>(null);

  useLayoutEffect(() => {
    if (!pageWelcome) return;
    if (isSidebar && !sidebarStaggerReady) return;

    const el = pageWelcomeTailRef.current;
    if (!el) return;

    const scrollToPageWelcome = () => {
      el.scrollIntoView({
        block: "start",
        inline: "nearest",
        behavior: "auto",
      });
    };

    scrollToPageWelcome();
    requestAnimationFrame(scrollToPageWelcome);
    const id = globalThis.window.setTimeout(scrollToPageWelcome, 80);
    return () => globalThis.window.clearTimeout(id);
  }, [pageWelcome?.id, isSidebar, sidebarStaggerReady, sidebarStaggerEpoch]);

  const orgs = organisations ?? [];

  const [input, setInput] = useState("");

  const busy = status === "submitted" || status === "streaming";
  const hasUserSentMessage = useMemo(
    () => messages.some((m) => m.role === "user"),
    [messages],
  );
  const navLogsForTimeline = hasUserSentMessage ? navLogEntries : [];
  const hasConversation =
    messages.length > 0 ||
    pageWelcome != null ||
    archivedPageWelcome != null ||
    (hasUserSentMessage && navLogEntries.length > 0);

  const lastMessage = messages.at(-1);
  const isLiveStreamingAssistant =
    status === "streaming" && lastMessage?.role === "assistant";
  const showAssistantThinking =
    busy && (messages.length === 0 || lastMessage?.role === "user");

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isMultiline, setIsMultiline] = useState(false);

  useLayoutEffect(() => {
    if (input.length === 0) {
      setIsMultiline((prev) => (prev ? false : prev));
      return;
    }
    if (input.includes("\n")) {
      setIsMultiline((prev) => (prev ? prev : true));
      return;
    }
    const el = textareaRef.current;
    if (!el) return;
    const style = window.getComputedStyle(el);
    const lineHeight = parseFloat(style.lineHeight) || 20;
    const paddingTop = parseFloat(style.paddingTop) || 0;
    const paddingBottom = parseFloat(style.paddingBottom) || 0;
    const singleLineHeight = lineHeight + paddingTop + paddingBottom;
    if (el.scrollHeight > singleLineHeight + 4) {
      setIsMultiline((prev) => (prev ? prev : true));
    }
  }, [input]);

  const assistantVideoTheme = resolvedTheme === "dark" ? "dark" : "light";
  const assistantVideoSrc =
    assistantVideoTheme === "dark"
      ? "/images/supersolt-bot-dark.webm"
      : "/images/supersolt-bot-light.webm";

  const submit = useCallback(() => {
    const text = input.trim();
    if (!text || busy || !scopeReady) return;
    bumpSidebarSendBorderPulse();
    void sendMessage({ text });
    setInput("");
  }, [busy, bumpSidebarSendBorderPulse, input, scopeReady, sendMessage]);

  const sendPreset = useCallback(
    (prompt: string, options?: { pageWelcomeInteraction?: boolean }) => {
      if (busy || !scopeReady) return;
      bumpSidebarSendBorderPulse();
      void sendMessage(
        { text: prompt },
        options?.pageWelcomeInteraction
          ? { body: { pageWelcomeInteraction: true } }
          : undefined,
      );
      setInput("");
    },
    [busy, bumpSidebarSendBorderPulse, scopeReady, sendMessage],
  );

  /** ~20% wider than former `max-w-xl` / `max-w-2xl` (36rem→43.2rem, 42rem→50.4rem). */
  const composerMaxIdle = "max-w-[min(100%,43.2rem)]";
  const composerMaxWithThread = "max-w-[min(100%,50.4rem)]";

  const micSlot = busy ? (
    <div
      className={cn(
        "text-muted-foreground flex shrink-0 items-center justify-center",
        isSidebar ? "size-7" : "size-9",
      )}
      aria-hidden
    >
      <Loader2
        className={cn("animate-spin", isSidebar ? "size-3.5" : "size-4")}
      />
    </div>
  ) : (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className={cn(
        "text-muted-foreground shrink-0 rounded-full",
        isSidebar ? "size-7" : "size-9",
      )}
      aria-label="Voice input (coming soon)"
      disabled
    >
      <Mic className={isSidebar ? "size-3.5" : "size-4"} />
    </Button>
  );

  const sendStopButton = (
    <Button
      type="button"
      size="icon"
      className={cn(
        "bg-foreground text-background hover:bg-foreground/90 shrink-0 rounded-full",
        isSidebar ? "size-7" : "size-9",
      )}
      aria-label={busy ? "Stop generating" : "Send message"}
      disabled={!busy && (!scopeReady || !input.trim())}
      onClick={busy ? () => void stop() : submit}
    >
      {busy ? (
        <Square
          className={cn("fill-current", isSidebar ? "size-3" : "size-3.5")}
        />
      ) : (
        <Send className={isSidebar ? "size-3.5" : "size-4"} />
      )}
    </Button>
  );

  const composer = (
    <div
      className={cn(
        "border-border/60 bg-muted/30 flex w-full border shadow-sm",
        isMultiline
          ? "flex-col rounded-2xl"
          : "flex-row items-center rounded-full",
        isSidebar
          ? isMultiline
            ? "gap-1.5 p-2"
            : "gap-1 py-1 pl-2 pr-1"
          : isMultiline
            ? "gap-2 p-2.5"
            : "gap-1.5 py-1.5 pl-3 pr-1.5",
        !isSidebar &&
          (hasConversation ? composerMaxWithThread : composerMaxIdle),
        isSidebar && "max-w-full",
      )}
    >
      <textarea
        ref={textareaRef}
        rows={1}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Ask anything"
        disabled={busy || !scopeReady}
        className={cn(
          "text-foreground placeholder:text-muted-foreground field-sizing-content min-w-0 resize-none overflow-y-auto bg-transparent leading-snug outline-none disabled:opacity-60",
          isMultiline ? "w-full" : "flex-1",
          isSidebar
            ? cn("max-h-40 py-1 pl-1.5 text-sm", isMultiline && "pr-1.5")
            : cn("max-h-56 py-1.5 pl-3 text-base", isMultiline && "pr-3"),
        )}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            submit();
          }
        }}
      />
      <div
        className={cn(
          "flex gap-1",
          isMultiline
            ? "w-full items-end justify-end"
            : "shrink-0 items-center",
        )}
      >
        {micSlot}
        {sendStopButton}
      </div>
    </div>
  );

  type TimelineItem =
    | { kind: "message"; timestamp: number; message: UIMessage }
    | { kind: "nav-log"; timestamp: number; entry: NavLogEntry };

  const timeline = useMemo<TimelineItem[]>(() => {
    const items: TimelineItem[] = [];
    const fallbackNow = Date.now();
    for (const m of messages) {
      items.push({
        kind: "message",
        timestamp: messageSeenAt.get(m.id) ?? fallbackNow,
        message: m,
      });
    }
    for (const e of navLogsForTimeline) {
      items.push({ kind: "nav-log", timestamp: e.timestamp, entry: e });
    }
    items.sort((a, b) => a.timestamp - b.timestamp);
    return items;
  }, [messages, navLogsForTimeline, messageSeenAt]);

  /**
   * Only the last item in the chronological timeline gets auto-redirect.
   * If anything (a user message, an assistant follow-up, or a nav-log entry)
   * comes after a nav-card-bearing assistant message, that card is "stale"
   * and won't auto-redirect.
   */
  const eligibleAutoRedirectMessageId = useMemo<string | null>(() => {
    const last = timeline[timeline.length - 1];
    if (!last || last.kind !== "message") return null;
    if (last.message.role !== "assistant") return null;
    const cards = getSuccessfulAppNavigationCardsFromParts(last.message.parts);
    return cards ? last.message.id : null;
  }, [timeline]);

  const renderMessage = (message: UIMessage) => {
    const isUser = message.role === "user";

    const assistantNavCards = !isUser
      ? getSuccessfulAppNavigationCardsFromParts(message.parts)
      : null;
    const autoRedirectAllowed = message.id === eligibleAutoRedirectMessageId;

    return (
      <div
        className={cn("flex w-full", isUser ? "justify-end" : "justify-start")}
      >
        <div
          className={cn(
            "flex flex-col gap-2 rounded-xl p-3 text-sm",
            isUser
              ? "bg-muted/35 border border-transparent max-w-[60%]"
              : "max-w-[min(100%,36rem)]",
            isSidebar &&
              !isUser &&
              "max-w-[min(100%,100%)] text-xs leading-snug",
            isSidebar && isUser && "max-w-[80%] text-xs leading-snug",
            !isUser && assistantNavCards && "w-full",
          )}
        >
          <div
            className={cn(
              "text-muted-foreground flex items-center gap-1 text-xs font-medium tracking-wide",
              isUser
                ? "justify-end text-right"
                : "justify-start text-left uppercase",
            )}
          >
            {isUser ? (
              userNameLabel
            ) : (
              <>
                <Bot className="size-3.5" aria-hidden />
                <span>Superbot</span>
              </>
            )}
          </div>
          {message.parts.map((part, index) => {
            if (part.type === "text") {
              if (isUser) {
                return (
                  <div
                    key={index}
                    className={cn("whitespace-pre-wrap text-right")}
                  >
                    {part.text}
                  </div>
                );
              }
              return (
                <AgentChatAssistantText
                  key={index}
                  fullText={part.text}
                  messageId={message.id}
                  partIndex={index}
                  reduceMotion={reduceMotion}
                  isLiveStreaming={
                    message.id === lastMessage?.id && isLiveStreamingAssistant
                  }
                  wasLiveStreamCompleted={liveStreamCompletedAssistantIdsRef.current.has(
                    message.id,
                  )}
                />
              );
            }
            if (part.type === "tool-getServerTime") {
              switch (part.state) {
                case "input-available":
                  return (
                    <div key={index} className="text-muted-foreground text-xs">
                      Calling getServerTime…
                    </div>
                  );
                case "output-available":
                  return (
                    <Card key={index} className="border-primary/30">
                      <CardHeader className="py-2">
                        <CardTitle className="text-sm">
                          Server time (tool)
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-0 font-mono text-xs">
                        {(part.output as { iso?: string }).iso ?? "—"}
                      </CardContent>
                    </Card>
                  );
                case "output-error":
                  return (
                    <div key={index} className="text-destructive text-xs">
                      {part.errorText}
                    </div>
                  );
                default:
                  return null;
              }
            }
            if (part.type === "tool-listAccessibleTenants") {
              switch (part.state) {
                case "input-available":
                  return (
                    <div key={index} className="text-muted-foreground text-xs">
                      Loading your organisations and venues…
                    </div>
                  );
                case "output-available": {
                  const out = part.output as {
                    organisations: {
                      name: string;
                      slug: string;
                      venues: { slug: string }[];
                    }[];
                  };
                  const orgs = out.organisations ?? [];
                  const count = orgs.length;
                  const venueCount = orgs.reduce(
                    (n, o) => n + o.venues.length,
                    0,
                  );
                  return (
                    <Card key={index} className="border-primary/20">
                      <CardHeader className="py-2">
                        <CardTitle className="text-sm">
                          Your access ({count} org
                          {count === 1 ? "" : "s"}, {venueCount} venue
                          {venueCount === 1 ? "" : "s"})
                        </CardTitle>
                      </CardHeader>
                    </Card>
                  );
                }
                case "output-error":
                  return (
                    <div key={index} className="text-destructive text-xs">
                      {part.errorText ?? "Could not load venues."}
                    </div>
                  );
                default:
                  return null;
              }
            }
            if (part.type === "tool-suggestAppNavigation") {
              switch (part.state) {
                case "input-available":
                  return (
                    <div key={index} className="text-muted-foreground text-xs">
                      Preparing navigation…
                    </div>
                  );
                case "output-available": {
                  const output = part.output;
                  if (isSuggestAppNavigationError(output)) {
                    return (
                      <div key={index} className="text-destructive text-xs">
                        {output.error.message}
                      </div>
                    );
                  }
                  if (isSuggestAppNavigationSuccessPayload(output)) {
                    if (output.cards.length === 0) {
                      return (
                        <div
                          key={index}
                          className="text-muted-foreground text-xs"
                        >
                          No destinations matched.
                        </div>
                      );
                    }
                    return (
                      <AgentNavDestinationCards
                        key={index}
                        cards={output.cards}
                        autoRedirectAllowed={autoRedirectAllowed}
                      />
                    );
                  }
                  return null;
                }
                case "output-error":
                  return (
                    <div key={index} className="text-destructive text-xs">
                      {part.errorText ?? "Navigation failed."}
                    </div>
                  );
                default:
                  return null;
              }
            }
            return null;
          })}
        </div>
      </div>
    );
  };

  const renderNavLogEntry = (entry: NavLogEntry) => {
    const tooltipText = entry.scopeLabel ?? entry.pathname;
    return (
      <div
        key={entry.id}
        className="flex w-full justify-start"
        role="note"
        aria-label={`${userFirstName} navigated to ${entry.label}`}
      >
        <div
          className={cn(
            "text-muted-foreground inline-flex max-w-full items-center gap-1.5 rounded-full border border-dashed border-border/60 bg-muted/30 px-3 py-1 text-xs",
            isSidebar && "text-[11px]",
          )}
        >
          <ArrowRightCircle className="size-3 shrink-0" aria-hidden />
          <span className="text-muted-foreground/80">
            <span className="text-foreground/80 font-medium">
              {userFirstName}
            </span>{" "}
            navigated to
          </span>
          <Tooltip>
            <TooltipTrigger asChild>
              <Link
                href={entry.pathname}
                className="text-foreground hover:text-foreground focus-visible:outline-ring max-w-[18ch] truncate font-medium underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2"
              >
                {entry.label}
              </Link>
            </TooltipTrigger>
            <TooltipContent side="top">{tooltipText}</TooltipContent>
          </Tooltip>
        </div>
      </div>
    );
  };

  const renderArchivedPageWelcome = (welcome: PageWelcome) => (
    <div
      key={`archived-${welcome.id}`}
      className="flex w-full flex-col gap-2"
      role="note"
      aria-label="Saved page welcome"
    >
      <div className="flex w-full justify-start">
        <div
          className={cn(
            "flex max-w-[min(100%,36rem)] flex-col gap-2 rounded-xl border border-dashed p-3 text-sm",
            isSidebar
              ? "max-w-[min(100%,100%)] border-sidebar-border/50 bg-sidebar-accent/15 text-xs leading-snug"
              : "border-border/50 bg-muted/10",
          )}
        >
          <div className="text-muted-foreground flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs font-medium tracking-wide uppercase">
            <span className="inline-flex items-center gap-1">
              <Bot className="size-3.5" aria-hidden />
              <span>Superbot</span>
            </span>
            <span className="text-muted-foreground/90 font-normal normal-case tracking-normal">
              Page tip (saved)
            </span>
          </div>
          <h3
            className={cn(
              "text-foreground font-semibold leading-snug",
              isSidebar ? "text-sm" : "text-base",
            )}
          >
            {welcome.headline}
          </h3>
          <p className="text-muted-foreground whitespace-pre-wrap leading-relaxed">
            {welcome.body}
          </p>
          {welcome.suggestions.length > 0 ? (
            <div className="text-muted-foreground border-border/40 mt-0.5 border-t pt-2 text-xs leading-snug">
              <p className="text-foreground/85 mb-1 font-medium">
                Ideas you could still try
              </p>
              <ul className="list-inside list-disc space-y-0.5">
                {welcome.suggestions.map((s) => (
                  <li key={s.label}>{s.label}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );

  const renderPageWelcomeCard = (welcome: PageWelcome) => {
    const staggerBase = 0.04;
    const staggerStep = 0.09;
    return (
      <div key={welcome.id} className="flex w-full flex-col gap-2">
        <StaggeredAnimation
          index={0}
          baseDelay={staggerBase}
          incrementDelay={staggerStep}
          fadeDirection="down"
          className="w-full"
        >
          <div className="flex w-full justify-start">
            <div
              className={cn(
                "flex max-w-[min(100%,36rem)] flex-col gap-2 rounded-xl border p-3 text-sm",
                isSidebar
                  ? "max-w-[min(100%,100%)] border-sidebar-border/40 bg-sidebar-accent/25 text-xs leading-snug"
                  : "border-border/40 bg-muted/15",
              )}
            >
              <div className="text-muted-foreground flex items-center gap-1 text-xs font-medium tracking-wide uppercase">
                <Bot className="size-3.5" aria-hidden />
                <span>Superbot</span>
              </div>
              <h3
                className={cn(
                  "text-foreground font-semibold leading-snug",
                  isSidebar ? "text-sm" : "text-base",
                )}
              >
                {welcome.headline}
              </h3>
              <p className="text-muted-foreground whitespace-pre-wrap leading-relaxed">
                {welcome.body}
              </p>
            </div>
          </div>
        </StaggeredAnimation>
        {welcome.suggestions.map((s, i) => (
          <StaggeredAnimation
            key={s.label}
            index={i + 1}
            baseDelay={staggerBase}
            incrementDelay={staggerStep}
            fadeDirection="down"
            className="w-full"
          >
            <div className="flex w-full justify-start">
              <Button
                type="button"
                variant="outline"
                disabled={busy || !scopeReady}
                className={cn(
                  "h-auto min-h-10 w-full max-w-[min(100%,36rem)] justify-start gap-2.5 rounded-xl border px-3 py-2.5 text-left font-normal shadow-sm",
                  isSidebar
                    ? "max-w-[min(100%,100%)] border-sidebar-border/55 bg-sidebar py-2 text-xs text-foreground hover:bg-sidebar-accent/40"
                    : "border-border/80 text-foreground hover:bg-muted/50",
                )}
                onClick={() => sendPreset(s.prompt, { pageWelcomeInteraction: true })}
              >
                <CircleHelp
                  className="text-muted-foreground size-4 shrink-0"
                  aria-hidden
                />
                <span className="min-w-0 flex-1 leading-snug">{s.label}</span>
              </Button>
            </div>
          </StaggeredAnimation>
        ))}
      </div>
    );
  };

  const VISIBLE_NAV_LOG_COUNT = 3;
  const [expandedNavGroupIds, setExpandedNavGroupIds] = useState<Set<string>>(
    () => new Set(),
  );

  const toggleNavGroup = useCallback((groupId: string) => {
    setExpandedNavGroupIds((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  }, []);

  /**
   * Walk the chronological timeline and bundle consecutive nav-log entries
   * into groups. Each "set" of moves between messages becomes its own group
   * with its own show/hide-earlier toggle. A group's stable id is its
   * oldest entry's id (which never moves, because nav events are only
   * appended).
   */
  type RenderNode =
    | { kind: "message"; message: UIMessage }
    | { kind: "nav-group"; id: string; entries: NavLogEntry[] };

  const renderNodes = useMemo<RenderNode[]>(() => {
    const out: RenderNode[] = [];
    let pending: NavLogEntry[] | null = null;
    const flush = () => {
      if (pending && pending.length > 0) {
        out.push({
          kind: "nav-group",
          id: pending[0]!.id,
          entries: pending,
        });
      }
      pending = null;
    };
    for (const item of timeline) {
      if (item.kind === "message") {
        flush();
        out.push({ kind: "message", message: item.message });
      } else {
        if (!pending) pending = [];
        pending.push(item.entry);
      }
    }
    flush();
    return out;
  }, [timeline]);

  const initialTimelineHadRowsRef = useRef<boolean | null>(null);
  if (initialTimelineHadRowsRef.current === null) {
    initialTimelineHadRowsRef.current =
      renderNodes.length > 0 ||
      pageWelcome != null ||
      archivedPageWelcome != null;
  }
  const shouldMountStaggerTimeline = initialTimelineHadRowsRef.current;

  const renderNavGroup = (groupId: string, entries: NavLogEntry[]) => {
    const expanded = expandedNavGroupIds.has(groupId);
    const hiddenCount = Math.max(0, entries.length - VISIBLE_NAV_LOG_COUNT);
    const visibleEntries = expanded
      ? entries
      : entries.slice(entries.length - VISIBLE_NAV_LOG_COUNT);

    return (
      <div className="flex w-full flex-col gap-1.5">
        {hiddenCount > 0 ? (
          <div className="flex w-full justify-start">
            <button
              type="button"
              onClick={() => toggleNavGroup(groupId)}
              aria-expanded={expanded}
              className={cn(
                "text-muted-foreground hover:text-foreground hover:bg-muted/40 focus-visible:outline-ring inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs focus-visible:outline-2 focus-visible:outline-offset-2",
                isSidebar && "text-[11px]",
              )}
            >
              {expanded ? (
                <ChevronUp className="size-3 shrink-0" aria-hidden />
              ) : (
                <ChevronDown className="size-3 shrink-0" aria-hidden />
              )}
              {expanded
                ? "Hide earlier moves"
                : `Show ${hiddenCount} earlier ${hiddenCount === 1 ? "move" : "moves"}`}
            </button>
          </div>
        ) : null}
        {visibleEntries.map((entry) => renderNavLogEntry(entry))}
      </div>
    );
  };

  const timelineNodes = renderNodes.map((node, i) => {
    const key =
      node.kind === "message" ? node.message.id : `nav-group-${node.id}`;
    const inner =
      node.kind === "message"
        ? renderMessage(node.message)
        : renderNavGroup(node.id, node.entries);

    if (!shouldMountStaggerTimeline) {
      return <Fragment key={key}>{inner}</Fragment>;
    }

    const tailStart = Math.max(
      0,
      renderNodes.length - INITIAL_TIMELINE_STAGGER_MAX,
    );
    if (i < tailStart) {
      return <Fragment key={key}>{inner}</Fragment>;
    }

    const staggerIndex = i - tailStart;
    const fadeDirection =
      node.kind === "message" && node.message.role === "user"
        ? "right"
        : "left";

    return (
      <StaggeredAnimation
        key={key}
        index={staggerIndex}
        baseDelay={0.06}
        incrementDelay={0.1}
        fadeDirection={fadeDirection}
        className="w-full"
      >
        {inner}
      </StaggeredAnimation>
    );
  });

  const assistantThinkingRow = showAssistantThinking ? (
    <div
      className="flex w-full justify-start"
      role="status"
      aria-live="polite"
      aria-label="Superbot is thinking"
    >
      <div
        className={cn(
          "animate-pulse flex max-w-[min(100%,36rem)] flex-col gap-2 rounded-xl p-3 text-sm",
          isSidebar && "max-w-[min(100%,100%)] text-xs leading-snug",
        )}
      >
        <div className="text-muted-foreground flex items-center gap-1 text-xs font-medium tracking-wide uppercase">
          <Bot className="size-3.5 shrink-0" aria-hidden />
          <span>Superbot</span>
        </div>
        <p className="text-muted-foreground">Superbot is thinking…</p>
        <div className="flex flex-col gap-2 pt-0.5">
          <div className="bg-muted-foreground/15 h-2 w-full max-w-[14rem] rounded" />
          <div className="bg-muted-foreground/15 h-2 w-[90%] max-w-[11rem] rounded" />
          <div className="bg-muted-foreground/15 h-2 w-[70%] max-w-[8rem] rounded" />
        </div>
      </div>
    </div>
  ) : null;

  const errorBanner = error ? (
    <div className="bg-destructive/10 text-destructive flex items-center justify-between gap-2 rounded-lg border border-destructive/30 px-3 py-2 text-xs">
      <span className="truncate">{error.message}</span>
      <Button type="button" variant="outline" size="sm" onClick={clearError}>
        Dismiss
      </Button>
    </div>
  ) : null;

  if (isSidebar) {
    return (
      <div className="relative flex h-full max-h-[min(100dvh,100svh)] min-h-0 flex-1 flex-col">
        {sidebarSendPulseTick > 0 ? (
          <div
            key={sidebarSendPulseTick}
            aria-hidden
            className="animate-sidebar-agent-chat-sent-pulse pointer-events-none absolute inset-0 z-[5] rounded-lg"
            onAnimationEnd={(e) => {
              if (e.target === e.currentTarget) {
                setSidebarSendPulseTick(0);
              }
            }}
          />
        ) : null}
        {orgs.length > 0 ? (
          <div className="border-border/40 text-muted-foreground flex shrink-0 items-center gap-2 border-b px-3 py-2 text-xs">
            <Bot className="text-foreground/80 size-3.5 shrink-0" aria-hidden />
            <AgentTenantScopeDropdowns
              organisations={orgs}
              value={tenantScope}
              onChange={setTenantScope}
              disabled={venuesLoading || busy}
              className="ml-0 w-full min-w-0 justify-start"
              comboboxSide="bottom"
            />
          </div>
        ) : null}

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          {hasConversation ? (
            <ScrollArea className="min-h-0 w-full flex-1">
              {showSidebarAnimatedContent ? (
                <div
                  key={sidebarStaggerEpoch}
                  className={cn(
                    "flex max-w-full flex-col gap-2 px-3 pb-4 pt-1",
                    (pageWelcome != null || archivedPageWelcome != null) &&
                      "min-h-full",
                  )}
                >
                  {archivedPageWelcome ? (
                    <div className="flex shrink-0 flex-col gap-1 pb-1">
                      {renderArchivedPageWelcome(archivedPageWelcome)}
                    </div>
                  ) : null}
                  <div className="flex shrink-0 flex-col gap-3">
                    {timelineNodes}
                    {assistantThinkingRow}
                  </div>
                  {pageWelcome ? (
                    <>
                      <div
                        ref={pageWelcomeTailRef}
                        id={`supersolt-agent-page-welcome-${pageWelcome.id}`}
                        className="shrink-0 scroll-mt-3"
                      >
                        {renderPageWelcomeCard(pageWelcome)}
                      </div>
                      <div
                        className="min-h-[min(52vh,26rem)] w-full shrink-0 bg-sidebar"
                        aria-hidden
                      />
                    </>
                  ) : null}
                </div>
              ) : (
                <div
                  className="min-h-[min(40vh,14rem)] w-full shrink-0"
                  aria-hidden
                />
              )}
            </ScrollArea>
          ) : (
            <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-4 pb-6 pt-10">
              {showSidebarAnimatedContent ? (
                <div
                  key={sidebarStaggerEpoch}
                  className="flex w-full max-w-full flex-col items-center gap-3"
                >
                  <StaggeredAnimation
                    index={0}
                    baseDelay={0}
                    incrementDelay={0}
                    fadeDirection="left"
                    className="flex max-w-[14rem] justify-center"
                  >
                    <h2 className="text-foreground text-center text-lg font-bold leading-tight tracking-tight">
                      What can I help with?
                    </h2>
                  </StaggeredAnimation>
                  {!venuesLoading && orgs.length === 0 ? (
                    <p className="text-muted-foreground max-w-md text-center text-sm">
                      No organisations or venues are assigned to your account
                      yet. Ask your admin for access, then refresh this page.
                    </p>
                  ) : null}
                </div>
              ) : (
                <div
                  className="min-h-[min(40vh,14rem)] w-full shrink-0"
                  aria-hidden
                />
              )}
            </div>
          )}
        </div>

        {errorBanner ? (
          <div className="border-border/40 shrink-0 border-t px-3 py-2">
            {errorBanner}
          </div>
        ) : null}

        <div className="shrink-0 px-3 pb-3 pt-2">
          <div className="w-full min-w-0">{composer}</div>
        </div>
      </div>
    );
  }

  if (!hasConversation) {
    return (
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-4 py-6">
        <div className="flex w-full max-w-[min(100%,43.2rem)] flex-col items-center gap-4">
          <div className="flex w-full max-w-lg flex-col items-center justify-center gap-2 sm:max-w-xl sm:flex-row sm:items-center sm:justify-center">
            <StaggeredAnimation
              index={0}
              baseDelay={0}
              incrementDelay={0}
              fadeDirection="up"
              className="flex shrink-0 justify-center"
            >
              <video
                key={assistantVideoTheme}
                autoPlay
                loop
                muted
                playsInline
                preload="auto"
                width={192}
                height={192}
                aria-label="Supersolt assistant"
                className="h-36 w-36 shrink-0 select-none object-contain sm:h-44 sm:w-44 md:h-48 md:w-48"
              >
                <source src={assistantVideoSrc} type="video/webm" />
              </video>
            </StaggeredAnimation>
            <StaggeredAnimation
              index={0}
              baseDelay={0.5}
              incrementDelay={0}
              fadeDirection="left"
              className="flex max-w-xs justify-center sm:justify-start"
            >
              <h2 className="text-foreground text-center text-4xl font-bold leading-tight tracking-tight sm:text-left">
                What can I help with?
              </h2>
            </StaggeredAnimation>
          </div>

          <StaggeredAnimation
            index={0}
            baseDelay={1}
            incrementDelay={0}
            fadeDirection="down"
            className="flex w-full flex-col items-center gap-4"
          >
            {!venuesLoading && orgs.length === 0 ? (
              <p className="text-muted-foreground max-w-md text-center text-sm">
                No organisations or venues are assigned to your account yet. Ask
                your admin for access, then refresh this page.
              </p>
            ) : null}
            <div className="flex w-full flex-col items-stretch gap-2">
              <AgentTenantScopeDropdowns
                organisations={orgs}
                value={tenantScope}
                onChange={setTenantScope}
                disabled={venuesLoading || busy}
                className="w-full justify-start"
              />
              {composer}
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2">
              {QUICK_ACTIONS.map(({ label, icon: Icon, prompt }) => (
                <Button
                  key={label}
                  type="button"
                  variant="outline"
                  disabled={busy || !scopeReady}
                  className="border-border/80 text-foreground hover:bg-muted/60 rounded-full px-4 py-5 font-normal"
                  onClick={() => sendPreset(prompt)}
                >
                  <Icon className="text-muted-foreground size-4" />
                  {label}
                </Button>
              ))}
            </div>
          </StaggeredAnimation>
        </div>

        {error ? (
          <div className="bg-destructive/10 text-destructive mt-4 flex max-w-2xl items-center justify-between gap-2 self-center rounded-lg border border-destructive/30 px-3 py-2 text-sm">
            <span>{error.message}</span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={clearError}
            >
              Dismiss
            </Button>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <ScrollArea className="min-h-0 w-full flex-1">
        <div
          className={cn(
            "mx-auto flex flex-col gap-2 px-3 pb-4 pt-2 sm:px-4",
            composerMaxWithThread,
            (pageWelcome != null || archivedPageWelcome != null) &&
              "min-h-full",
          )}
        >
          {archivedPageWelcome ? (
            <div className="flex w-full shrink-0 flex-col gap-1 pb-1">
              {renderArchivedPageWelcome(archivedPageWelcome)}
            </div>
          ) : null}
          <div className="flex shrink-0 flex-col gap-3">
            {timelineNodes}
            {assistantThinkingRow}
          </div>
          {pageWelcome ? (
            <>
              <div
                ref={pageWelcomeTailRef}
                id={`supersolt-agent-page-welcome-${pageWelcome.id}`}
                className="w-full shrink-0 scroll-mt-3"
              >
                {renderPageWelcomeCard(pageWelcome)}
              </div>
              <div
                className="min-h-[min(52vh,26rem)] w-full shrink-0 bg-background"
                aria-hidden
              />
            </>
          ) : null}
        </div>
      </ScrollArea>

      {error ? (
        <div className="bg-destructive/10 text-destructive mx-auto mb-2 flex w-full max-w-[min(100%,50.4rem)] items-center justify-between gap-2 rounded-lg border border-destructive/30 px-3 py-2 text-sm">
          <span>{error.message}</span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={clearError}
          >
            Dismiss
          </Button>
        </div>
      ) : null}

      <div className="supports-[backdrop-filter]:bg-background/60 shrink-0 px-3 pb-6 pt-3 backdrop-blur sm:px-6">
        <div
          className={cn(
            "mx-auto flex w-full flex-col gap-2",
            composerMaxWithThread,
          )}
        >
          <AgentTenantScopeDropdowns
            organisations={orgs}
            value={tenantScope}
            onChange={setTenantScope}
            disabled={venuesLoading || busy}
            className="w-full justify-start"
            comboboxSide="top"
          />
          <div className="w-full min-w-0">{composer}</div>
        </div>
      </div>
    </div>
  );
}
