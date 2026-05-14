import { z } from "zod";

const calloutSlug = z
  .string()
  .min(1)
  .max(128)
  .regex(
    /^[a-z0-9]+(?:[_-][a-z0-9]+)*$/,
    "Slug: lowercase letters, numbers, underscores, hyphens only.",
  );

const coordPair = z.tuple([
  z.number().finite().gte(0).lte(1),
  z.number().finite().gte(0).lte(1),
]);

export const polygonRingSchema = z
  .array(coordPair)
  .min(3, "Polygon needs at least three points.")
  .max(256, "Too many vertices (max 256).");

export const adminMapCalloutCreateSchema = z.object({
  mapId: z.string().uuid(),
  mapSlug: z.string().min(1).max(128),
  slug: calloutSlug,
  label: z.string().min(1).max(4000),
  priority: z.number().int().min(-10000).max(10000),
  polygonRing: polygonRingSchema,
});

export const adminMapCalloutUpdateSchema = z.object({
  id: z.string().uuid(),
  mapSlug: z.string().min(1).max(128),
  slug: calloutSlug,
  label: z.string().min(1).max(4000),
  priority: z.number().int().min(-10000).max(10000),
  polygonRing: polygonRingSchema,
});

export const adminMapCalloutDeleteSchema = z.object({
  id: z.string().uuid(),
  mapSlug: z.string().min(1).max(128),
});

export type AdminMapCalloutCreateInput = z.infer<typeof adminMapCalloutCreateSchema>;
export type AdminMapCalloutUpdateInput = z.infer<typeof adminMapCalloutUpdateSchema>;
