"use client";

import { CalendarDays } from "lucide-react";
import { ComingSoon } from "@/components/coming-soon";

export default function SocialEventsPage() {
  return (
    <ComingSoon
      title="Events"
      description="Gatherings worth showing up for: what is coming up, who is going, and what you are bringing."
      icon={CalendarDays}
      bullets={["Upcoming events", "RSVPs", "Planning notes"]}
    />
  );
}
