"use client";

import {
  Dumbbell,
  Mic,
  Moon,
  Plus,
  SendHorizontal,
  UtensilsCrossed,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@workspace/ui/components/button";
import { cn } from "@workspace/ui/lib/utils";
import { StaggeredAnimation } from "@/components/atoms/staggered-animation";
import { JourdainOrb } from "@/components/atoms/jourdain-orb";
import { AgentCardView } from "@/components/organisms/agent-cards";
import { apiFetch } from "@/lib/api/fetcher.client";
import { tasksQueryKey, useUpdateTask } from "@/hooks/tasks/use-tasks";
import { useDictation } from "@/hooks/use-dictation";
import { useStreamingText } from "@/hooks/use-streaming-text";
import { useMeStore } from "@/entities/me/model/store";
import type {
  AgentCard,
  AgentChatMessage,
  AgentReply,
} from "@/entities/agent/model/types";
import type { Task } from "@/entities/tasks/model/types";

type AgentMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
  cards?: AgentCard[];
  isError?: boolean;
};

const HISTORY_LIMIT = 20;

type Suggestion = {
  label: string;
  prompt: string;
  icon: LucideIcon;
  /* Per-suggestion accent: icon colour + a muted border in the same hue. */
  iconColor: string;
  borderColor: string;
};

const SUGGESTIONS: Suggestion[] = [
  {
    label: "What's my Uber Eats spend?",
    prompt: "What's my Uber Eats spend?",
    icon: UtensilsCrossed,
    iconColor: "text-amber-500",
    borderColor: "border-amber-500/30",
  },
  {
    label: "Give me a gym workout session",
    prompt: "Give me a gym workout session",
    icon: Dumbbell,
    iconColor: "text-emerald-500",
    borderColor: "border-emerald-500/30",
  },
  {
    label: "Break down my sleep this week",
    prompt: "Break down my sleep this week",
    icon: Moon,
    iconColor: "text-indigo-400",
    borderColor: "border-indigo-400/30",
  },
];

// Entrance direction per suggestion, in order: left, up, right.
const SUGGESTION_DIRECTIONS = ["left", "up", "right"] as const;
const SUGGESTION_DIRECTION_ANIM: Record<
  (typeof SUGGESTION_DIRECTIONS)[number],
  string
> = {
  left: "animate-slide-left-fade-in",
  up: "animate-slide-up-fade-in",
  right: "animate-slide-right-fade-in",
};

function flipTaskInCards(
  cards: AgentCard[] | undefined,
  taskId: string,
  status: Task["status"],
): AgentCard[] | undefined {
  if (!cards) return cards;
  return cards.map((card) => {
    if (card.type === "task_list") {
      return {
        ...card,
        tasks: card.tasks.map((task) =>
          task.id === taskId ? { ...task, status } : task,
        ),
      };
    }
    if (
      (card.type === "task_created" || card.type === "task_completed") &&
      card.task.id === taskId
    ) {
      return { ...card, task: { ...card.task, status } };
    }
    return card;
  });
}

// Status lines shown while Jourdain is thinking. We try to match the user's last
// prompt to a topic so the line reads as if it's actually working on their
// request ("Checking your gym data…"); otherwise we fall back to a generic line.
const THINKING_LINES: { match: RegExp; lines: string[] }[] = [
  {
    match: /\b(gym|workout|exercise|lift(ing)?|reps?|sets?|session|squat|bench|deadlift|press|cardio|run(ning)?|train(ing)?)\b/i,
    lines: [
      "Checking your gym data",
      "Pulling up your training history",
      "Looking at your recent sessions",
      "Putting a workout together",
    ],
  },
  {
    match: /\b(sleep|slept|bed|rest|nap|nights?|wake|awake)\b/i,
    lines: [
      "Reading your sleep data",
      "Crunching last week's nights",
      "Looking at your sleep trends",
    ],
  },
  {
    match: /\b(spend|spent|spending|cost|money|budget|bank|transaction|eats|uber|grocer|dollars?|\$|finance|paid|expense)\b/i,
    lines: [
      "Going through your transactions",
      "Adding up your spending",
      "Looking at your recent purchases",
    ],
  },
  {
    match: /\b(weight|heart|vitals?|steps?|bp|blood pressure|body|health|hydrat|water)\b/i,
    lines: [
      "Checking your vitals",
      "Reading your health data",
      "Looking at your latest readings",
    ],
  },
  {
    match: /\b(task|todo|to-do|remind(er)?|schedule|plan|due|deadline)\b/i,
    lines: [
      "Looking through your tasks",
      "Sorting out your schedule",
      "Checking what's on your plate",
    ],
  },
];

