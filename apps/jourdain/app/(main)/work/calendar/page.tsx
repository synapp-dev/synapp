"use client";

import { CalendarDays } from "lucide-react";
import { ComingSoon } from "@/components/coming-soon";

export default function WorkCalendarPage() {
  return (
    <ComingSoon
      title="Calendar"
      description="A work schedule built around deep work, with meetings fitted in around it rather than the reverse."
      icon={CalendarDays}
      bullets={["Deep work blocks", "Meeting load", "Week shaping"]}
    />
  );
}
