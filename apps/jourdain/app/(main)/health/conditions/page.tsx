import { Stethoscope } from "lucide-react";
import { ComingSoon } from "@/components/coming-soon";

export default function HealthConditionsPage() {
  return (
    <ComingSoon
      title="Conditions"
      description="Ongoing conditions tracked over time: symptoms, flare-ups, and what actually helps."
      icon={Stethoscope}
      bullets={["Condition timeline", "Symptom log", "Treatment notes"]}
    />
  );
}
