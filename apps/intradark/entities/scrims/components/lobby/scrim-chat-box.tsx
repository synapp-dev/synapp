"use client";

/* eslint-disable @next/next/no-img-element -- remote Steam avatars */
import { useCallback, useEffect, useRef, useState } from "react";
import { formatDistanceToNow, parseISO } from "date-fns";
import { Globe, Send, Users } from "lucide-react";

import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip";
import { cn } from "@workspace/ui/lib/utils";

import { createBrowserClient } from "@/utils/supabase/client";

type ChatMessage = {
  id: string;
  user_id: string;
  alias: string | null;
  steam_avatar: string | null;
  message: string;
  timestamp: string;
};

type MessageGroup = {
  userId: string;
  alias: string | null;
  avatar: string | null;
  messages: ChatMessage[];
};

function groupMessages(rows: ChatMessage[]): MessageGroup[] {
  const groups: MessageGroup[] = [];
  for (const row of rows) {
    const last = groups[groups.length - 1];
    if (last && last.userId === row.user_id) {
      last.messages.push(row);
    } else {
      groups.push({
        userId: row.user_id,
        alias: row.alias,
        avatar: row.steam_avatar,
        messages: [row],
      });
    }
  }
  return groups;
}

export function ScrimChatBox({ scrimId }: { scrimId: string }) {
  const [groups, setGroups] = useState<MessageGroup[]>([]);
  const [input, setInput] = useState("");
  const [canSend, setCanSend] = useState(true);
  const endRef = useRef<HTMLDivElement>(null);

  const fetchMessages = useCallback(async () => {
    const supabase = createBrowserClient();
    const { data } = await supabase
      .from("scrim_messages_with_profiles")
      .select("*")
      .eq("scrim_id", scrimId)
      .order("timestamp", { ascending: true });
    setGroups(groupMessages((data ?? []) as ChatMessage[]));
  }, [scrimId]);

  useEffect(() => {
    void fetchMessages();
  }, [fetchMessages]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [groups]);

  useEffect(() => {
    const supabase = createBrowserClient();
    const channel = supabase
      .channel(`scrim-chat:${scrimId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "scrim_chat_messages",
          filter: `scrim_id=eq.${scrimId}`,
        },
        () => void fetchMessages(),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [scrimId, fetchMessages]);

  const send = async () => {
    const trimmed = input.trim();
    if (!canSend || trimmed.length === 0 || trimmed.length > 256) return;
    const supabase = createBrowserClient();
    const { error } = await supabase
      .from("scrim_chat_messages")
      .insert([{ scrim_id: scrimId, channel: "global", message: trimmed }]);
    if (error) return;
    setInput("");
    setCanSend(false);
    setTimeout(() => setCanSend(true), 1000);
  };

  return (
    <div className="flex h-80 w-full flex-col rounded-lg border bg-card">
      <div className="flex items-center gap-1 border-b px-3 py-2">
        <span className="flex items-center gap-1 rounded-md bg-accent px-3 py-1 text-xs font-bold">
          <Globe className="size-3.5" /> Global Chat
        </span>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="flex cursor-not-allowed items-center gap-1 px-3 py-1 text-xs font-bold text-muted-foreground/40">
              <Users className="size-3.5" /> Team Chat
            </span>
          </TooltipTrigger>
          <TooltipContent>Coming soon</TooltipContent>
        </Tooltip>
      </div>

      <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-3">
        {groups.length === 0 ? (
          <p className="m-auto text-xs text-muted-foreground">No messages yet.</p>
        ) : (
          groups.map((group, gi) => (
            <div key={gi} className="flex flex-col animate-slide-down-fade-in">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {group.avatar ? (
                    <img
                      src={group.avatar}
                      alt=""
                      className="size-5 rounded-full object-cover"
                    />
                  ) : (
                    <div className="size-5 rounded-full bg-muted" />
                  )}
                  <span className="text-sm font-bold">{group.alias ?? "Player"}</span>
                </div>
                <span className="text-[0.65rem] text-muted-foreground">
                  {formatDistanceToNow(
                    parseISO(group.messages[group.messages.length - 1]!.timestamp),
                  )}{" "}
                  ago
                </span>
              </div>
              {group.messages.map((m) => (
                <p key={m.id} className="pl-7 text-sm">
                  {m.message}
                </p>
              ))}
            </div>
          ))
        )}
        <div ref={endRef} />
      </div>

      <form
        className="flex items-center gap-2 border-t p-2"
        onSubmit={(e) => {
          e.preventDefault();
          void send();
        }}
      >
        <Input
          value={input}
          maxLength={256}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a message…"
          className={cn(!canSend && "opacity-60")}
        />
        <Button type="submit" size="icon" disabled={!canSend}>
          <Send className="size-4" />
        </Button>
      </form>
    </div>
  );
}
