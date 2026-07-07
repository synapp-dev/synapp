import { Compass } from "lucide-react";
import { ComingSoon } from "@/components/coming-soon";

export default function WorkDirectionPage() {
  return (
    <ComingSoon
      title="Direction"
      description="Where your career is actually heading: mission, strategy, and the bets you are making this year."
      icon={Compass}
      bullets={["North star", "Quarterly bets", "Strategy notes"]}
    />
  );
}
