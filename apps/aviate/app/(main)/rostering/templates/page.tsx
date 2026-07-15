import type { Metadata } from "next";
import { BadgeCheck } from "lucide-react";

import { ComingSoon } from "@/components/molecules/coming-soon";

export const metadata: Metadata = { title: "Shift Templates" };

export default function ShiftTemplatesPage() {
  return (
    <ComingSoon
      icon={BadgeCheck}
      title="Shift templates"
      description="Manage recurring shift patterns per station and department. Templates already pre-fill the roster planner; a dedicated management page is coming soon."
    />
  );
}
