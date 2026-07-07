import { Sunrise } from "lucide-react";
import { ComingSoon } from "@/components/coming-soon";

export default function HealthRecoveryPage() {
  return (
    <ComingSoon
      title="Recovery"
      description="How well you are bouncing back: rest, readiness, and strain balanced against training."
      icon={Sunrise}
      bullets={["Readiness signal", "Rest planning", "Strain balance"]}
    />
  );
}
