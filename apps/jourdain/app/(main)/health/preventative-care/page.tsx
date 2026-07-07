import { ShieldPlus } from "lucide-react";
import { ComingSoon } from "@/components/coming-soon";

export default function HealthPreventativeCarePage() {
  return (
    <ComingSoon
      title="Preventative Care"
      description="Screenings, checkups, and vaccinations scheduled long before they become urgent."
      icon={ShieldPlus}
      bullets={["Screening schedule", "Vaccination record", "Due date reminders"]}
    />
  );
}
