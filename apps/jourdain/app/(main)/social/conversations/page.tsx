"use client";

import { MessagesSquare } from "lucide-react";
import { ComingSoon } from "@/components/coming-soon";

export default function SocialConversationsPage() {
  return (
    <ComingSoon
      title="Conversations"
      description="The threads that matter, remembered: pick up every conversation exactly where it left off."
      icon={MessagesSquare}
      bullets={["Conversation notes", "Topics to raise", "Follow-through"]}
    />
  );
}
