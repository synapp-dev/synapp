import { z } from "zod";

import {
  APP_NAVIGATION_DESTINATION_KEYS,
  type AppNavigationDestinationKey,
} from "./app-navigation-catalog";

const destinationKeyEnum = z.enum(APP_NAVIGATION_DESTINATION_KEYS);

/** Matches slugify output used for organisations and venues (see `server/onboarding/slug.ts`). */
const venueOrOrgSlugSchema = z
  .string()
  .min(1)
  .max(48)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Invalid slug format");

export const MAX_APP_NAVIGATION_DESTINATION_KEYS = 8;

/** Presets the agent may deep-link (custom ranges go through periodFrom/periodTo instead). */
export const AGENT_PERIOD_PRESETS = [
  "today",
  "yesterday",
  "this-week",
  "last-week",
  "this-month",
  "last-month",
] as const;

const isoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD");

export const suggestAppNavigationInputSchema = z
  .object({
    organisationSlug: venueOrOrgSlugSchema,
    venueSlug: venueOrOrgSlugSchema,
    destinationKeys: z
      .array(z.enum(APP_NAVIGATION_DESTINATION_KEYS))
      .min(1)
      .max(MAX_APP_NAVIGATION_DESTINATION_KEYS),
    periodPreset: z.enum(AGENT_PERIOD_PRESETS).optional(),
    periodFrom: isoDateSchema.optional(),
    periodTo: isoDateSchema.optional(),
  })
  .refine(
    (input) => Boolean(input.periodFrom) === Boolean(input.periodTo),
    { message: "periodFrom and periodTo must be provided together" },
  )
  .refine(
    (input) =>
      !input.periodFrom || !input.periodTo || input.periodFrom <= input.periodTo,
    { message: "periodFrom must not be after periodTo" },
  );

export type AppNavigationPeriod =
  | { kind: "preset"; preset: (typeof AGENT_PERIOD_PRESETS)[number] }
  | { kind: "custom"; from: string; to: string };

/** Custom from/to wins over a preset when the model sends both. */
export function periodFromNavigationInput(input: {
  periodPreset?: (typeof AGENT_PERIOD_PRESETS)[number];
  periodFrom?: string;
  periodTo?: string;
}): AppNavigationPeriod | undefined {
  if (input.periodFrom && input.periodTo) {
    return { kind: "custom", from: input.periodFrom, to: input.periodTo };
  }
  if (input.periodPreset) {
    return { kind: "preset", preset: input.periodPreset };
  }
  return undefined;
}

export type SuggestAppNavigationInput = z.infer<
  typeof suggestAppNavigationInputSchema
>;

/** Query keys the insights pages read (see `entities/insights/lib/period.ts`). */
const ALLOWED_NAV_QUERY_KEYS = new Set(["preset", "from", "to"]);
const SAFE_NAV_QUERY_VALUE = /^[a-z0-9-]+$/;

export function isSafeAppNavigationHref(href: string): boolean {
  if (!href.startsWith("/")) return false;
  const queryIndex = href.indexOf("?");
  const path = queryIndex === -1 ? href : href.slice(0, queryIndex);
  const query = queryIndex === -1 ? null : href.slice(queryIndex + 1);
  if (path.includes("//") || path.includes(":") || /[\s#?]/.test(path)) {
    return false;
  }
  if (query === null) return true;
  if (query.length === 0 || /[\s#?]/.test(query)) return false;
  const params = new URLSearchParams(query);
  for (const [key, value] of params) {
    if (!ALLOWED_NAV_QUERY_KEYS.has(key)) return false;
    if (!SAFE_NAV_QUERY_VALUE.test(value)) return false;
  }
  return true;
}

export const appNavigationCardSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  href: z
    .string()
    .min(3)
    .refine(isSafeAppNavigationHref, {
      message:
        "href must be a safe internal path (optional insights period query only)",
    }),
  destinationKey: destinationKeyEnum,
  organisationName: z.string().min(1),
  venueName: z.string().min(1),
});

export const suggestAppNavigationSuccessSchema = z.object({
  cards: z.array(appNavigationCardSchema),
});

export const suggestAppNavigationErrorSchema = z.object({
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

export const suggestAppNavigationOutputSchema = z.union([
  suggestAppNavigationSuccessSchema,
  suggestAppNavigationErrorSchema,
]);

export type SuggestAppNavigationOutput = z.infer<
  typeof suggestAppNavigationOutputSchema
>;

export type AppNavigationCard = z.infer<typeof appNavigationCardSchema>;

export function isSuggestAppNavigationError(
  output: unknown
): output is z.infer<typeof suggestAppNavigationErrorSchema> {
  return suggestAppNavigationErrorSchema.safeParse(output).success;
}

export function isSuggestAppNavigationSuccessPayload(
  output: unknown
): output is z.infer<typeof suggestAppNavigationSuccessSchema> {
  return suggestAppNavigationSuccessSchema.safeParse(output).success;
}

export function dedupeDestinationKeys(
  keys: AppNavigationDestinationKey[]
): AppNavigationDestinationKey[] {
  const seen = new Set<AppNavigationDestinationKey>();
  const out: AppNavigationDestinationKey[] = [];
  for (const key of keys) {
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(key);
  }
  return out;
}
