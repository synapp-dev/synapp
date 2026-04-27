import { z } from "zod";
import { cultureRatingInputMetricsSchema } from "./culture-rating-metrics";

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD");

export const cultureBenchmarkBodySchema = z.object({
  periodStart: isoDate,
  periodEnd: isoDate,
  metrics: cultureRatingInputMetricsSchema,
  sourceNotes: z.string().nullable().optional(),
});

export const cultureComparativeBodySchema = z.object({
  periodStart: isoDate,
  periodEnd: isoDate,
  metrics: cultureRatingInputMetricsSchema,
});
