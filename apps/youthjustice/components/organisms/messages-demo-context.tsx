"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { DUMMY_CASES, type DummyCase } from "@/lib/dummy-cases";

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
  at: number;
  replyToText?: string;
  replyToRole?: "user" | "assistant";
};

/** Web Crypto `randomUUID` is missing in some dev / non-HTTPS contexts; keep demo IDs stable regardless. */
function newChatMessageId(): string {
  const c = globalThis.crypto;
  if (c && typeof c.randomUUID === "function") {
    return c.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 11)}`;
}

const SEED_TIME_BASE_MS = Date.UTC(2026, 3, 25, 7, 0, 0);
const MINUTE_MS = 60_000;

const CASE_MANAGER_OPENERS = [
  "Morning check-in from me. How are you feeling about this week?",
  "How are things going today with school and your appointments?",
  "Quick check-in from your case manager. Do you need any support this afternoon?",
  "Just checking in before tomorrow's meeting. How are you travelling?",
];

const PARTICIPANT_UPDATES = [
  "I made it to class this morning and stayed for the full session.",
  "I got there late but still checked in with the support teacher.",
  "I called ahead and they said I can join first period tomorrow.",
  "I was anxious but still went in after recess and it was okay.",
];

const CASE_MANAGER_FOLLOW_UPS = [
  "Great effort. I will update your case notes and we can keep building on this.",
  "Thanks for letting me know. I can help with transport if that is still an issue.",
  "That is solid progress. I will bring this into your next support plan review.",
  "Nice work showing up. We can talk through what made today easier and repeat it.",
];

const PARTICIPANT_REPLIES = [
  "Thanks, that helps. I can do a quick call before school tomorrow.",
  "I am okay today. I still need help sorting transport for Thursday.",
  "I can make the appointment if we move it to after 2pm.",
  "I am trying to stay on track this week and will message if anything changes.",
];

const PARTICIPANT_OPENERS = [
  "Hey, I wanted to give you an update from today.",
  "Thanks for checking in. I had a better day than last week.",
  "I can do the session, just need to confirm the time.",
  "I got to class and spoke with the wellbeing teacher.",
];

function buildSeedThread(c: DummyCase, idx: number): ChatMessage[] {
  const priorityOffsetMs =
    c.slug === "rebecca-king" ? DUMMY_CASES.length * 20 * MINUTE_MS : 0;
  const baseAt = SEED_TIME_BASE_MS + idx * 11 * MINUTE_MS + priorityOffsetMs;
  const topic = [
    "school attendance plan",
    "housing check-in",
    "employment pathway session",
    "court support preparation",
    "wellbeing appointment",
  ][idx % 5]!;

  if (c.slug === REBECCA_SLUG) {
    return [
      {
        id: `${c.slug}-seed-1`,
        role: "assistant",
        text: `${CASE_MANAGER_OPENERS[idx % CASE_MANAGER_OPENERS.length]} We can also run through your ${topic} when you're ready.`,
        at: baseAt,
      },
      {
        id: `${c.slug}-seed-2`,
        role: "user",
        text: PARTICIPANT_UPDATES[idx % PARTICIPANT_UPDATES.length]!,
        at: baseAt + 3 * MINUTE_MS,
      },
      {
        id: `${c.slug}-seed-3`,
        role: "assistant",
        text: CASE_MANAGER_FOLLOW_UPS[idx % CASE_MANAGER_FOLLOW_UPS.length]!,
        at: baseAt + 6 * MINUTE_MS,
      },
      {
        id: `${c.slug}-seed-4`,
        role: "user",
        text: PARTICIPANT_REPLIES[idx % PARTICIPANT_REPLIES.length]!,
        at: baseAt + 9 * MINUTE_MS,
      },
    ];
  }

  return [
    {
      id: `${c.slug}-seed-1`,
      role: "user",
      text: `${CASE_MANAGER_OPENERS[idx % CASE_MANAGER_OPENERS.length]} We can also run through your ${topic} when you're ready.`,
      at: baseAt,
    },
    {
      id: `${c.slug}-seed-2`,
      role: "assistant",
      text: PARTICIPANT_UPDATES[idx % PARTICIPANT_UPDATES.length]!,
      at: baseAt + 3 * MINUTE_MS,
    },
    {
      id: `${c.slug}-seed-3`,
      role: "user",
      text: CASE_MANAGER_FOLLOW_UPS[idx % CASE_MANAGER_FOLLOW_UPS.length]!,
      at: baseAt + 6 * MINUTE_MS,
    },
    {
      id: `${c.slug}-seed-4`,
      role: "assistant",
      text: PARTICIPANT_REPLIES[idx % PARTICIPANT_REPLIES.length]!,
      at: baseAt + 9 * MINUTE_MS,
    },
  ];
}

function buildInitialThreads(): Record<string, ChatMessage[]> {
  return Object.fromEntries(DUMMY_CASES.map((c, idx) => [c.slug, buildSeedThread(c, idx)]));
}

