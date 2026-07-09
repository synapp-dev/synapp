"use client";

import { MessageSquare } from "lucide-react";
import { ComingSoon } from "@/components/coming-soon";

export default function WorkCommunicationPage() {
  return (
    <ComingSoon
      title="Communication"
      description="One queue for everything waiting on a reply, so nothing important sits unanswered."
      icon={MessageSquare}
      bullets={["Unified inbox", "Waiting on", "Reply cadence"]}
    />
  );
}
