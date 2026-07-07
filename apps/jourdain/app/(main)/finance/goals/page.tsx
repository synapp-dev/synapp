import { Target } from "lucide-react";
import { ComingSoon } from "@/components/coming-soon";

export default function FinanceGoalsPage() {
  return (
    <ComingSoon
      title="Goals"
      description="Financial goals with real numbers behind them: the target, the timeline, and the monthly figure that gets you there."
      icon={Target}
      bullets={["Goal targets", "Timelines", "Monthly contributions"]}
    />
  );
}