const GENERIC_THINKING_LINES = [
  "Give me a second",
  "On it",
  "Let me look into that",
  "Pulling that together",
  "Just a moment",
];

function pickThinkingMessage(text: string): string {
  const pool =
    THINKING_LINES.find((entry) => entry.match.test(text))?.lines ??
    GENERIC_THINKING_LINES;
  return pool[Math.floor(Math.random() * pool.length)] ?? "Give me a second";
}

// Seconds between each card sliding in. Slow enough to read as "arriving one by
// one".
const CARD_STAGGER = 0.35;

// Small beat before the reply line starts typing itself out.
const TEXT_LEAD_IN_MS = 150;

/**
 * One assistant turn: the orb avatar + name, then the reply line types itself
 * out, and once it's landed the cards roll in one at a time. Nothing appears all
 * at once — the message arrives before the data, like someone talking you
 * through it, so the page grows gently rather than snapping to a finished state.
 */
/** The body of one assistant turn — the typed reply line plus its cards — with
 *  no orb/name header. Shared by the live turn and the settled transcript. */
function AssistantTurnBody({
  message,
  onToggleTask,
  animateIn = true,
}: {
  message: AgentMessage;
  onToggleTask: (task: Task) => void;
  /** When false, the line and cards appear at rest (no typing / staged reveal) —
   *  used once a turn has settled into the transcript above the live turn. */
  animateIn?: boolean;
}) {
  const cards = message.cards ?? [];
  const streaming = animateIn && !message.isError;
  const visibleLen = useStreamingText(message.text, streaming, TEXT_LEAD_IN_MS);
  const shownText = streaming ? message.text.slice(0, visibleLen) : message.text;
  const streamingCursor = streaming && visibleLen < message.text.length;

  // Skip the entrance choreography entirely for reduced-motion users.
  const [reducedMotion] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true,
  );

  // Hold the cards until the typed line has roughly finished, so the message
  // lands first. useStreamingText runs ~2 chars / 28ms (~14ms/char); clamp the
  // lead-in so a long reply doesn't strand the cards offscreen.
  const cardsBaseDelay =
    !animateIn || reducedMotion || !message.text
      ? 0
      : Math.min(2200, Math.max(400, TEXT_LEAD_IN_MS + message.text.length * 14)) /
        1000;

  return (
    <div className="space-y-3">
      {shownText ? (
            <p
              className={cn(
                "max-w-2xl whitespace-pre-wrap text-sm",
                message.isError ? "text-destructive" : "text-foreground",
              )}
            >
              {shownText}
              {streamingCursor ? (
                <span
                  aria-hidden
                  className="ml-0.5 inline-block h-[0.85em] w-[2px] translate-y-[1px] animate-pulse rounded-full bg-sky-400/80 align-middle"
                />
              ) : null}
            </p>
          ) : null}
          {cards.map((card, cardIndex) => {
            // When this card's fade-in settles — its inner content keys its
            // staged reveal off this so nothing animates while still hidden.
            const cardRevealMs =
              (cardsBaseDelay + (cardIndex + 1) * CARD_STAGGER) * 1000 + 250;
            return (
              <StaggeredAnimation
                key={`${message.id}-card-${cardIndex}`}
                index={cardIndex}
                baseDelay={cardsBaseDelay}
                incrementDelay={CARD_STAGGER}
                fadeDirection="up"
              >
                <AgentCardView
                  card={card}
                  onToggleTask={onToggleTask}
                  revealDelayMs={cardRevealMs}
                  animate={animateIn}
                />
              </StaggeredAnimation>
            );
          })}
    </div>
  );
}

/** One assistant turn in the settled transcript: orb + name + body. The live
 *  turn (thinking / freshly-arriving reply) is handled by AgentTurn instead. */
function AssistantMessage({
  message,
  onToggleTask,
}: {
  message: AgentMessage;
  onToggleTask: (task: Task) => void;
}) {
  return (
    <div className="flex gap-3">
      <JourdainOrb className="mt-0.5 h-11 w-11 shrink-0 rounded-full object-cover" />
      <div className="min-w-0 flex-1 space-y-1.5">
        <span className="px-0.5 text-xs font-medium text-muted-foreground">
          Jourdain
        </span>
        <AssistantTurnBody
          message={message}
          onToggleTask={onToggleTask}
          animateIn={false}
        />
      </div>
    </div>
  );
}

