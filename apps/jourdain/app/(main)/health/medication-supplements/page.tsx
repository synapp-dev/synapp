import { Pill } from "lucide-react";
import { ComingSoon } from "@/components/coming-soon";

export default function HealthMedicationSupplementsPage() {
  return (
    <ComingSoon
      title="Medication & Supplements"
      description="Every medication and supplement with doses, schedules, and adherence in a single view."
      icon={Pill}
      bullets={["Dose schedule", "Adherence tracking", "Refill reminders"]}
    />
  );
}
