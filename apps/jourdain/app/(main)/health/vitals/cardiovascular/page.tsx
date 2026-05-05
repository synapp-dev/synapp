import { VitalsMetricCards } from "@/components/organisms/vitals-metric-cards";

const METRICS = [
  "Resting Heart Rate",
  "Active Heart Rate",
  "Heart Rate Variability",
  "Blood Pressure",
] as const;

export default function VitalsCardiovascularPage() {
  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-lg font-medium tracking-tight">Cardiovascular</h2>
      <VitalsMetricCards metrics={METRICS} />
    </div>
  );
}
