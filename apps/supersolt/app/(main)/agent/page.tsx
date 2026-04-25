"use client";

import { Mic, Plus, SendHorizontal } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { Input } from "@workspace/ui/components/input";
import { cn } from "@workspace/ui/lib/utils";
import { StaggeredAnimation } from "@/components/atoms/staggered-animation";

type DemoMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
  showRosterCard?: boolean;
  showWagyuCard?: boolean;
};

const ROSTER_STAFF = [
  { name: "Dave", role: "Chef", shift: "06:00-14:00", initials: "DA" },
  { name: "Jane", role: "FOH", shift: "11:00-19:00", initials: "JA" },
  { name: "Kelly", role: "Manager", shift: "08:00-16:00", initials: "KE" },
] as const;

function DemoRosterCard() {
  return (
    <Card className="max-w-2xl border-border/80">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Today&apos;s Roster</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {ROSTER_STAFF.map((person) => (
          <div
            key={person.name}
            className="flex items-center justify-between rounded-md border border-border/70 bg-muted/30 px-3 py-2"
          >
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-xs font-semibold text-foreground">
                {person.initials}
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">{person.name}</p>
                <Badge variant="outline" className="mt-0.5 text-[10px]">
                  {person.role}
                </Badge>
              </div>
            </div>
            <p className="text-sm font-medium text-muted-foreground">{person.shift}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function DemoWagyuRecipeCard() {
  return (
    <Link
      href="http://localhost:3005/guzman-y-gomez/footscray-vic/catalog/items?id=wagyu-burger&tab=details"
      className="block max-w-2xl transition-transform duration-200 hover:scale-[1.01]"
    >
      <Card className="border-border/80 hover:border-primary/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Wagyu Burger</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm text-muted-foreground">
            Recipe details and ingredient list
          </p>
          <div className="flex flex-wrap gap-1.5">
            <Badge variant="secondary">Wagyu Patty</Badge>
            <Badge variant="secondary">Brioche Bun</Badge>
            <Badge variant="secondary">Cheese</Badge>
            <Badge variant="secondary">Pickles</Badge>
            <Badge variant="secondary">Burger Sauce</Badge>
          </div>
          <p className="text-xs text-primary">Open recipe editor</p>
        </CardContent>
      </Card>
    </Link>
  );
}

export default function AgentPage() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<DemoMessage[]>([]);
  const [isThinking, setIsThinking] = useState(false);
  const thinkingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  const hasConversation = messages.length > 0 || isThinking;

  function buildAssistantReply(userText: string): DemoMessage {
    const normalized = userText.trim().toLowerCase();

    if (normalized.includes("who is working today")) {
      return {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        showRosterCard: true,
        text: "According to the roster, Dave, Jane, and Kelly are working today.",
      };
    }

    if (normalized.includes("i want to change the ingredients for the wagyu burger")) {
      return {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        showWagyuCard: true,
        text: "Click on the card to edit the ingredients.",
      };
    }

    return {
      id: `assistant-${Date.now()}`,
      role: "assistant",
      text: "Demo mode: I can show styled cards with text responses. Try asking: who is working today",
    };
  }

  function handleSend() {
    const trimmed = input.trim();
    if (!trimmed || isThinking) {
      return;
    }

    const userMessage: DemoMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      text: trimmed,
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsThinking(true);
    const assistantMessage = buildAssistantReply(trimmed);
    setInput("");

    thinkingTimeoutRef.current = setTimeout(() => {
      setMessages((prev) => [...prev, assistantMessage]);
      setIsThinking(false);
      thinkingTimeoutRef.current = null;
    }, 1300);
  }

  useEffect(() => {
    return () => {
      if (thinkingTimeoutRef.current) {
        clearTimeout(thinkingTimeoutRef.current);
      }
    };
  }, []);

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
    <section className="relative flex h-[calc(100dvh-7.5rem)] min-h-[640px] flex-col overflow-hidden px-4 pb-0 pt-3">
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
                  message.role === "user" ? "flex justify-end" : "space-y-3"
                )}
              >
                {message.role === "user" ? (
                  <div className="max-w-[75%] rounded-2xl bg-primary px-4 py-2 text-sm text-primary-foreground">
                    {message.text}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {message.showRosterCard ? <DemoRosterCard /> : null}
                    {message.showWagyuCard ? <DemoWagyuRecipeCard /> : null}
                    <p className="max-w-2xl text-sm text-foreground">{message.text}</p>
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
                <p className="text-sm font-medium text-foreground">Agent is thinking...</p>
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
          hasConversation ? "bottom-0 translate-y-0" : "top-[46%] -translate-y-1/2"
        )}
      >
        <div className="pointer-events-auto">
          <div
            className={cn(
              "overflow-hidden transition-all duration-500",
              hasConversation
                ? "mb-0 max-h-0 -translate-y-2 opacity-0"
                : "mb-8 max-h-40 translate-y-0 opacity-100"
            )}
          >
            <h1 className="text-center text-4xl font-semibold tracking-tight text-foreground">
              What&apos;s on the agenda today?
            </h1>
          </div>

          <form
            className="mx-auto w-full"
            onSubmit={(event) => {
              event.preventDefault();
              handleSend();
            }}
          >
            <div className="flex items-center gap-2 rounded-full border border-border/70 bg-white px-3 py-2 shadow-sm">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-full text-muted-foreground hover:bg-muted"
                aria-label="Add attachment"
              >
                <Plus className="h-4 w-4" />
              </Button>

              <Input
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder="Ask anything"
                disabled={isThinking}
                className="h-9 border-0 bg-transparent px-0 text-sm shadow-none focus-visible:ring-0"
              />

              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-full text-muted-foreground hover:bg-muted"
                aria-label="Voice input"
              >
                <Mic className="h-4 w-4" />
              </Button>

              <Button
                type="submit"
                size="icon"
                className="h-9 w-9 rounded-full"
                aria-label="Send message"
                disabled={isThinking}
              >
                <SendHorizontal className="h-4 w-4" />
              </Button>
            </div>
          </form>
        </div>
      </div>
    </section>
  );
}
