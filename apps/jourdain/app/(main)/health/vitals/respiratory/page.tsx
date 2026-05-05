import { VitalsMetricCards } from "@/components/organisms/vitals-metric-cards";

const METRICS = ["Respiratory Rate", "Blood Oxygen", "VO2 Max"] as const;

export default function VitalsRespiratoryPage() {
  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-lg font-medium tracking-tight">Respiratory</h2>
      <VitalsMetricCards metrics={METRICS} />
    </div>
  );
}
