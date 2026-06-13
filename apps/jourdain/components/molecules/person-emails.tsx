"use client";

import { Mail } from "lucide-react";
import { formatDistanceToNowStrict, parseISO } from "date-fns";
import { cn } from "@workspace/ui/lib/utils";
import { usePersonEmails } from "@/hooks/people/use-people";
import type { PersonEmailThread } from "@/entities/people/model/types";

function relativeDate(iso: string): string {
  if (!iso) return "";
  try {
    return formatDistanceToNowStrict(parseISO(iso), { addSuffix: true });
  } catch {
    return "";
  }
}

function Hint({ children }: { children: React.ReactNode }) {
  return <p className="text-xs text-muted-foreground">{children}</p>;
}

function ReconnectHint({ label }: { label: string }) {
  return (
    <p className="text-xs text-muted-foreground">
      {label}{" "}
      <a
        href="/api/google/connect"
        className="font-medium text-foreground underline-offset-2 hover:underline"
      >
        Connect Google
      </a>
    </p>
  );
}

function ThreadRow({ thread }: { thread: PersonEmailThread }) {
  return (
    <a
      href={thread.link}
      target="_blank"
      rel="noreferrer"
      className="group flex items-start gap-2 rounded-md border border-border/50 bg-muted/20 px-3 py-2 transition-colors hover:border-border hover:bg-muted/40"
    >
      <span
        className={cn(
          "mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full",
          thread.unread ? "bg-primary" : "bg-transparent"
        )}
        aria-hidden
      />
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline justify-between gap-2">
          <span
            className={cn(
              "truncate text-sm",
              thread.unread ? "font-semibold" : "font-medium"
            )}
          >
            {thread.subject}
          </span>
          <span className="shrink-0 text-[11px] text-muted-foreground">
            {relativeDate(thread.date)}
          </span>
        </span>
        <span className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
          <span className="text-foreground/70">
            {thread.outbound ? "You" : thread.fromName}
          </span>
          {" — "}
          {thread.snippet}
        </span>
      </span>
    </a>
  );
}

export function PersonEmails({ personId }: { personId: string }) {
  const { data, isLoading, error } = usePersonEmails(personId, true);

  return (
    <div className="space-y-1.5">
      <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <Mail className="h-3.5 w-3.5" />
        Recent email
      </p>

      {isLoading ? (
        <Hint>Loading email…</Hint>
      ) : error ? (
        <Hint>Couldn&apos;t load email — {error.message}</Hint>
      ) : data?.status === "not_connected" ? (
        <ReconnectHint label="Connect Google to see recent email with this person." />
      ) : data?.status === "needs_scope" ? (
        <ReconnectHint label="Reconnect Google to grant Gmail access." />
      ) : data?.status === "no_emails" ? (
        <Hint>Add an email address to see recent threads.</Hint>
      ) : data && data.threads.length === 0 ? (
        <Hint>No recent email with this person.</Hint>
      ) : (
        <div className="space-y-1.5">
          {data?.threads.map((thread) => (
            <ThreadRow key={thread.threadId} thread={thread} />
          ))}
        </div>
      )}
    </div>
  );
}
