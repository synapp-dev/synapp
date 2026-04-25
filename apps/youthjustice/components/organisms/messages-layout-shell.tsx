"use client";

import { MessagesInbox } from "@/components/organisms/messages-inbox";

export function MessagesLayoutShell({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden md:min-h-[min(72svh,42rem)]">
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden md:flex-row">
        <aside className="hidden h-full min-h-0 w-72 shrink-0 flex-col overflow-hidden border-r border-border bg-muted/20 md:flex">
          <MessagesInbox className="min-h-0 flex-1" />
        </aside>
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          {children}
        </div>
      </div>
    </div>
  );
}
