import { TrendingUp } from "lucide-react";
import { ComingSoon } from "@/components/coming-soon";

export default function FinanceInvestmentsPage() {
  return (
    <ComingSoon
      title="Investments"
      description="Your whole portfolio in one place: holdings, performance, and allocation over time."
      icon={TrendingUp}
      bullets={["Holdings", "Performance", "Allocation"]}
    />
  );
}
