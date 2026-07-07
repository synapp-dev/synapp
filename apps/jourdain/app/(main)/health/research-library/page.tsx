import { FlaskConical } from "lucide-react";
import { ComingSoon } from "@/components/coming-soon";

export default function HealthResearchLibraryPage() {
  return (
    <ComingSoon
      title="Research Library"
      description="Health research worth trusting, summarised and linked to the protocols you actually run."
      icon={FlaskConical}
      bullets={["Saved studies", "Plain summaries", "Protocol links"]}
    />
  );
}
