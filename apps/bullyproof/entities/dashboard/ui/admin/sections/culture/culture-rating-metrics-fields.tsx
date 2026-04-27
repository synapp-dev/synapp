"use client";

import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import type { CultureRatingInputMetrics } from "@/entities/culture-rating/api/culture-ratings-admin-api";

const fields: { key: keyof CultureRatingInputMetrics; label: string }[] = [
  { key: "schoolDaysInPeriod", label: "School days in period" },
  { key: "attendanceFteStudentDays", label: "Attendance (FTE student-days attended)" },
  { key: "absencesFteStudentDays", label: "Absences (FTE student-days absent)" },
  { key: "minorBehaviourIncidents", label: "Minor behaviour incidents" },
  { key: "majorBehaviourIncidents", label: "Major behaviour incidents" },
  { key: "shortSuspensionsCount", label: "Short suspensions (1–10 days)" },
  { key: "longSuspensionsCount", label: "Long suspensions (11–20 days)" },
  { key: "exclusionsCount", label: "Exclusions" },
];

export function CultureRatingMetricsFields({
  value,
  onChange,
  disabled,
}: {
  value: CultureRatingInputMetrics;
  onChange: (next: CultureRatingInputMetrics) => void;
  disabled?: boolean;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {fields.map(({ key, label }) => (
        <div key={key} className="space-y-2">
          <Label htmlFor={`culture-m-${key}`}>{label}</Label>
          <Input
            id={`culture-m-${key}`}
            type="number"
            min={0}
            step="any"
            disabled={disabled}
            value={Number.isFinite(value[key]) ? value[key] : 0}
            onChange={(e) => {
              const n = parseFloat(e.target.value);
              onChange({
                ...value,
                [key]: Number.isFinite(n) ? Math.max(0, n) : 0,
              });
            }}
          />
        </div>
      ))}
    </div>
  );
}

export const emptyCultureMetrics = (): CultureRatingInputMetrics => ({
  schoolDaysInPeriod: 0,
  attendanceFteStudentDays: 0,
  absencesFteStudentDays: 0,
  minorBehaviourIncidents: 0,
  majorBehaviourIncidents: 0,
  shortSuspensionsCount: 0,
  longSuspensionsCount: 0,
  exclusionsCount: 0,
});
