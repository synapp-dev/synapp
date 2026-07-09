"use client";

import { Gauge } from "lucide-react";
import { ComingSoon } from "@/components/coming-soon";

export default function WorkPerformancePage() {
  return (
    <ComingSoon
      title="Performance"
      description="An honest signal on how you are performing: output, feedback, and growth over time."
      icon={Gauge}
      bullets={["Output trends", "Feedback log", "Growth targets"]}
    />
  );
}
