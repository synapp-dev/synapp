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

export const suggestAppNavigationInputSchema = z.object({
  organisationSlug: venueOrOrgSlugSchema,
  venueSlug: venueOrOrgSlugSchema,
  destinationKeys: z
    .array(z.enum(APP_NAVIGATION_DESTINATION_KEYS))
    .min(1)
    .max(MAX_APP_NAVIGATION_DESTINATION_KEYS),
});

export type SuggestAppNavigationInput = z.infer<
  typeof suggestAppNavigationInputSchema
>;

export const appNavigationCardSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  href: z
    .string()
    .min(3)
    .refine((href) => href.startsWith("/"), { message: "href must be a root-relative path" })
    .refine(
      (href) =>
        !href.includes("//") &&
        !href.includes(":") &&
        !/[\s#?]/.test(href),
      { message: "href must be a safe internal path" }
    ),
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