function replyFor(index: number): string {
  const templates = [
    "Thanks for checking in. I can do that and will keep you updated.",
    "Okay, that works for me. I will message again after the appointment.",
    "Got it. I am on board with that plan for this week.",
    "I appreciate it. I will follow through and let you know how it goes.",
    PARTICIPANT_OPENERS[index % PARTICIPANT_OPENERS.length]!,
  ];
  return templates[index % templates.length]!;
}

function getDummyCaseForSlug(slug: string): DummyCase {
  return DUMMY_CASES.find((c) => c.slug === slug) ?? DUMMY_CASES[0]!;
}

const ASSISTANT_REPLY_DELAY_MS = 1000;
const REBECCA_SLUG = "rebecca-king";

const REBECCA_OPENERS = ["Aaron.", "Where are you?"] as const;
const REBECCA_RESPONSE_BLOCK = [
  "Not bubs Aaron.",
  "Rebecca",
  "Please tell me you didn't get yourself arrested again!!",
] as const;
const REBECCA_FINAL_RESPONSE = "🙄";

type RebeccaScriptPhase =
  | "idle"
  | "opening"
  | "wait-user-openers"
  | "sending-response-block"
  | "wait-user-final"
  | "done";

type RebeccaScriptState = {
  phase: RebeccaScriptPhase;
  firstUserCount: number;
  started: boolean;
  openerUserMessages: ChatMessage[];
};

function computeRebeccaDelayMs(text: string): number {
  const base = 1000;
  const lengthFactor = text.trim().length * 55;
  const jitter = Math.floor(Math.random() * 550);
  return Math.max(1000, Math.min(5000, base + lengthFactor + jitter));
}

type MessagesDemoContextValue = {
  threads: Record<string, ChatMessage[]>;
  sendMessage: (slug: string, text: string) => void;
  simulateIncomingMessage: (slug: string, text: string, delayMs?: number) => void;
  resetDemoState: () => void;
  startRebeccaLiveScenario: () => void;
  assistantTypingForSlug: string | null;
};

const MessagesDemoContext = createContext<MessagesDemoContextValue | null>(
  null,
);

