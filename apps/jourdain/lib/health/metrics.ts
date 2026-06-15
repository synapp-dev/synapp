// Display metadata for the Apple Health metrics we surface, keyed by the raw
// metric name from the export. Pages reference these names to fetch the series
// they need and to label values consistently.

export type MetricMeta = {
  /** Raw metric name as it appears in the export / DB. */
  name: string;
  /** Human label. */
  label: string;
  /** Short unit suffix for display (may differ from the raw export unit). */
  unit: string;
  /** Decimal places for displayed values. */
  precision: number;
};

export const METRICS = {
  // Fitness / activity
  step_count: { name: "step_count", label: "Steps", unit: "", precision: 0 },
  walking_running_distance: {
    name: "walking_running_distance",
    label: "Walking + Running Distance",
    unit: "km",
    precision: 2,
  },
  flights_climbed: {
    name: "flights_climbed",
    label: "Flights Climbed",
    unit: "",
    precision: 0,
  },
  active_energy: {
    name: "active_energy",
    label: "Active Energy",
    unit: "kJ",
    precision: 0,
  },
  basal_energy_burned: {
    name: "basal_energy_burned",
    label: "Resting Energy",
    unit: "kJ",
    precision: 0,
  },
  apple_exercise_time: {
    name: "apple_exercise_time",
    label: "Exercise Time",
    unit: "min",
    precision: 0,
  },
  apple_stand_time: {
    name: "apple_stand_time",
    label: "Stand Time",
    unit: "min",
    precision: 0,
  },
  apple_stand_hour: {
    name: "apple_stand_hour",
    label: "Stand Hours",
    unit: "hr",
    precision: 0,
  },
  walking_speed: {
    name: "walking_speed",
    label: "Walking Speed",
    unit: "km/h",
    precision: 1,
  },
  walking_step_length: {
    name: "walking_step_length",
    label: "Step Length",
    unit: "cm",
    precision: 0,
  },
  vo2_max: { name: "vo2_max", label: "VO₂ Max", unit: "ml/kg·min", precision: 1 },

  // Cardiovascular
  heart_rate: {
    name: "heart_rate",
    label: "Heart Rate",
    unit: "bpm",
    precision: 0,
  },
  resting_heart_rate: {
    name: "resting_heart_rate",
    label: "Resting Heart Rate",
    unit: "bpm",
    precision: 0,
  },
  walking_heart_rate_average: {
    name: "walking_heart_rate_average",
    label: "Walking Heart Rate",
    unit: "bpm",
    precision: 0,
  },
  heart_rate_variability: {
    name: "heart_rate_variability",
    label: "Heart Rate Variability",
    unit: "ms",
    precision: 0,
  },
  blood_oxygen_saturation: {
    name: "blood_oxygen_saturation",
    label: "Blood Oxygen",
    unit: "%",
    precision: 1,
  },

  // Respiratory
  respiratory_rate: {
    name: "respiratory_rate",
    label: "Respiratory Rate",
    unit: "br/min",
    precision: 1,
  },
  breathing_disturbances: {
    name: "breathing_disturbances",
    label: "Breathing Disturbances",
    unit: "",
    precision: 1,
  },

  // Temperature
  apple_sleeping_wrist_temperature: {
    name: "apple_sleeping_wrist_temperature",
    label: "Wrist Temperature",
    unit: "°C",
    precision: 2,
  },
} as const satisfies Record<string, MetricMeta>;

export type MetricKey = keyof typeof METRICS;

/** Format a value for display using a metric's unit + precision. */
export function formatMetric(
  value: number | null | undefined,
  meta: MetricMeta
): string {
  if (value == null) return "—";
  const n =
    meta.precision === 0
      ? Math.round(value).toLocaleString()
      : value.toFixed(meta.precision);
  return meta.unit ? `${n} ${meta.unit}` : n;
}