/**
 * The "thinking" bubble: the status line types itself out first (with a trailing
 * caret), and only once it's fully landed do the bouncing dots appear after it.
 */
function ThinkingIndicator({ message }: { message: string }) {
  const shownLen = useStreamingText(message, true, 0);
  const shown = message.slice(0, shownLen);
  const done = shownLen >= message.length;

  return (
    <div className="flex max-w-2xl items-center gap-2 rounded-xl border border-border/70 bg-muted/25 px-4 py-3">
      <p className="text-sm font-medium text-foreground">
        {shown}
        {!done ? (
          <span
            aria-hidden
            className="ml-0.5 inline-block h-[0.85em] w-[2px] translate-y-[1px] animate-pulse rounded-full bg-sky-400/80 align-middle"
          />
        ) : null}
      </p>
      {done ? (
        <span className="flex items-end gap-1 pb-[3px]">
          <span
            style={{ animationDelay: "0ms" }}
            className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60 motion-safe:animate-thinking-bounce"
          />
          <span
            style={{ animationDelay: "100ms" }}
            className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60 motion-safe:animate-thinking-bounce"
          />
          <span
            style={{ animationDelay: "200ms" }}
            className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60 motion-safe:animate-thinking-bounce"
          />
        </span>
      ) : null}
    </div>
  );
}

// How long the thinking bubble takes to fade down and away before the reply
// takes its place. Mirrors the thinking-fade-out keyframe.
const THINKING_EXIT_MS = 320;

/**
 * The live agent turn, pinned to the bottom of the transcript. The orb and name
 * are persistent — they never unmount across the thinking → reply hand-off, so
 * they don't flash or re-render. Only the inner content swaps: the thinking
 * bubble fades down and away, then the reply body fades up into its place.
 */