export function MessagesDemoProvider({ children }: { children: ReactNode }) {
  const [threads, setThreads] = useState<Record<string, ChatMessage[]>>(
    buildInitialThreads,
  );
  const [assistantTypingForSlug, setAssistantTypingForSlug] = useState<
    string | null
  >(null);
  const pendingReplyRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingIncomingRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const scriptTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const rebeccaScriptRef = useRef<RebeccaScriptState>({
    phase: "idle",
    firstUserCount: 0,
    started: false,
    openerUserMessages: [],
  });

  const clearAllTimers = useCallback(() => {
    if (pendingReplyRef.current) {
      clearTimeout(pendingReplyRef.current);
      pendingReplyRef.current = null;
    }
    pendingIncomingRef.current.forEach((timer) => clearTimeout(timer));
    pendingIncomingRef.current = [];
    scriptTimersRef.current.forEach((timer) => clearTimeout(timer));
    scriptTimersRef.current = [];
  }, []);

  useEffect(() => {
    return () => {
      clearAllTimers();
    };
  }, [clearAllTimers]);

  const appendAssistantMessage = useCallback(
    (
      slug: string,
      text: string,
      replyMeta?: Pick<ChatMessage, "replyToText" | "replyToRole">,
    ) => {
    setThreads((prev) => {
      const list = prev[slug] ?? [];
      const assistantMsg: ChatMessage = {
        id: newChatMessageId(),
        role: "assistant",
        text,
        at: Date.now(),
        ...replyMeta,
      };
      return { ...prev, [slug]: [...list, assistantMsg] };
    });
    },
    [],
  );

  const queueRebeccaMessage = useCallback(
    (
      text: string,
      onDelivered?: () => void,
      replyMeta?: Pick<ChatMessage, "replyToText" | "replyToRole">,
    ) => {
      setAssistantTypingForSlug(REBECCA_SLUG);
      const timer = setTimeout(
        () => {
          scriptTimersRef.current = scriptTimersRef.current.filter((t) => t !== timer);
          appendAssistantMessage(REBECCA_SLUG, text, replyMeta);
          setAssistantTypingForSlug((current) =>
            current === REBECCA_SLUG ? null : current,
          );
          onDelivered?.();
        },
        computeRebeccaDelayMs(text),
      );
      scriptTimersRef.current.push(timer);
    },
    [appendAssistantMessage],
  );

  const runRebeccaResponseBlock = useCallback(() => {
    rebeccaScriptRef.current.phase = "sending-response-block";
    const [firstUserMsg, secondUserMsg] = rebeccaScriptRef.current.openerUserMessages;
    const steps = [...REBECCA_RESPONSE_BLOCK];
    const runAt = (index: number) => {
      const line = steps[index];
      if (!line) {
        rebeccaScriptRef.current.phase = "wait-user-final";
        return;
      }
      const replyMeta =
        index === 0 && firstUserMsg
          ? {
              replyToText: firstUserMsg.text,
              replyToRole: firstUserMsg.role,
            }
          : index === 2 && secondUserMsg
            ? {
                replyToText: secondUserMsg.text,
                replyToRole: secondUserMsg.role,
              }
            : undefined;
      queueRebeccaMessage(line, () => runAt(index + 1), replyMeta);
    };
    runAt(0);
  }, [queueRebeccaMessage]);

  const startRebeccaLiveScenario = useCallback(() => {
    const current = rebeccaScriptRef.current;
    if (current.started) return;
    rebeccaScriptRef.current = {
      phase: "opening",
      firstUserCount: 0,
      started: true,
      openerUserMessages: [],
    };

    queueRebeccaMessage(REBECCA_OPENERS[0], () => {
      queueRebeccaMessage(REBECCA_OPENERS[1], () => {
        rebeccaScriptRef.current.phase = "wait-user-openers";
      });
    });
  }, [queueRebeccaMessage]);

  const resetDemoState = useCallback(() => {
    clearAllTimers();
    setThreads(buildInitialThreads());
    setAssistantTypingForSlug(null);
    rebeccaScriptRef.current = {
      phase: "idle",
      firstUserCount: 0,
      started: false,
      openerUserMessages: [],
    };
  }, [clearAllTimers]);

  const sendMessage = useCallback((slug: string, text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    const userMsg: ChatMessage = {
      id: newChatMessageId(),
      role: "user",
      text: trimmed,
      at: Date.now(),
    };

    setThreads((prev) => {
      const list = prev[slug] ?? [];
      return { ...prev, [slug]: [...list, userMsg] };
    });

    if (slug === REBECCA_SLUG) {
      const state = rebeccaScriptRef.current;
      if (state.phase === "wait-user-openers") {
        state.firstUserCount += 1;
        state.openerUserMessages = [...state.openerUserMessages, userMsg].slice(-2);
        if (state.firstUserCount >= 2) {
          runRebeccaResponseBlock();
        }
        return;
      }

      if (state.phase === "wait-user-final") {
        state.phase = "done";
        queueRebeccaMessage(REBECCA_FINAL_RESPONSE, undefined, {
          replyToText: userMsg.text,
          replyToRole: userMsg.role,
        });
      }
      return;
    }

    if (pendingReplyRef.current) {
      clearTimeout(pendingReplyRef.current);
      pendingReplyRef.current = null;
    }

    const caseForThread = getDummyCaseForSlug(slug);
    setAssistantTypingForSlug(slug);

    pendingReplyRef.current = setTimeout(() => {
      pendingReplyRef.current = null;
      setAssistantTypingForSlug(null);
      setThreads((prev) => {
        const list = prev[slug] ?? [];
        const assistantMsg: ChatMessage = {
          id: newChatMessageId(),
          role: "assistant",
          text: replyFor(list.length + caseForThread.slug.length),
          at: Date.now(),
        };
        return { ...prev, [slug]: [...list, assistantMsg] };
      });
    }, ASSISTANT_REPLY_DELAY_MS);
  }, [queueRebeccaMessage, runRebeccaResponseBlock]);

  const simulateIncomingMessage = useCallback(
    (slug: string, text: string, delayMs = 1200) => {
      const trimmed = text.trim();
      if (!trimmed) return;

      setAssistantTypingForSlug(slug);

      const timer = setTimeout(() => {
        pendingIncomingRef.current = pendingIncomingRef.current.filter(
          (activeTimer) => activeTimer !== timer,
        );
        setAssistantTypingForSlug((current) => (current === slug ? null : current));
        setThreads((prev) => {
          const list = prev[slug] ?? [];
          const last = list.at(-1);
          if (
            last &&
            last.role === "assistant" &&
            last.text === trimmed &&
            Date.now() - last.at < 30_000
          ) {
            return prev;
          }
          const incomingMsg: ChatMessage = {
            id: newChatMessageId(),
            role: "assistant",
            text: trimmed,
            at: Date.now(),
          };
          return { ...prev, [slug]: [...list, incomingMsg] };
        });
      }, delayMs);

      pendingIncomingRef.current.push(timer);
    },
    [],
  );

  const value = useMemo(
    () => ({
      threads,
      sendMessage,
      simulateIncomingMessage,
      resetDemoState,
      startRebeccaLiveScenario,
      assistantTypingForSlug,
    }),
    [
      threads,
      sendMessage,
      simulateIncomingMessage,
      resetDemoState,
      startRebeccaLiveScenario,
      assistantTypingForSlug,
    ],
  );

  return (
    <MessagesDemoContext.Provider value={value}>
      {children}
    </MessagesDemoContext.Provider>
  );
}

export function useMessagesDemo(): MessagesDemoContextValue {
  const ctx = useContext(MessagesDemoContext);
  if (!ctx) {
    throw new Error("useMessagesDemo must be used within MessagesDemoProvider");
  }
  return ctx;
}
