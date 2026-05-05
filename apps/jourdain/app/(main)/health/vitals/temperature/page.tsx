import { VitalsMetricCards } from "@/components/organisms/vitals-metric-cards";

const METRICS = ["Body Temperature", "Wrist Temperature"] as const;

export default function VitalsTemperaturePage() {
  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-lg font-medium tracking-tight">Temperature</h2>
      <VitalsMetricCards metrics={METRICS} />
    </div>
  );
}
