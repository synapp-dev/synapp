import { z } from "zod";

/** Matches slugify output used for organisations and venues (see `server/onboarding/slug.ts`). */
const slugSchema = z
  .string()
  .min(1)
  .max(48)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Invalid slug format");

const isoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD");

export const getSalesSummaryInputSchema = z
  .object({
    organisationSlug: slugSchema,
    venueSlug: slugSchema,
    from: isoDateSchema,
    to: isoDateSchema,
  })
  .refine((input) => input.from <= input.to, {
    message: "from must not be after to",
  });

export type GetSalesSummaryInput = z.infer<typeof getSalesSummaryInputSchema>;

const salesSummaryTopItemSchema = z.object({
  label: z.string(),
  quantity: z.number(),
  revenueCents: z.number(),
  revenueSharePct: z.number(),
  mapped: z.boolean(),
});

export const salesSummarySchema = z.object({
  organisationSlug: z.string(),
  venueSlug: z.string(),
  organisationName: z.string(),
  venueName: z.string(),
  from: z.string(),
  to: z.string(),
  timezone: z.string(),
  dataSource: z.enum(["square", "demo"]),
  totals: z.object({
    revenueCents: z.number(),
    orders: z.number(),
    avgCheckCents: z.number(),
    refundCount: z.number(),
    refundCents: z.number(),
    voidCount: z.number(),
  }),
  topItems: z.array(salesSummaryTopItemSchema),
  otherItemsCount: z.number(),
  otherRevenueCents: z.number(),
  totalMixItems: z.number(),
});

export const getSalesSummarySuccessSchema = z.object({
  summary: salesSummarySchema,
  /** Root-relative URL of the downloadable PDF for the same venue + range. */
  reportUrl: z.string().startsWith("/"),
});

export const getSalesSummaryErrorSchema = z.object({
  error: z.object({
    code: z.enum([
      "ACCESS_DENIED",
      "VENUE_NOT_FOUND",
      "INVALID_INPUT",
      "INTERNAL_ERROR",
    ]),
    message: z.string().min(1),
  }),
});

export type GetSalesSummaryOutput =
  | z.infer<typeof getSalesSummarySuccessSchema>
  | z.infer<typeof getSalesSummaryErrorSchema>;

export function isGetSalesSummaryError(
  output: unknown,
): output is z.infer<typeof getSalesSummaryErrorSchema> {
  return getSalesSummaryErrorSchema.safeParse(output).success;
}

export function isGetSalesSummarySuccess(
  output: unknown,
): output is z.infer<typeof getSalesSummarySuccessSchema> {
  return getSalesSummarySuccessSchema.safeParse(output).success;
}

export function buildSalesMixReportUrl(input: {
  organisationSlug: string;
  venueSlug: string;
  from: string;
  to: string;
}): string {
  const qs = new URLSearchParams({ from: input.from, to: input.to });
  return `/api/organisations/${encodeURIComponent(input.organisationSlug)}/venues/${encodeURIComponent(input.venueSlug)}/reports/sales-mix?${qs.toString()}`;
}
