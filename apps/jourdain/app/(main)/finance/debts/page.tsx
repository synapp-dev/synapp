"use client";

import { TrendingDown } from "lucide-react";
import { ComingSoon } from "@/components/coming-soon";

export default function FinanceDebtsPage() {
  return (
    <ComingSoon
      title="Debts"
      description="Every debt with its rate, its payoff plan, and the date you will be free of it."
      icon={TrendingDown}
      bullets={["Payoff plans", "Interest tracking", "Debt-free date"]}
    />
  );
}