function AgentTurn({
  isThinking,
  thinkingMessage,
  message,
  onToggleTask,
}: {
  isThinking: boolean;
  thinkingMessage: string;
  /** The freshly-arrived reply, once thinking has finished. */
  message: AgentMessage | null;
  onToggleTask: (task: Task) => void;
}) {
  const [phase, setPhase] = useState<"thinking" | "exiting" | "reply">(
    isThinking ? "thinking" : "reply",
  );
  const wasThinking = useRef(isThinking);

  useEffect(() => {
    if (isThinking) {
      setPhase("thinking");
      wasThinking.current = true;
      return;
    }
    // Just stopped thinking: play the bubble's exit, then reveal the reply.
    if (wasThinking.current) {
      wasThinking.current = false;
      const reduced =
        typeof window !== "undefined" &&
        window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;
      if (reduced) {
        setPhase("reply");
        return;
      }
      setPhase("exiting");
      const id = window.setTimeout(() => setPhase("reply"), THINKING_EXIT_MS);
      return () => window.clearTimeout(id);
    }
    setPhase("reply");
  }, [isThinking]);

  return (
    <div className="flex gap-3">
      <JourdainOrb className="mt-0.5 h-11 w-11 shrink-0 rounded-full object-cover" />
      <div className="min-w-0 flex-1 space-y-1.5">
        <span className="px-0.5 text-xs font-medium text-muted-foreground">
          Jourdain
        </span>
        {phase !== "reply" ? (
          <div
            className={cn(
              phase === "exiting" && "motion-safe:animate-thinking-out",
            )}
          >
            <ThinkingIndicator message={thinkingMessage} />
          </div>
        ) : message ? (
          <div className="motion-safe:animate-slide-up-fade-in">
            <AssistantTurnBody
              message={message}
              onToggleTask={onToggleTask}
              animateIn
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default function AgentPage() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [isThinking, setIsThinking] = useState(false);
  const [thinkingMessage, setThinkingMessage] = useState("Give me a second");
  const queryClient = useQueryClient();
  const updateTask = useUpdateTask();

  // Grow the composer cleanly once the text wraps past one line: the pill turns
  // into a rounded box and the controls drop below the text (mirrors supersolt).
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
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

  // When a suggestion is clicked we type its prompt into the box one character
  // at a time — tinted in that suggestion's colour — then auto-submit, so it
  // reads as the user typing rather than a value snapping in.
  const [typingSuggestion, setTypingSuggestion] = useState<Suggestion | null>(
    null,
  );

  // Input activity flourish: while any input is flowing (typing, dictation, or
  // the simulated suggestion typing — all route through `setInput`), the orb
  // gently swells and a soft blue glow breathes in behind it, then both ease
  // back out a beat after you stop. Driven off a debounced boolean and CSS
  // transitions so it stays smooth instead of restarting per keystroke.
  const [inputActive, setInputActive] = useState(false);
  const inputIdleTimerRef = useRef(0);
  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }
    // Ignore programmatic clears (e.g. after submit) so it recedes cleanly.
    if (input.length === 0) return;

    setInputActive(true);
    window.clearTimeout(inputIdleTimerRef.current);
    inputIdleTimerRef.current = window.setTimeout(
      () => setInputActive(false),
      280,
    );
    return () => window.clearTimeout(inputIdleTimerRef.current);
  }, [input]);

  const hasConversation = messages.length > 0 || isThinking;

  // The newest assistant reply is the "live" turn — it renders in AgentTurn
  // (sharing the persistent orb/name with the thinking bubble it replaces) and is
  // held out of the settled transcript below so the two never double up.
  const lastMessage = messages[messages.length - 1];
  const liveReply =
    !isThinking && lastMessage?.role === "assistant" ? lastMessage : null;
  const settledMessages = liveReply ? messages.slice(0, -1) : messages;
  const showAgentTurn = isThinking || liveReply != null;

  // Intro choreography on the welcome screen: the orb drops in, then the header
  // streams while the input seed-expands alongside it, then the suggestions
  // stagger in. Each phase hands off once its animation has settled.
  const [introPhase, setIntroPhase] = useState<
    "orb" | "reveal" | "suggestions"
  >("orb");

  // Personalized greeting that types itself out on the welcome screen. Wait for
  // the /api/me fetch to resolve so it streams the final text once (no flicker
  // from a nameless first pass), then re-streams if the name arrives later.
  const currentUser = useMeStore((state) => state.currentUser);
  const meError = useMeStore((state) => state.error);
  const meResolved = currentUser !== null || meError !== null;
  const firstName = currentUser?.fullName?.trim().split(/\s+/)[0] ?? null;
  const greeting = firstName
    ? `What are we doing, ${firstName}?`
    : "What are we doing?";
  // Hold streaming until the orb has dropped in (phase leaves "orb"). The header
  // and the input seed both kick off the moment we enter "reveal".
  const headerStreaming =
    introPhase !== "orb" && !hasConversation && meResolved;
  const greetingLen = useStreamingText(greeting, headerStreaming);
  const greetingDone = greetingLen >= greeting.length;

  // Orb settles → hand off to the header. Reduced motion skips straight to the
  // resting state with everything already visible.
  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
    ) {
      setIntroPhase("suggestions");
      return;
    }
    const timer = window.setTimeout(
      () => setIntroPhase((phase) => (phase === "orb" ? "reveal" : phase)),
      850,
    );
    return () => window.clearTimeout(timer);
  }, []);

  // Header + input come in together; once the seed-expand has settled, bring in
  // the suggestions.
  useEffect(() => {
    if (introPhase !== "reveal") return;
    const timer = window.setTimeout(() => setIntroPhase("suggestions"), 800);
    return () => window.clearTimeout(timer);
  }, [introPhase]);

  // Once the title finishes streaming, a sheen overlay does one pass and then
  // unmounts — the solid text underneath never changes, so it just ends white.
  const [sheenDone, setSheenDone] = useState(false);
  useEffect(() => {
    if (!greetingDone) return;
    const timer = window.setTimeout(() => setSheenDone(true), 1700);
    return () => window.clearTimeout(timer);
  }, [greetingDone]);

  const inputRevealed = hasConversation || introPhase !== "orb";
  const seedActive = !hasConversation && introPhase === "reveal";

  const dictationBaseRef = useRef("");
  const {
    isListening,
    isSupported: micSupported,
    toggle: toggleDictation,
    abort: abortDictation,
  } = useDictation((transcript) => {
    const base = dictationBaseRef.current;
    setInput(base ? `${base} ${transcript}` : transcript);
  });

  function handleMicClick() {
    if (!isListening) {
      dictationBaseRef.current = input.trim();
    }
    toggleDictation();
  }

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || isThinking) {
      return;
    }
    abortDictation();

    const userMessage: AgentMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      text: trimmed,
    };

    const history: AgentChatMessage[] = [...messages, userMessage]
      .slice(-HISTORY_LIMIT)
      .map(({ role, text: messageText }) => ({ role, text: messageText }));

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setThinkingMessage(pickThinkingMessage(trimmed));
    setIsThinking(true);

    const result = await apiFetch<AgentReply>("/agent", {
      method: "POST",
      body: JSON.stringify({ messages: history }),
    });

    setIsThinking(false);

    if (result.error) {
      setMessages((prev) => [
        ...prev,
        {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          text: result.error.message,
          isError: true,
        },
      ]);
      return;
    }

    setMessages((prev) => [
      ...prev,
      {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        text: result.data.text,
        cards: result.data.cards,
      },
    ]);

    if (result.data.cards.length > 0) {
      queryClient.invalidateQueries({ queryKey: tasksQueryKey });
    }
  }

  function runSuggestion(suggestion: Suggestion) {
    if (isThinking || typingSuggestion) return;
    abortDictation();
    setInput("");
    setTypingSuggestion(suggestion);
  }

  // Drives the simulated typing for a clicked suggestion. Reveals the prompt
  // char-by-char into the input, then submits after a short beat. Reduced-motion
  // users skip straight to the submit.
  useEffect(() => {
    if (!typingSuggestion) return;
    const text = typingSuggestion.prompt;

    if (
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
    ) {
      setInput(text);
      void send(text);
      setTypingSuggestion(null);
      return;
    }

    let n = 0;
    let submitTimer = 0;
    const interval = window.setInterval(() => {
      n = Math.min(text.length, n + 1);
      setInput(text.slice(0, n));
      if (n >= text.length) {
        window.clearInterval(interval);
        submitTimer = window.setTimeout(() => {
          void send(text);
          setTypingSuggestion(null);
        }, 280);
      }
    }, 28);

    return () => {
      window.clearInterval(interval);
      window.clearTimeout(submitTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typingSuggestion]);

  function handleToggleTask(task: Task) {
    const nextStatus = task.status === "open" ? "done" : "open";
    updateTask.mutate({ taskId: task.id, input: { status: nextStatus } });
    setMessages((prev) =>
      prev.map((message) => ({
        ...message,
        cards: flipTaskInCards(message.cards, task.id, nextStatus),
      })),
    );
  }

  // Only nudge to the bottom when a turn STARTS — so the user sees their message
  // and the thinking orb. Once the reply streams in we leave the scroll alone, so
  // they can read and scroll at their own pace instead of being yanked down. The
  // document is the scroll container, so we scroll the window, not an inner pane.
  useEffect(() => {
    if (!isThinking) {
      return;
    }

    window.scrollTo({
      top: document.documentElement.scrollHeight,
      behavior: "smooth",
    });
  }, [isThinking]);

  const plusButton = (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="h-9 w-9 shrink-0 rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
      aria-label="Add attachment"
    >
      <Plus className="h-4 w-4" />
    </Button>
  );

  const micButton = (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={handleMicClick}
      disabled={!micSupported}
      title={
        micSupported
          ? undefined
          : "Voice needs HTTPS — works on localhost or a deployed/https URL, not a plain http LAN address"
      }
      aria-pressed={isListening}
      aria-label={isListening ? "Stop dictation" : "Start dictation"}
      className={cn(
        "h-9 w-9 shrink-0 rounded-full",
        isListening
          ? "animate-pulse bg-red-500/10 text-red-500 hover:bg-red-500/20 hover:text-red-500"
          : "text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      <Mic className="h-4 w-4" />
    </Button>
  );

  const sendButton = (
    <Button
      type="submit"
      size="icon"
      className="h-9 w-9 shrink-0 rounded-full"
      aria-label="Send message"
      disabled={isThinking}
    >
      <SendHorizontal className="h-4 w-4" />
    </Button>
  );

  const rightControls = (
    <div className="flex shrink-0 items-center gap-2">
      {micButton}
      {sendButton}
    </div>
  );

  const composerTextarea = (
    <textarea
      ref={textareaRef}
      rows={1}
      value={input}
      onChange={(event) => setInput(event.target.value)}
      onKeyDown={(event) => {
        if (event.key === "Enter" && !event.shiftKey) {
          event.preventDefault();
          send(input);
        }
      }}
      placeholder="Ask anything"
      disabled={isThinking}
      readOnly={typingSuggestion !== null}
      /* field-sizing-content grows the box with the text; text-base (16px) on
         mobile stops iOS Safari auto-zooming on focus, sm:text-sm restores the
         14px look on desktop. */
      className={cn(
        "field-sizing-content min-w-0 flex-1 resize-none border-0 bg-transparent px-1 py-1.5 text-base leading-snug shadow-none outline-none placeholder:text-muted-foreground focus-visible:ring-0 sm:text-sm dark:bg-transparent",
        // While the seed is narrow (3rem) the placeholder would wrap into many
        // lines and balloon the height — pin it to one line until it expands.
        seedActive ? "max-h-9 overflow-hidden" : "max-h-56 overflow-y-auto",
        typingSuggestion ? typingSuggestion.iconColor : "text-foreground",
      )}
    />
  );

  // The controls stay inline on the same row in both states — only their
  // vertical alignment changes (centered when single line, pinned to the bottom
  // once the text grows). Because the textarea keeps the same `flex-1` width
  // throughout, its wrap point never shifts, so the box grows straight up with
  // no snap. The textarea is also always the same element in the same position,
  // so it never remounts and keeps focus.
  const composer = (
    <div
      className={cn(
        "mx-auto border border-border bg-card text-card-foreground shadow-sm ring-1 ring-border/50 transition-[box-shadow,border-radius] focus-within:ring-2 focus-within:ring-ring/40",
        isMultiline ? "rounded-3xl" : "rounded-full",
        // Seed circle scales in, pulses, then expands to full width;
        // overflow-hidden clips the still-hidden content while narrow.
        seedActive && "overflow-hidden animate-seed-expand",
      )}
    >
      <div
        className={cn(
          "flex w-full min-w-0 gap-2 px-3 py-2",
          isMultiline ? "items-end" : "items-center",
          seedActive && "animate-seed-content-reveal",
        )}
      >
        {plusButton}
        {composerTextarea}
        {rightControls}
      </div>
    </div>
  );

  return (
    <section className="relative flex min-h-[calc(100svh-7.5rem)] flex-col bg-background px-4 pb-0 pt-3">
      {hasConversation ? (
        <div className="mx-auto w-full max-w-4xl flex-1 space-y-4 pb-4 pt-2">
          {settledMessages.map((message, index) => (
            <StaggeredAnimation
              key={message.id}
              index={index}
              baseDelay={0}
              incrementDelay={0.03}
              fadeDirection={message.role === "assistant" ? "left" : "right"}
              className="w-full"
            >
              <div className="w-full">
                {message.role === "user" ? (
                  <div className="flex flex-col items-end gap-1">
                    <span className="px-1 text-xs font-medium text-muted-foreground">
                      Me
                    </span>
                    <div className="max-w-[75%] rounded-2xl bg-primary px-4 py-2 text-sm text-primary-foreground">
                      {message.text}
                    </div>
                  </div>
                ) : (
                  <AssistantMessage
                    message={message}
                    onToggleTask={handleToggleTask}
                  />
                )}
              </div>
            </StaggeredAnimation>
          ))}

          {showAgentTurn ? (
            <StaggeredAnimation
              index={0}
              baseDelay={0}
              incrementDelay={0}
              fadeDirection="left"
              className="w-full"
            >
              <AgentTurn
                isThinking={isThinking}
                thinkingMessage={thinkingMessage}
                message={liveReply}
                onToggleTask={handleToggleTask}
              />
            </StaggeredAnimation>
          ) : null}
        </div>
      ) : null}

      <div
        className={cn(
          "pointer-events-none z-10 mx-auto w-full max-w-4xl px-4",
          // The document scrolls as a whole; the composer sticks to the bottom of
          // the viewport in conversation, and centres the hero on the welcome
          // screen. A top fade lets the transcript slip cleanly underneath it.
          hasConversation
            ? "sticky bottom-0 bg-gradient-to-t from-background via-background via-65% to-transparent pb-4 pt-6"
            : "my-auto",
        )}
      >
        <div className="pointer-events-auto">
          <div
            className={cn(
              "transition-all duration-500",
              hasConversation
                ? "mb-0 max-h-0 -translate-y-2 overflow-hidden opacity-0"
                : "mb-8 max-h-[30rem] translate-y-0 overflow-visible opacity-100",
            )}
          >
            <div className="relative mb-6 flex justify-center">
              {/* Soft blue glow that blooms out from behind the orb just as it
                  hits its peak overshoot (orb-grow-in's 55% keyframe ≈ 0.33s),
                  then expands and fades to nothing. The delay + `both` fill hold
                  it invisible until that moment. */}
              <span
                aria-hidden
                style={{ animationDelay: "0.33s" }}
                className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-sky-400/35 blur-3xl motion-safe:animate-orb-glow-bloom motion-reduce:hidden"
              />
              {/* Soft blue glow that breathes in behind the orb while input is
                  flowing, then eases back out a beat after you stop. */}
              <span
                aria-hidden
                className={cn(
                  "pointer-events-none absolute left-1/2 top-1/2 -z-10 h-52 w-52 -translate-x-1/2 -translate-y-1/2 rounded-full bg-sky-400/30 blur-2xl transition-all duration-500 ease-out motion-reduce:hidden",
                  inputActive ? "scale-100 opacity-100" : "scale-75 opacity-0",
                )}
              />
              <div className="animate-orb-grow-in">
                <div
                  className={cn(
                    "origin-center transition-transform duration-500 ease-out",
                    inputActive ? "scale-[1.04]" : "scale-100",
                  )}
                >
                  <JourdainOrb className="h-64 w-64 object-cover" />
                </div>
              </div>
            </div>
            <h1
              aria-label={greeting}
              className="text-center text-4xl font-semibold tracking-tight text-foreground"
            >
              {/* Solid text is the resting truth. The sheen below sits on top for
                  one pass, then unmounts — no swap, so it just ends white. */}
              <span className="relative inline-block">
                {greeting.slice(0, greetingLen)}
                {greetingDone && !sheenDone ? (
                  <span
                    aria-hidden
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-sky-400 via-50% to-transparent bg-[length:65%_100%] bg-clip-text bg-no-repeat text-transparent [text-shadow:0_0_16px_rgba(56,189,248,0.6)] animate-text-sheen-pass"
                  >
                    {greeting}
                  </span>
                ) : null}
              </span>
              {!greetingDone && headerStreaming ? (
                <span
                  aria-hidden
                  className="ml-0.5 inline-block h-[0.85em] w-[3px] translate-y-[1px] animate-pulse rounded-full bg-sky-400/80 align-middle"
                />
              ) : null}
            </h1>
          </div>

          <form
            className={cn(
              "mx-auto w-full max-w-2xl transition-opacity",
              inputRevealed ? "opacity-100" : "pointer-events-none opacity-0",
            )}
            onSubmit={(event) => {
              event.preventDefault();
              send(input);
            }}
          >
            {composer}
          </form>

          <div
            className={cn(
              "overflow-hidden transition-all duration-500",
              hasConversation
                ? "max-h-0 opacity-0"
                : "mt-4 max-h-40 opacity-100",
            )}
          >
            {/* The badges are always laid out so they reserve their space from
                the start — nothing above shifts when they appear. Each only
                animates in (left, up, right; staggered) once it's their turn. */}
            <div className="flex flex-wrap items-center justify-center gap-2">
              {SUGGESTIONS.map((suggestion, index) => {
                const Icon = suggestion.icon;
                const animate = introPhase === "suggestions";
                return (
                  <div
                    key={suggestion.label}
                    className={cn(
                      "opacity-0",
                      animate &&
                        SUGGESTION_DIRECTION_ANIM[
                          SUGGESTION_DIRECTIONS[index] ?? "up"
                        ],
                    )}
                    style={
                      animate
                        ? {
                            animationDelay: `${(index * 0.12).toFixed(2)}s`,
                            animationFillMode: "forwards",
                          }
                        : undefined
                    }
                  >
                    <button
                      type="button"
                      onClick={() => runSuggestion(suggestion)}
                      disabled={isThinking || typingSuggestion !== null}
                      className={cn(
                        "flex items-center gap-2 rounded-full border bg-card px-3 py-1.5 text-xs font-medium text-foreground shadow-sm transition-colors hover:bg-muted/50 disabled:cursor-not-allowed disabled:opacity-60",
                        suggestion.borderColor,
                      )}
                    >
                      <Icon
                        className={cn("h-4 w-4 shrink-0", suggestion.iconColor)}
                      />
                      {suggestion.label}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
