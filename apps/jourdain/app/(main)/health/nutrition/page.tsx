import { Apple } from "lucide-react";
import { ComingSoon } from "@/components/coming-soon";

export default function HealthNutritionPage() {
  return (
    <ComingSoon
      title="Nutrition"
      description="What you eat without the chore of logging it: meals, macros, and how food changes how you feel."
      icon={Apple}
      bullets={["Meal log", "Macro trends", "Energy correlations"]}
    />
  );
}
