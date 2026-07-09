"use client";

import { PiggyBank } from "lucide-react";
import { ComingSoon } from "@/components/coming-soon";

export default function FinanceSavingsPage() {
  return (
    <ComingSoon
      title="Savings"
      description="Savings with a purpose: named buckets, target dates, and progress you can watch compound."
      icon={PiggyBank}
      bullets={["Savings buckets", "Target dates", "Progress tracking"]}
    />
  );
}
