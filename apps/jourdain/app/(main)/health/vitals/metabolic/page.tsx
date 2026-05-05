import { VitalsMetricCards } from "@/components/organisms/vitals-metric-cards";

const METRICS = ["Blood Glucose", "Calories Burned", "Basal Metabolic Rate"] as const;

export default function VitalsMetabolicPage() {
  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-lg font-medium tracking-tight">Metabolic</h2>
      <VitalsMetricCards metrics={METRICS} />
    </div>
  );
}
