import { MessagesSquare } from "lucide-react";

import { MessagesInbox } from "@/components/organisms/messages-inbox";

export default function MessagesPage() {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden">
      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden md:gap-0">
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden md:hidden">
          <MessagesInbox />
        </div>

        <div className="text-muted-foreground hidden min-h-0 flex-1 flex-col items-center justify-center gap-2 px-6 py-8 text-center text-sm md:flex">
          <div className="mb-6 max-w-sm text-left">
            <div className="flex items-center gap-2">
              <MessagesSquare
                className="text-muted-foreground size-7 shrink-0"
                aria-hidden
              />
              <h1 className="text-foreground text-2xl font-semibold tracking-tight">
                Messages
              </h1>
            </div>
          </div>
          <p className="text-foreground font-medium">Select a conversation</p>
          <p>Choose a chat from the list to read and send messages.</p>
        </div>
      </div>
    </div>
  );
}
