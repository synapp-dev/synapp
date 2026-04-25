"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { format, isToday, isYesterday } from "date-fns";
import { Loader2, Search } from "lucide-react";

import { Input } from "@workspace/ui/components/input";
import { cn } from "@workspace/ui/lib/utils";
import { DUMMY_CASES } from "@/lib/dummy-cases";

import { useMessagesDemo } from "@/components/organisms/messages-demo-context";

function initials(displayName: string): string {
  const parts = displayName.replace(/\./g, "").split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]!.charAt(0)}${parts[1]!.charAt(0)}`.toUpperCase();
  }
  const one = parts[0] ?? "?";
  return one.slice(0, 2).toUpperCase();
}

function formatShortTime(ts: number): string {
  const d = new Date(ts);
  if (isToday(d)) return format(d, "h:mm a");
  if (isYesterday(d)) return "Yesterday";
  return format(d, "MMM d");
}

type MessagesInboxProps = {
  className?: string;
};

export function MessagesInbox({ className }: MessagesInboxProps) {
  const pathname = usePathname();
  const { threads } = useMessagesDemo();
  const showSectionLabel = pathname !== "/messages";
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  const orderedCases = useMemo(() => {
    return [...DUMMY_CASES].sort((a, b) => {
      const ta = threads[a.slug]?.at(-1)?.at ?? 0;
      const tb = threads[b.slug]?.at(-1)?.at ?? 0;
      return tb - ta;
    });
  }, [threads]);

  useEffect(() => {
    setIsSearching(true);
    const timeout = setTimeout(() => {
      setDebouncedQuery(searchQuery.trim().toLowerCase());
      setIsSearching(false);
    }, 250);
    return () => clearTimeout(timeout);
  }, [searchQuery]);

  const filteredCases = useMemo(() => {
    const query = debouncedQuery;
    if (!query) return orderedCases;

    return orderedCases.filter((c) => {
      const lastMessage = threads[c.slug]?.at(-1)?.text ?? "";
      const haystack = `${c.displayName} ${c.subtitle} ${lastMessage}`.toLowerCase();
      return haystack.includes(query);
    });
  }, [debouncedQuery, orderedCases, threads]);

  return (
    <div className={cn("flex min-h-0 flex-1 flex-col", className)}>
      <div className="border-b px-3 py-2">
        {showSectionLabel ? (
          <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
            Chats
          </p>
        ) : null}
        <div className="relative mt-2">
          <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search conversations..."
            aria-label="Search conversations"
            className="h-9 pr-8 pl-8"
          />
          {isSearching ? (
            <Loader2 className="text-muted-foreground absolute top-1/2 right-2.5 size-4 -translate-y-1/2 animate-spin" />
          ) : null}
        </div>
      </div>
      <div
        className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto p-2"
        role="navigation"
        aria-label="Conversations"
      >
        {debouncedQuery && filteredCases.length === 0 ? (
          <p className="text-muted-foreground px-2 py-4 text-sm">
            No conversations found.
          </p>
        ) : null}
        {filteredCases.map((c) => {
          const list = threads[c.slug] ?? [];
          const last = list.at(-1);
          const preview = last?.text ?? c.subtitle;
          const active = pathname === `/messages/${c.slug}`;
          const unread = Boolean(c.hasUnread);

          return (
            <Link
              key={c.slug}
              href={`/messages/${c.slug}`}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex w-full items-center gap-3 rounded-md px-2 py-2.5 text-left text-sm transition-colors",
                "hover:bg-muted/80 focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none",
                active && "bg-muted",
              )}
            >
              <span className="bg-muted-foreground/15 text-muted-foreground flex size-11 shrink-0 items-center justify-center rounded-full text-xs font-semibold">
                {initials(c.displayName)}
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="flex min-w-0 items-baseline justify-between gap-2">
                  <span
                    className={cn("truncate", unread ? "font-semibold" : "font-medium")}
                  >
                    {c.displayName}
                  </span>
                  {last ? (
                    <time
                      className="text-muted-foreground shrink-0 text-[0.65rem] tabular-nums"
                      dateTime={new Date(last.at).toISOString()}
                    >
                      {formatShortTime(last.at)}
                    </time>
                  ) : null}
                </span>
                <span
                  className={cn(
                    "line-clamp-2 text-xs leading-snug",
                    unread ? "text-foreground font-medium" : "text-muted-foreground",
                  )}
                >
                  {preview}
                </span>
              </span>
              {unread ? (
                <span
                  className="ml-1 size-2.5 shrink-0 rounded-full bg-blue-500"
                  aria-label="Unread messages"
                  title="Unread messages"
                />
              ) : null}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
