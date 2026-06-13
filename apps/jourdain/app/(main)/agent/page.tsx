"use client";

import { Mic, Plus, SendHorizontal } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { cn } from "@workspace/ui/lib/utils";
import { StaggeredAnimation } from "@/components/atoms/staggered-animation";
import { AgentCardView } from "@/components/organisms/agent-cards";
import { apiFetch } from "@/lib/api/fetcher.client";
import { tasksQueryKey, useUpdateTask } from "@/hooks/tasks/use-tasks";
import { useDictation } from "@/hooks/use-dictation";
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

const SUGGESTIONS = [
  "What's on my plate?",
  "What's due today?",
  "Remind me to review my budget on Friday",
];

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

export default function AgentPage() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [isThinking, setIsThinking] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const queryClient = useQueryClient();
  const updateTask = useUpdateTask();

  const hasConversation = messages.length > 0 || isThinking;

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

  useEffect(() => {
    if (!scrollContainerRef.current) {
      return;
    }

    scrollContainerRef.current.scrollTo({
      top: scrollContainerRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, isThinking]);

  return (
    <section className="relative flex h-[calc(100dvh-7.5rem)] min-h-[640px] flex-col overflow-hidden bg-background px-4 pb-0 pt-3">
      {hasConversation ? (
        <div
          ref={scrollContainerRef}
          className="mx-auto w-full max-w-4xl flex-1 space-y-4 overflow-y-auto pb-28 pt-2 pr-1"
        >
          {messages.map((message, index) => (
            <StaggeredAnimation
              key={message.id}
              index={index}
              baseDelay={0}
              incrementDelay={0.03}
              fadeDirection={message.role === "assistant" ? "left" : "right"}
              className="w-full"
            >
              <div
                className={cn(
                  "w-full",
                  message.role === "user" ? "flex justify-end" : "space-y-3",
                )}
              >
                {message.role === "user" ? (
                  <div className="max-w-[75%] rounded-2xl bg-primary px-4 py-2 text-sm text-primary-foreground">
                    {message.text}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {message.cards?.map((card, cardIndex) => (
                      <AgentCardView
                        key={`${message.id}-card-${cardIndex}`}
                        card={card}
                        onToggleTask={handleToggleTask}
                      />
                    ))}
                    {message.text ? (
                      <p
                        className={cn(
                          "max-w-2xl whitespace-pre-wrap text-sm",
                          message.isError
                            ? "text-destructive"
                            : "text-foreground",
                        )}
                      >
                        {message.text}
                      </p>
                    ) : null}
                  </div>
                )}
              </div>
            </StaggeredAnimation>
          ))}

          {isThinking ? (
            <StaggeredAnimation
              index={messages.length + 1}
              baseDelay={0}
              incrementDelay={0}
              fadeDirection="left"
              className="w-full"
            >
              <div className="max-w-2xl space-y-2 rounded-xl border border-border/70 bg-muted/25 px-4 py-3">
                <p className="text-sm font-medium text-foreground">
                  Agent is thinking...
                </p>
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-muted-foreground/50 [animation-delay:0ms]" />
                  <span className="h-2 w-2 animate-pulse rounded-full bg-muted-foreground/50 [animation-delay:200ms]" />
                  <span className="h-2 w-2 animate-pulse rounded-full bg-muted-foreground/50 [animation-delay:400ms]" />
                </div>
              </div>
            </StaggeredAnimation>
          ) : null}
        </div>
      ) : null}

      <div
        className={cn(
          "pointer-events-none absolute left-1/2 w-full max-w-4xl -translate-x-1/2 px-4 transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]",
          hasConversation
            ? "bottom-0 translate-y-0"
            : "top-[46%] -translate-y-1/2",
        )}
      >
        <div className="pointer-events-auto">
          <div
            className={cn(
              "overflow-hidden transition-all duration-500",
              hasConversation
                ? "mb-0 max-h-0 -translate-y-2 opacity-0"
                : "mb-8 max-h-[30rem] translate-y-0 opacity-100",
            )}
          >
            <div className="mb-6 flex justify-center">
              <video
                key="orb-alpha"
                autoPlay
                loop
                muted
                playsInline
                aria-hidden="true"
                className="h-64 w-64 object-cover"
              >
                <source src="/videos/jourdain-orb-loop.webm" type="video/webm" />
                <source src="/videos/jourdain-orb-loop.mp4" type="video/mp4" />
              </video>
            </div>
            <h1 className="text-center text-4xl font-semibold tracking-tight text-foreground">
              What&apos;s brackin?
            </h1>
          </div>

          <form
            className="mx-auto w-full max-w-2xl"
            onSubmit={(event) => {
              event.preventDefault();
              send(input);
            }}
          >
            <div className="flex items-center gap-2 rounded-full border border-border bg-card px-3 py-2 text-card-foreground shadow-sm ring-1 ring-border/50 transition-[box-shadow] focus-within:ring-2 focus-within:ring-ring/40">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-9 w-9 shrink-0 rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
                aria-label="Add attachment"
              >
                <Plus className="h-4 w-4" />
              </Button>

              <Input
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder="Ask anything"
                disabled={isThinking}
                className="h-9 min-w-0 flex-1 border-0 bg-transparent px-0 text-sm text-foreground shadow-none placeholder:text-muted-foreground focus-visible:border-transparent focus-visible:ring-0 dark:bg-transparent"
              />

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

              <Button
                type="submit"
                size="icon"
                className="h-9 w-9 shrink-0 rounded-full"
                aria-label="Send message"
                disabled={isThinking}
              >
                <SendHorizontal className="h-4 w-4" />
              </Button>
            </div>
          </form>

          <div
            className={cn(
              "overflow-hidden transition-all duration-500",
              hasConversation
                ? "max-h-0 opacity-0"
                : "mt-4 max-h-24 opacity-100",
            )}
          >
            <div className="flex flex-wrap items-center justify-center gap-2">
              {SUGGESTIONS.map((suggestion) => (
                <Button
                  key={suggestion}
                  type="button"
                  variant="outline"
                  size="sm"
                  className="rounded-full text-xs text-muted-foreground"
                  onClick={() => send(suggestion)}
                >
                  {suggestion}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
