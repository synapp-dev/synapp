import { BodyWeightLog } from "@/components/health/body-weight-log";

export default function VitalsBodyCompositionPage() {
  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-lg font-medium tracking-tight">Body Composition</h2>
      <BodyWeightLog />
    </div>
  );
}
