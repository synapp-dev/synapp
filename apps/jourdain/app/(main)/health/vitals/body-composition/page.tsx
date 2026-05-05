import { VitalsMetricCards } from "@/components/organisms/vitals-metric-cards";

const METRICS = ["Weight", "Body Fat %", "Waist"] as const;

export default function VitalsBodyCompositionPage() {
  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-lg font-medium tracking-tight">Body Composition</h2>
      <VitalsMetricCards metrics={METRICS} />
    </div>
  );
}
