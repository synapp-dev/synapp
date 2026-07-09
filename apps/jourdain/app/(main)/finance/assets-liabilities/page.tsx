"use client";

import { Scale } from "lucide-react";
import { ComingSoon } from "@/components/coming-soon";

export default function FinanceAssetsLiabilitiesPage() {
  return (
    <ComingSoon
      title="Assets & Liabilities"
      description="Everything you own against everything you owe: a net worth that is always current."
      icon={Scale}
      bullets={["Asset register", "Liability register", "Net worth trend"]}
    />
  );
}
