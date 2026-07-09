"use client";

import { Shield } from "lucide-react";
import { ComingSoon } from "@/components/coming-soon";

export default function FinanceInsurancePage() {
  return (
    <ComingSoon
      title="Insurance"
      description="Every policy in one place: what is covered, what it costs, and when to renegotiate."
      icon={Shield}
      bullets={["Policy register", "Renewal dates", "Coverage gaps"]}
    />
  );
}
