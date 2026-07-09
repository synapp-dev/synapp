"use client";

import { Building2 } from "lucide-react";
import { ComingSoon } from "@/components/coming-soon";

export default function WorkCrmPage() {
  return (
    <ComingSoon
      title="CRM"
      description="Professional relationships with context: who you know, what matters to them, and when to reconnect."
      icon={Building2}
      bullets={["Contact profiles", "Interaction history", "Reconnect nudges"]}
    />
  );
}
